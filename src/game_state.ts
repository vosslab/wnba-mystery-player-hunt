import { evaluateGuess } from "./clue_engine";
import { MAXIMUM_GUESS_LIMIT, MINIMUM_GUESS_LIMIT } from "./constants";
import { selectDailyPlayer } from "./daily_puzzle";
import { applyPuzzleCompletion } from "./stats_state";
import type { PlayerId } from "./brands";
import type { PlayerRecord, RosterSnapshotV1 } from "./types/player";
import type { DailyPuzzleState, GuessEvaluation } from "./types/puzzle";
import type { SaveDataV1 } from "./types/save";

export type ReconcileReason = "created" | "retained" | "stale-date" | "missing-target";

export type ReconcileTodayResult = {
  readonly reason: ReconcileReason;
  readonly saveData: SaveDataV1;
};

export type GuessRejectionReason =
  | "no-active-puzzle"
  | "puzzle-complete"
  | "duplicate-guess"
  | "player-not-in-snapshot"
  | "target-not-in-snapshot";

export type SubmitGuessResult =
  | {
      readonly kind: "accepted";
      readonly saveData: SaveDataV1;
      readonly evaluation: GuessEvaluation;
      readonly completedStatus: "won" | "lost" | null;
    }
  | {
      readonly kind: "rejected";
      readonly saveData: SaveDataV1;
      readonly reason: GuessRejectionReason;
    };

//============================================

/**
 * Creates the deterministic daily puzzle. The caller supplies the UTC date so
 * this domain module never consults the clock.
 */
export function createTodayPuzzle(snapshot: RosterSnapshotV1, todayUtc: string): DailyPuzzleState {
  const target = selectDailyPlayer(snapshot, todayUtc);
  const puzzle: DailyPuzzleState = {
    puzzleDateUtc: todayUtc,
    targetPlayerId: target.playerId,
    status: "active",
    guesses: [],
  };
  return puzzle;
}

/**
 * Keeps a valid puzzle for today, otherwise replaces only the puzzle state.
 * Discarding stale state never records a loss or otherwise changes statistics.
 */
export function reconcileTodayPuzzle(
  saveData: SaveDataV1,
  snapshot: RosterSnapshotV1,
  todayUtc: string,
): ReconcileTodayResult {
  const existingPuzzle = saveData.puzzle;
  if (existingPuzzle === null) {
    return replacePuzzle(saveData, snapshot, todayUtc, "created");
  }

  if (existingPuzzle.puzzleDateUtc !== todayUtc) {
    return replacePuzzle(saveData, snapshot, todayUtc, "stale-date");
  }

  if (findPlayer(snapshot, existingPuzzle.targetPlayerId) === undefined) {
    return replacePuzzle(saveData, snapshot, todayUtc, "missing-target");
  }

  return { reason: "retained", saveData };
}

/**
 * Accepts exactly one valid new player guess. Duplicate and invalid submissions
 * leave the supplied save object unchanged so callers can safely persist it.
 */
export function submitGuess(
  saveData: SaveDataV1,
  snapshot: RosterSnapshotV1,
  guessedPlayerId: PlayerId,
  guessLimit: number,
): SubmitGuessResult {
  assertGuessLimit(guessLimit);
  const puzzle = saveData.puzzle;
  if (puzzle === null) {
    return rejectedGuess(saveData, "no-active-puzzle");
  }
  if (puzzle.status !== "active") {
    return rejectedGuess(saveData, "puzzle-complete");
  }
  if (hasGuessedPlayer(puzzle, guessedPlayerId)) {
    return rejectedGuess(saveData, "duplicate-guess");
  }

  const guess = findPlayer(snapshot, guessedPlayerId);
  if (guess === undefined) {
    return rejectedGuess(saveData, "player-not-in-snapshot");
  }

  const target = findPlayer(snapshot, puzzle.targetPlayerId);
  if (target === undefined) {
    return rejectedGuess(saveData, "target-not-in-snapshot");
  }

  const evaluation = evaluateGuess(guess, target, puzzle.puzzleDateUtc);
  const activeSaveData = appendEvaluation(saveData, evaluation);
  if (guessedPlayerId === puzzle.targetPlayerId) {
    const completedSaveData = completePuzzle(activeSaveData, "won");
    return acceptedGuess(completedSaveData, evaluation, "won");
  }
  if (activeSaveData.puzzle !== null && activeSaveData.puzzle.guesses.length >= guessLimit) {
    const completedSaveData = completePuzzle(activeSaveData, "lost");
    return acceptedGuess(completedSaveData, evaluation, "lost");
  }

  return acceptedGuess(activeSaveData, evaluation, null);
}

/**
 * The only active-to-completed transition. Its date-keyed statistics update is
 * idempotent, allowing safe replay after a save or reload boundary.
 */
export function completePuzzle(saveData: SaveDataV1, outcome: "won" | "lost"): SaveDataV1 {
  const puzzle = saveData.puzzle;
  if (puzzle === null || puzzle.status !== "active") {
    return saveData;
  }

  const completedPuzzle: DailyPuzzleState = { ...puzzle, status: outcome };
  const statistics = applyPuzzleCompletion(saveData.statistics, {
    puzzleDateUtc: puzzle.puzzleDateUtc,
    outcome,
    guessCount: puzzle.guesses.length,
  });
  const completedSaveData: SaveDataV1 = {
    ...saveData,
    puzzle: completedPuzzle,
    statistics,
  };
  return completedSaveData;
}

export function assertGuessLimit(guessLimit: number): void {
  if (
    !Number.isInteger(guessLimit) ||
    guessLimit < MINIMUM_GUESS_LIMIT ||
    guessLimit > MAXIMUM_GUESS_LIMIT
  ) {
    throw new Error("Guess limit must be an integer from 5 through 7.");
  }
}

//============================================

function replacePuzzle(
  saveData: SaveDataV1,
  snapshot: RosterSnapshotV1,
  todayUtc: string,
  reason: Exclude<ReconcileReason, "retained">,
): ReconcileTodayResult {
  const puzzle = createTodayPuzzle(snapshot, todayUtc);
  const reconciledSaveData: SaveDataV1 = { ...saveData, puzzle };
  return { reason, saveData: reconciledSaveData };
}

function findPlayer(snapshot: RosterSnapshotV1, playerId: PlayerId): PlayerRecord | undefined {
  return snapshot.players.find((player) => player.playerId === playerId);
}

function hasGuessedPlayer(puzzle: DailyPuzzleState, playerId: PlayerId): boolean {
  return puzzle.guesses.some((guess) => guess.guessedPlayerId === playerId);
}

function appendEvaluation(saveData: SaveDataV1, evaluation: GuessEvaluation): SaveDataV1 {
  const puzzle = saveData.puzzle;
  if (puzzle === null || puzzle.status !== "active") {
    throw new Error("Cannot append a guess to a missing or completed puzzle.");
  }

  const guesses = [...puzzle.guesses, evaluation];
  const activePuzzle: DailyPuzzleState = { ...puzzle, guesses };
  const activeSaveData: SaveDataV1 = { ...saveData, puzzle: activePuzzle };
  return activeSaveData;
}

function rejectedGuess(saveData: SaveDataV1, reason: GuessRejectionReason): SubmitGuessResult {
  return { kind: "rejected", saveData, reason };
}

function acceptedGuess(
  saveData: SaveDataV1,
  evaluation: GuessEvaluation,
  completedStatus: "won" | "lost" | null,
): SubmitGuessResult {
  return { kind: "accepted", saveData, evaluation, completedStatus };
}
