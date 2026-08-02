import type { FeedbackMatch, DailyPuzzleState } from "./types/puzzle";

export type ShareFormatOptions = {
  /** A stable, non-player identifier for the daily puzzle. */
  readonly puzzleIdentity?: string;
  readonly productName?: string;
};

const DEFAULT_PRODUCT_NAME = "WNBA Pickle";

/**
 * Produces a compact round summary that deliberately contains no names, ids, or clue values.
 * It is meaningful only after a completed round, so an active state is rejected rather than
 * accidentally presenting a partial score as a result.
 */
export function formatShareText(
  puzzle: DailyPuzzleState,
  guessLimit: number,
  options: ShareFormatOptions = {},
): string {
  assertCompletedPuzzle(puzzle);
  assertGuessLimit(guessLimit);

  const productName = options.productName ?? DEFAULT_PRODUCT_NAME;
  const puzzleIdentity = options.puzzleIdentity ?? puzzle.puzzleDateUtc;
  const score =
    puzzle.status === "won" ? `${puzzle.guesses.length}/${guessLimit}` : `X/${guessLimit}`;
  const rows = puzzle.guesses.map((guess) =>
    guess.cells.map((cell) => shareSymbol(cell.match)).join(""),
  );

  return [`${productName} ${puzzleIdentity} ${score}`, ...rows].join("\n");
}

function assertCompletedPuzzle(puzzle: DailyPuzzleState): void {
  if (puzzle.status === "active") {
    throw new Error("Share text is available only after the round is complete.");
  }
}

function assertGuessLimit(guessLimit: number): void {
  if (!Number.isInteger(guessLimit) || guessLimit < 1) {
    throw new Error("Guess limit must be a positive integer.");
  }
}

function shareSymbol(match: FeedbackMatch): string {
  if (match === "exact") {
    return "\u{1F7E9}";
  }
  if (match === "partial") {
    return "\u{1F7E8}";
  }
  return "\u{2B1B}";
}
