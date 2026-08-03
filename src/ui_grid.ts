import {
  CLUE_DEFINITIONS,
  type CellFeedback,
  type ClueDefinition,
  type GuessEvaluation,
} from "./types/puzzle";

/** Renders the saved evaluations without needing access to the full player snapshot. */
export function renderGrid(
  container: HTMLElement,
  evaluations: readonly GuessEvaluation[],
  guessLimit: number,
): void {
  container.replaceChildren();

  const table = document.createElement("table");
  table.className = "comparison-table";
  table.dataset.grid = "comparison";

  const caption = document.createElement("caption");
  caption.textContent =
    "Comparison grid with all guess slots. Filled clues announce Exact, Close, or No match.";
  table.append(caption);

  table.append(createHeaderRow());
  table.append(createBody(evaluations, guessLimit));
  container.append(table);
}

function createHeaderRow(): HTMLTableSectionElement {
  const head = document.createElement("thead");
  const row = document.createElement("tr");
  row.append(createHeaderCell("Player", "col"));

  for (const definition of CLUE_DEFINITIONS) {
    row.append(createHeaderCell(definition.label, "col"));
  }

  head.append(row);
  return head;
}

function createBody(
  evaluations: readonly GuessEvaluation[],
  guessLimit: number,
): HTMLTableSectionElement {
  const body = document.createElement("tbody");

  for (const [index, evaluation] of evaluations.entries()) {
    const row = document.createElement("tr");
    row.dataset.guessState = "filled";
    row.dataset.guessNumber = String(index + 1);
    row.append(createHeaderCell(evaluation.guessedDisplayName, "row"));

    for (const definition of CLUE_DEFINITIONS) {
      const feedback = evaluation.cells.find((cell) => cell.clueId === definition.id);
      row.append(createFeedbackCell(definition, feedback));
    }

    body.append(row);
  }

  for (let index = evaluations.length; index < guessLimit; index += 1) {
    body.append(createEmptyGuessRow(index + 1));
  }

  return body;
}

function createEmptyGuessRow(guessNumber: number): HTMLTableRowElement {
  const row = document.createElement("tr");
  row.className = "guess-slot-empty";
  row.dataset.guessState = "empty";
  row.dataset.guessNumber = String(guessNumber);

  const rowHeader = createHeaderCell("", "row");
  const accessibleLabel = document.createElement("span");
  accessibleLabel.className = "visually-hidden";
  accessibleLabel.textContent = `Guess ${guessNumber}, empty`;
  rowHeader.append(accessibleLabel);
  row.append(rowHeader);

  for (const definition of CLUE_DEFINITIONS) {
    const cell = document.createElement("td");
    cell.className = "feedback-cell feedback-empty";
    cell.dataset.clueLabel = definition.label;
    cell.setAttribute("aria-hidden", "true");
    row.append(cell);
  }

  return row;
}

function createHeaderCell(label: string, scope: "col" | "row"): HTMLTableCellElement {
  const cell = document.createElement("th");
  cell.scope = scope;
  cell.textContent = label;
  return cell;
}

function createFeedbackCell(
  definition: ClueDefinition,
  feedback: CellFeedback | undefined,
): HTMLTableCellElement {
  const cell = document.createElement("td");
  const match = feedback?.match ?? "miss";
  const displayValue = formatDisplayValue(feedback);
  cell.className = `feedback-cell feedback-${match}`;
  cell.dataset.feedback = match;
  cell.dataset.clueLabel = definition.label;
  cell.setAttribute("aria-label", formatFeedbackLabel(definition.label, displayValue, match));

  const value = document.createElement("span");
  value.className = "feedback-value";
  value.textContent = displayValue;

  const badge = document.createElement("span");
  badge.className = "feedback-badge";
  badge.setAttribute("aria-hidden", "true");
  badge.textContent = formatMatchLabel(match);

  cell.append(value, badge);
  return cell;
}

function formatDisplayValue(feedback: CellFeedback | undefined): string {
  if (feedback === undefined) {
    return "Not available";
  }
  if (feedback.clueId === "country" && feedback.displayValue === "United States") {
    return "USA";
  }
  return feedback.displayValue;
}

function formatFeedbackLabel(
  label: string,
  displayValue: string,
  match: CellFeedback["match"],
): string {
  const matchLabel = formatMatchLabel(match);
  return `${label}: ${displayValue}. ${matchLabel}.`;
}

function formatMatchLabel(match: CellFeedback["match"]): string {
  if (match === "exact") {
    return "Exact";
  }
  if (match === "partial") {
    return "Close";
  }
  return "No match";
}
