import { formatShareText, type ShareFormatOptions } from "./share";
import type { DailyPuzzleState } from "./types/puzzle";

export type ClipboardWriter = {
  readonly writeText: (text: string) => Promise<void>;
};

export type ResultDialogInput = {
  readonly puzzle: DailyPuzzleState;
  /** The target name is displayed only inside the completed-round dialog. */
  readonly answerName: string;
  readonly guessLimit: number;
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

  dialog.addEventListener("close", restorePreviousFocus);

  function open(input: ResultDialogInput): void {
    assertCompletedPuzzle(input.puzzle);
    previouslyFocused = focusedElement();
    shareText = formatShareText(input.puzzle, input.guessLimit, input.shareOptions);
    manualCopyField = null;

    const heading = document.createElement("h2");
    heading.id = "result-title";
    heading.textContent = input.puzzle.status === "won" ? "You got it!" : "You didn't solve it.";

    const summary = document.createElement("p");
    summary.textContent = outcomeSummary(input.puzzle, input.guessLimit);

    const answer = document.createElement("p");
    answer.textContent = `Today's mystery player: ${input.answerName}.`;

    const status = document.createElement("p");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.textContent = "Share your spoiler-free result when you're ready.";
    shareStatus = status;

    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.textContent = "Share result";
    shareButton.addEventListener("click", () => {
      void share();
    });

    const closeForm = document.createElement("form");
    closeForm.method = "dialog";
    const closeButton = document.createElement("button");
    closeButton.type = "submit";
    closeButton.textContent = "Close";
    closeForm.append(closeButton);

    dialog.setAttribute("aria-labelledby", heading.id);
    dialog.replaceChildren(heading, summary, answer, status, shareButton, closeForm);
    if (!dialog.open) {
      dialog.showModal();
    }
    shareButton.focus();
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
      dialog.append(field);
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
    return `Solved in ${attempts} of ${guessLimit} guesses.`;
  }
  return `Used ${attempts} of ${guessLimit} guesses.`;
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
