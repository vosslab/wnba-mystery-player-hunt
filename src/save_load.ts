import { playerIdFromString } from "./brands";
import { DEFAULT_GUESS_LIMIT, SAVE_STORAGE_KEY } from "./constants";
import type {
  CellFeedback,
  ClueId,
  DailyPuzzleState,
  FeedbackMatch,
  GuessEvaluation,
  PuzzleStatus,
} from "./types/puzzle";
import type { GameStatistics, KeyValueStore, SaveDataV1, ThemePreference } from "./types/save";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isUtcDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isClueId(value: unknown): value is ClueId {
  return (
    value === "team" ||
    value === "conference" ||
    value === "height" ||
    value === "draft-year" ||
    value === "draft-pick" ||
    value === "country" ||
    value === "college" ||
    value === "age" ||
    value === "position"
  );
}

function isFeedbackMatch(value: unknown): value is FeedbackMatch {
  return value === "exact" || value === "partial" || value === "miss";
}

function isPuzzleStatus(value: unknown): value is PuzzleStatus {
  return value === "active" || value === "won" || value === "lost";
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function parseCellFeedback(value: unknown): CellFeedback | null {
  if (!isRecord(value)) {
    return null;
  }

  const { clueId, displayValue, match } = value;
  if (!isClueId(clueId) || typeof displayValue !== "string" || !isFeedbackMatch(match)) {
    return null;
  }

  return { clueId, displayValue, match };
}

function parseGuessEvaluation(value: unknown): GuessEvaluation | null {
  if (!isRecord(value) || !Array.isArray(value.cells)) {
    return null;
  }

  const { guessedPlayerId, guessedDisplayName } = value;
  if (typeof guessedPlayerId !== "string" || typeof guessedDisplayName !== "string") {
    return null;
  }

  const cells: CellFeedback[] = [];
  for (const cellValue of value.cells) {
    const cell = parseCellFeedback(cellValue);
    if (cell === null) {
      return null;
    }
    cells.push(cell);
  }

  try {
    const parsedPlayerId = playerIdFromString(guessedPlayerId);
    return { guessedPlayerId: parsedPlayerId, guessedDisplayName, cells };
  } catch {
    return null;
  }
}

function parseDailyPuzzleState(value: unknown): DailyPuzzleState | null {
  if (!isRecord(value) || !Array.isArray(value.guesses)) {
    return null;
  }

  const { puzzleDateUtc, targetPlayerId, status } = value;
  if (!isUtcDate(puzzleDateUtc) || typeof targetPlayerId !== "string" || !isPuzzleStatus(status)) {
    return null;
  }

  const guesses: GuessEvaluation[] = [];
  for (const guessValue of value.guesses) {
    const guess = parseGuessEvaluation(guessValue);
    if (guess === null) {
      return null;
    }
    guesses.push(guess);
  }

  try {
    const parsedTargetPlayerId = playerIdFromString(targetPlayerId);
    return { puzzleDateUtc, targetPlayerId: parsedTargetPlayerId, status, guesses };
  } catch {
    return null;
  }
}

function parseGuessDistribution(value: unknown): Readonly<Record<string, number>> | null {
  if (!isRecord(value)) {
    return null;
  }

  const distribution: Record<string, number> = {};
  for (const [key, count] of Object.entries(value)) {
    if (!isNonNegativeInteger(count)) {
      return null;
    }
    distribution[key] = count;
  }
  return distribution;
}

function parseGameStatistics(value: unknown): GameStatistics | null {
  if (!isRecord(value)) {
    return null;
  }

  const { gamesPlayed, gamesWon, currentStreak, maximumStreak, guessDistribution } = value;
  const lastCompletedPuzzleDateUtc =
    value.lastCompletedPuzzleDateUtc === undefined ? null : value.lastCompletedPuzzleDateUtc;
  if (
    !isNonNegativeInteger(gamesPlayed) ||
    !isNonNegativeInteger(gamesWon) ||
    !isNonNegativeInteger(currentStreak) ||
    !isNonNegativeInteger(maximumStreak) ||
    gamesWon > gamesPlayed ||
    (lastCompletedPuzzleDateUtc !== null && !isUtcDate(lastCompletedPuzzleDateUtc))
  ) {
    return null;
  }

  const parsedDistribution = parseGuessDistribution(guessDistribution);
  if (parsedDistribution === null) {
    return null;
  }

  return {
    gamesPlayed,
    gamesWon,
    currentStreak,
    maximumStreak,
    lastCompletedPuzzleDateUtc,
    guessDistribution: parsedDistribution,
  };
}

function parseSaveData(value: unknown): SaveDataV1 | null {
  if (!isRecord(value) || value.version !== 1) {
    return null;
  }

  const puzzle = value.puzzle === null ? null : parseDailyPuzzleState(value.puzzle);
  const statistics = parseGameStatistics(value.statistics);
  const themePreference = isThemePreference(value.themePreference)
    ? value.themePreference
    : "system";
  if (puzzle === null && value.puzzle !== null) {
    return null;
  }
  if (statistics === null) {
    return null;
  }

  return { version: 1, puzzle, statistics, themePreference };
}

export function createFreshStatistics(guessLimit: number = DEFAULT_GUESS_LIMIT): GameStatistics {
  const guessDistribution: Record<string, number> = {};
  for (let guessCount = 1; guessCount <= guessLimit; guessCount += 1) {
    guessDistribution[String(guessCount)] = 0;
  }

  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maximumStreak: 0,
    lastCompletedPuzzleDateUtc: null,
    guessDistribution,
  };
}

export function createFreshSaveData(guessLimit: number = DEFAULT_GUESS_LIMIT): SaveDataV1 {
  const statistics = createFreshStatistics(guessLimit);
  return { version: 1, puzzle: null, statistics, themePreference: "system" };
}

/**
 * Storage is optional infrastructure. A broken browser store must not prevent play.
 */
export function loadSaveData(
  store: KeyValueStore,
  guessLimit: number = DEFAULT_GUESS_LIMIT,
): SaveDataV1 {
  try {
    const serialized = store.getItem(SAVE_STORAGE_KEY);
    if (serialized === null) {
      return createFreshSaveData(guessLimit);
    }

    const parsedJson: unknown = JSON.parse(serialized);
    const parsed = parseSaveData(parsedJson);
    if (parsed === null) {
      return createFreshSaveData(guessLimit);
    }
    return parsed;
  } catch {
    return createFreshSaveData(guessLimit);
  }
}

export function saveSaveData(store: KeyValueStore, saveData: SaveDataV1): boolean {
  try {
    const serialized = JSON.stringify(saveData);
    store.setItem(SAVE_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}
