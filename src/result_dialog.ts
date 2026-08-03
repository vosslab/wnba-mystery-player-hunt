import { formatShareText, type ShareFormatOptions } from "./share";
import { scoreForWin } from "./score";
import type { GameMode } from "./types/game";
import { CLUE_DEFINITIONS, type DailyPuzzleState, type FeedbackMatch } from "./types/puzzle";

export type ClipboardWriter = {
  readonly writeText: (text: string) => Promise<void>;
};

export type ResultDialogInput = {
  readonly puzzle: DailyPuzzleState;
  /** The target name is displayed only inside the completed-round dialog. */
  readonly answerName: string;
  readonly guessLimit: number;
  readonly mode: GameMode;
  readonly currentStreak?: number;
  readonly onNewPracticePlayer?: () => void;
  readonly shareOptions?: ShareFormatOptions;
};

export type ShareAttemptResult =
  | { readonly kind: "copied"; readonly text: string }
  | { readonly kind: "manual-copy"; readonly text: string };

export type ResultDialogController = {
  readonly open: (input: ResultDialogInput) => void;
  readonly close: () => void;
  readonly share: () => Promise<ShareAttemptResult>;
  readonly isOpen: () => boolean;
};

export type ResultDialogOptions = {
  readonly clipboardWriter?: ClipboardWriter;
};

/**
 * Renders a completed round and offers a spoiler-safe share summary. Completion itself is owned
 * by game_state; this controller only reads the supplied, already-completed state.
 */
export function renderResultDialog(
  root: ParentNode = document,
  options: ResultDialogOptions = {},
): ResultDialogController {
  const dialog = requireDialog(root);
  let previouslyFocused: HTMLElement | null = null;
  let shareText = "";
  let shareStatus: HTMLElement | null = null;
  let manualCopyField: HTMLTextAreaElement | null = null;
  let manualCopyHost: HTMLElement | null = null;

  dialog.addEventListener("close", restorePreviousFocus);

  function open(input: ResultDialogInput): void {
    assertCompletedPuzzle(input.puzzle);
    previouslyFocused = focusedElement();
    shareText = formatShareText(input.puzzle, input.guessLimit, {
      ...input.shareOptions,
      currentStreak: input.mode === "daily" ? input.currentStreak : undefined,
    });
    shareStatus = null;
    manualCopyField = null;
    manualCopyHost = null;

    const heading = document.createElement("h2");
    heading.id = "result-title";
    heading.textContent = resultHeading(input.puzzle, input.mode);
    const titleRow = document.createElement("div");
    titleRow.className = "dialog-title-row";
    titleRow.append(heading, createCloseForm());

    const summary = document.createElement("p");
    summary.className = "result-summary";
    summary.textContent = outcomeSummary(input.puzzle, input.guessLimit);

    const answer = createAnswerCard(input.answerName, input.mode);
    const metrics = createResultMetrics(input);

    dialog.setAttribute("aria-labelledby", heading.id);
    if (input.mode === "daily") {
      const status = createShareStatus();
      const shareButton = createShareButton();
      const sharePanel = createSharePanel(input.puzzle, status, shareButton, input.currentStreak);
      manualCopyHost = sharePanel;
      dialog.replaceChildren(titleRow, summary, answer, metrics, sharePanel);
      showDialogWithFocus(shareButton);
    } else {
      const practiceButton = document.createElement("button");
      practiceButton.type = "button";
      practiceButton.className = "dialog-primary-button";
      practiceButton.textContent = "Practice another player";
      practiceButton.addEventListener("click", function startAnotherPracticeRound(): void {
        close();
        input.onNewPracticePlayer?.();
      });
      dialog.replaceChildren(titleRow, summary, answer, metrics, practiceButton);
      showDialogWithFocus(practiceButton);
    }

    function showDialogWithFocus(primaryButton: HTMLButtonElement): void {
      if (!dialog.open) {
        dialog.showModal();
      }
      primaryButton.focus();
    }
  }

  function createShareStatus(): HTMLElement {
    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.textContent = "Share your spoiler-free result when you're ready.";
    shareStatus = status;
    return status;
  }

  function createShareButton(): HTMLButtonElement {
    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.className = "dialog-primary-button";
    shareButton.textContent = "Share result";
    shareButton.addEventListener("click", () => {
      void share();
    });
    return shareButton;
  }

  function close(): void {
    if (dialog.open) {
      dialog.close();
    }
  }

  async function share(): Promise<ShareAttemptResult> {
    if (shareText === "") {
      throw new Error("Open a completed result before sharing it.");
    }

    const clipboardWriter = options.clipboardWriter ?? browserClipboardWriter();
    if (clipboardWriter !== null) {
      try {
        await clipboardWriter.writeText(shareText);
        updateShareStatus("Result copied. You can paste it wherever you like.");
        return { kind: "copied", text: shareText };
      } catch {
        // A manual copy field is an intentional recovery path for denied clipboard access.
      }
    }

    showManualCopyField();
    updateShareStatus("Copy the selected result text, then paste it wherever you like.");
    return { kind: "manual-copy", text: shareText };
  }

  function isOpen(): boolean {
    return dialog.open;
  }

  function showManualCopyField(): void {
    if (manualCopyField === null) {
      const field = document.createElement("textarea");
      field.readOnly = true;
      field.rows = 4;
      field.value = shareText;
      field.setAttribute("aria-label", "Spoiler-free result text to copy");
      (manualCopyHost ?? dialog).append(field);
      manualCopyField = field;
    }
    manualCopyField.focus();
    manualCopyField.select();
  }

  function updateShareStatus(message: string): void {
    if (shareStatus !== null) {
      shareStatus.textContent = message;
    }
  }

  function restorePreviousFocus(): void {
    const focusTarget = previouslyFocused;
    previouslyFocused = null;
    if (focusTarget !== null && focusTarget.isConnected) {
      focusTarget.focus();
    }
  }

  return { open, close, share, isOpen };
}

function createCloseForm(): HTMLFormElement {
  const form = document.createElement("form");
  form.method = "dialog";
  const button = document.createElement("button");
  button.type = "submit";
  button.className = "dialog-close-button";
  button.textContent = "Close";
  form.append(button);
  return form;
}

function createAnswerCard(answerName: string, mode: GameMode): HTMLElement {
  const card = document.createElement("section");
  card.className = "result-answer-card";
  const label = document.createElement("span");
  label.className = "result-eyebrow";
  label.textContent = mode === "daily" ? "Today's mystery player" : "Practice player";
  const answer = document.createElement("strong");
  answer.textContent = answerName;
  card.append(label, answer);
  return card;
}

function createResultMetrics(input: ResultDialogInput): HTMLDListElement {
  const metrics = document.createElement("dl");
  metrics.className = "result-metrics";
  const attempts = input.puzzle.guesses.length;
  const points = input.puzzle.status === "won" ? scoreForWin(attempts) : 0;
  metrics.append(createMetric(String(points), "Points"));
  metrics.append(createMetric(`${attempts}/${input.guessLimit}`, "Guesses"));
  if (input.mode === "daily") {
    metrics.append(createMetric(String(input.currentStreak ?? 0), "Current streak"));
  }
  return metrics;
}

function createMetric(value: string, label: string): HTMLDivElement {
  const metric = document.createElement("div");
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  metric.append(description, term);
  return metric;
}

function createSharePanel(
  puzzle: DailyPuzzleState,
  status: HTMLElement,
  shareButton: HTMLButtonElement,
  currentStreak: number | undefined,
): HTMLElement {
  const panel = document.createElement("section");
  panel.className = "result-share-panel";
  const text = document.createElement("div");
  const heading = document.createElement("h3");
  heading.textContent = "Share your result";
  const description = document.createElement("p");
  const streak = currentStreak ?? 0;
  description.textContent = `${streak} ${streak === 1 ? "win" : "wins"} in your current streak.`;
  text.append(heading, description, status);
  panel.append(createFeedbackPreview(puzzle), text, shareButton);
  return panel;
}

function createFeedbackPreview(puzzle: DailyPuzzleState): HTMLElement {
  const preview = document.createElement("div");
  preview.className = "result-feedback-preview";
  preview.setAttribute("role", "img");
  preview.setAttribute(
    "aria-label",
    `Share preview with ${puzzle.guesses.length} feedback ${puzzle.guesses.length === 1 ? "row" : "rows"}. Orange is exact, blue is close, and gray is no match.`,
  );

  for (const guess of puzzle.guesses) {
    const row = document.createElement("div");
    row.className = "result-feedback-row";
    row.setAttribute("aria-hidden", "true");
    for (const definition of CLUE_DEFINITIONS) {
      const match = guess.cells.find((cell) => cell.clueId === definition.id)?.match ?? "miss";
      row.append(createFeedbackPreviewCell(match));
    }
    preview.append(row);
  }
  return preview;
}

function createFeedbackPreviewCell(match: FeedbackMatch): HTMLSpanElement {
  const cell = document.createElement("span");
  cell.className = `result-feedback-cell result-feedback-${match}`;
  return cell;
}

function requireDialog(root: ParentNode): HTMLDialogElement {
  const dialog = root.querySelector<HTMLDialogElement>("dialog.result-dialog");
  if (dialog === null) {
    throw new Error("Result dialog is missing from the page.");
  }
  return dialog;
}

function assertCompletedPuzzle(puzzle: DailyPuzzleState): void {
  if (puzzle.status === "active") {
    throw new Error("A result dialog can open only after the round is complete.");
  }
}

function outcomeSummary(puzzle: DailyPuzzleState, guessLimit: number): string {
  const attempts = puzzle.guesses.length;
  if (puzzle.status === "won") {
    const score = scoreForWin(attempts);
    return `Solved in ${attempts} of ${guessLimit} guesses for ${score} points.`;
  }
  return `Used ${attempts} of ${guessLimit} guesses. Score: 0 points.`;
}

function resultHeading(puzzle: DailyPuzzleState, mode: GameMode): string {
  if (mode === "practice") {
    return puzzle.status === "won" ? "Practice solved!" : "Practice complete";
  }
  return puzzle.status === "won" ? "You got it!" : "You didn't solve it.";
}

function focusedElement(): HTMLElement | null {
  const activeElement = document.activeElement;
  return activeElement instanceof HTMLElement ? activeElement : null;
}

function browserClipboardWriter(): ClipboardWriter | null {
  if (typeof navigator === "undefined" || navigator.clipboard === undefined) {
    return null;
  }
  return navigator.clipboard;
}
