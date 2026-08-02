import type { GameStatistics } from "./types/save";

export type CompletionOutcome = "won" | "lost";

export type PuzzleCompletion = {
  readonly puzzleDateUtc: string;
  readonly outcome: CompletionOutcome;
  readonly guessCount: number;
};

function isUtcDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function assertValidCompletion(completion: PuzzleCompletion): void {
  if (!isUtcDate(completion.puzzleDateUtc)) {
    throw new Error("Puzzle completion must use a valid UTC date.");
  }
  if (!Number.isInteger(completion.guessCount) || completion.guessCount < 1) {
    throw new Error("Winning puzzle completion must include a positive integer guess count.");
  }
}

function previousUtcDate(dateUtc: string): string {
  const date = new Date(`${dateUtc}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  const previousDate = date.toISOString().slice(0, 10);
  return previousDate;
}

function incrementDistribution(
  distribution: Readonly<Record<string, number>>,
  guessCount: number,
): Readonly<Record<string, number>> {
  const key = String(guessCount);
  const currentCount = distribution[key] ?? 0;
  return { ...distribution, [key]: currentCount + 1 };
}

/**
 * The completion date is persisted with statistics, so reloads cannot recount it.
 */
export function applyPuzzleCompletion(
  statistics: GameStatistics,
  completion: PuzzleCompletion,
): GameStatistics {
  assertValidCompletion(completion);
  if (statistics.lastCompletedPuzzleDateUtc === completion.puzzleDateUtc) {
    return statistics;
  }

  const gamesPlayed = statistics.gamesPlayed + 1;
  if (completion.outcome === "lost") {
    return {
      ...statistics,
      gamesPlayed,
      currentStreak: 0,
      lastCompletedPuzzleDateUtc: completion.puzzleDateUtc,
    };
  }

  const isConsecutiveWin =
    statistics.lastCompletedPuzzleDateUtc === previousUtcDate(completion.puzzleDateUtc);
  const currentStreak = isConsecutiveWin ? statistics.currentStreak + 1 : 1;
  const maximumStreak = Math.max(statistics.maximumStreak, currentStreak);
  const guessDistribution = incrementDistribution(
    statistics.guessDistribution,
    completion.guessCount,
  );
  return {
    ...statistics,
    gamesPlayed,
    gamesWon: statistics.gamesWon + 1,
    currentStreak,
    maximumStreak,
    lastCompletedPuzzleDateUtc: completion.puzzleDateUtc,
    guessDistribution,
  };
}
