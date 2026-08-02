import { CLUE_DEFINITIONS, type CellFeedback, type GuessEvaluation } from "./types/puzzle";

/** Renders the saved evaluations without needing access to the full player snapshot. */
export function renderGrid(container: HTMLElement, evaluations: readonly GuessEvaluation[]): void {
  container.replaceChildren();

  if (evaluations.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-grid-message";
    message.textContent = "Your guesses will build a clue grid here.";
    container.append(message);
    return;
  }

  const table = document.createElement("table");
  table.className = "comparison-table";
  table.dataset.grid = "comparison";

  const caption = document.createElement("caption");
  caption.textContent =
    "Comparison grid. Each row is one player guess; every clue says Exact, Close, or No match.";
  table.append(caption);

  table.append(createHeaderRow());
  table.append(createBody(evaluations));
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

function createBody(evaluations: readonly GuessEvaluation[]): HTMLTableSectionElement {
  const body = document.createElement("tbody");

  for (const evaluation of evaluations) {
    const row = document.createElement("tr");
    row.append(createHeaderCell(evaluation.guessedDisplayName, "row"));

    for (const definition of CLUE_DEFINITIONS) {
      const feedback = evaluation.cells.find((cell) => cell.clueId === definition.id);
      row.append(createFeedbackCell(definition.label, feedback));
    }

    body.append(row);
  }

  return body;
}

function createHeaderCell(label: string, scope: "col" | "row"): HTMLTableCellElement {
  const cell = document.createElement("th");
  cell.scope = scope;
  cell.textContent = label;
  return cell;
}

function createFeedbackCell(
  label: string,
  feedback: CellFeedback | undefined,
): HTMLTableCellElement {
  const cell = document.createElement("td");
  const match = feedback?.match ?? "miss";
  cell.className = `feedback-cell feedback-${match}`;
  cell.dataset.feedback = match;
  cell.setAttribute("aria-label", formatFeedbackLabel(label, feedback));

  const value = document.createElement("span");
  value.className = "feedback-value";
  value.textContent = feedback?.displayValue ?? "Not available";

  const badge = document.createElement("span");
  badge.className = "feedback-badge";
  badge.textContent = formatMatchLabel(match);

  cell.append(value, badge);
  return cell;
}

function formatFeedbackLabel(label: string, feedback: CellFeedback | undefined): string {
  const value = feedback?.displayValue ?? "Not available";
  const match = formatMatchLabel(feedback?.match ?? "miss");
  return `${label}: ${value}. ${match}.`;
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
