export const MAXIMUM_ROUND_SCORE = 100;
export const EXTRA_GUESS_PENALTY = 10;
export const MINIMUM_WIN_SCORE = 20;

/** Returns the round score for a win, with each extra guess costing ten points. */
export function scoreForWin(guessCount: number): number {
  if (!Number.isInteger(guessCount) || guessCount < 1) {
    throw new Error("A winning score requires a positive integer guess count.");
  }

  const penalty = (guessCount - 1) * EXTRA_GUESS_PENALTY;
  const score = Math.max(MAXIMUM_ROUND_SCORE - penalty, MINIMUM_WIN_SCORE);
  return score;
}

/** Returns the score available if the next guess solves the round. */
export function scoreAvailableAfter(attempts: number): number {
  if (!Number.isInteger(attempts) || attempts < 0) {
    throw new Error("Attempts must be a non-negative integer.");
  }

  const score = scoreForWin(attempts + 1);
  return score;
}
