import { scoreForWin } from "./score";
import { CLUE_DEFINITIONS, type FeedbackMatch, type DailyPuzzleState } from "./types/puzzle";

export type ShareFormatOptions = {
  /** A stable, non-player identifier for the daily puzzle. */
  readonly puzzleIdentity?: string;
  readonly productName?: string;
  readonly currentStreak?: number;
};

const DEFAULT_PRODUCT_NAME = "WNBA Mystery Player Hunt";

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
  assertCurrentStreak(options.currentStreak);
  const score =
    puzzle.status === "won" ? `${puzzle.guesses.length}/${guessLimit}` : `X/${guessLimit}`;
  const points = puzzle.status === "won" ? scoreForWin(puzzle.guesses.length) : 0;
  const rows = puzzle.guesses.map((guess) =>
    CLUE_DEFINITIONS.flatMap((definition) => {
      const cell = guess.cells.find((candidate) => candidate.clueId === definition.id);
      return cell === undefined ? [] : [shareSymbol(cell.match)];
    }).join(""),
  );

  const streak = options.currentStreak === undefined ? "" : ` | Streak: ${options.currentStreak}`;
  return [`${productName} ${puzzleIdentity}`, `${score} | ${points} pts${streak}`, ...rows].join(
    "\n",
  );
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

function assertCurrentStreak(currentStreak: number | undefined): void {
  if (currentStreak !== undefined && (!Number.isInteger(currentStreak) || currentStreak < 0)) {
    throw new Error("Current streak must be a non-negative integer.");
  }
}

function shareSymbol(match: FeedbackMatch): string {
  if (match === "exact") {
    return "\u{1F7E7}";
  }
  if (match === "partial") {
    return "\u{1F7E6}";
  }
  return "\u{2B1B}";
}
