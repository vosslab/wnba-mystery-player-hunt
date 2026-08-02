import type { PlayerRecord, PositionCode } from "./types/player";
import {
  CLUE_DEFINITIONS,
  type CellFeedback,
  type ClueId,
  type FeedbackMatch,
  type GuessEvaluation,
} from "./types/puzzle";

function exactOrPartial(difference: number, tolerance: number): FeedbackMatch {
  if (difference === 0) {
    return "exact";
  }

  if (Math.abs(difference) <= tolerance) {
    return "partial";
  }

  return "miss";
}

function formatHeight(heightInches: number): string {
  const feet = Math.floor(heightInches / 12);
  const inches = heightInches % 12;
  const displayValue = `${feet}'${inches}"`;
  return displayValue;
}

function formatDraftYear(player: PlayerRecord): string {
  if (player.draft.kind === "undrafted") {
    return "Undrafted";
  }

  return String(player.draft.year);
}

function formatDraftPick(player: PlayerRecord): string {
  if (player.draft.kind === "undrafted") {
    return "Undrafted";
  }

  return `#${player.draft.overallPick}`;
}

function allPositions(player: PlayerRecord): readonly PositionCode[] {
  const positions = [player.positionPrimary, ...player.positionAlternates];
  return positions;
}

function formatPosition(player: PlayerRecord): string {
  const displayValue = allPositions(player).join("/");
  return displayValue;
}

function parseUtcCalendarDate(value: string, label: string): Date {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const dateTimeMatch = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}Z$/.exec(value);
  const match = dateOnlyMatch ?? dateTimeMatch;
  if (match === null) {
    throw new Error(`${label} must be an ISO UTC calendar date.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`${label} must be a real UTC calendar date.`);
  }

  return date;
}

/** Derives age for the supplied puzzle date without consulting the current clock. */
export function ageOnPuzzleDate(birthDateUtc: string, puzzleDateUtc: string): number {
  const birthDate = parseUtcCalendarDate(birthDateUtc, "birthDateUtc");
  const puzzleDate = parseUtcCalendarDate(puzzleDateUtc, "puzzleDateUtc");
  if (birthDate.valueOf() > puzzleDate.valueOf()) {
    throw new Error("birthDateUtc cannot be later than puzzleDateUtc.");
  }

  const birthdayHasOccurred =
    puzzleDate.getUTCMonth() > birthDate.getUTCMonth() ||
    (puzzleDate.getUTCMonth() === birthDate.getUTCMonth() &&
      puzzleDate.getUTCDate() >= birthDate.getUTCDate());
  const age =
    puzzleDate.getUTCFullYear() - birthDate.getUTCFullYear() - (birthdayHasOccurred ? 0 : 1);
  return age;
}

export function evaluateTeam(guess: PlayerRecord, target: PlayerRecord): FeedbackMatch {
  return guess.teamCode === target.teamCode ? "exact" : "miss";
}

export function evaluateConference(guess: PlayerRecord, target: PlayerRecord): FeedbackMatch {
  return guess.conference === target.conference ? "exact" : "miss";
}

export function evaluateHeight(guess: PlayerRecord, target: PlayerRecord): FeedbackMatch {
  const difference = guess.heightInches - target.heightInches;
  return exactOrPartial(difference, 2);
}

export function evaluateDraftYear(guess: PlayerRecord, target: PlayerRecord): FeedbackMatch {
  if (guess.draft.kind === "undrafted" || target.draft.kind === "undrafted") {
    return guess.draft.kind === target.draft.kind ? "exact" : "miss";
  }

  const difference = guess.draft.year - target.draft.year;
  return exactOrPartial(difference, 2);
}

export function evaluateDraftPick(guess: PlayerRecord, target: PlayerRecord): FeedbackMatch {
  if (guess.draft.kind === "undrafted" || target.draft.kind === "undrafted") {
    return guess.draft.kind === target.draft.kind ? "exact" : "miss";
  }

  const difference = guess.draft.overallPick - target.draft.overallPick;
  return exactOrPartial(difference, 3);
}

export function evaluateCountry(guess: PlayerRecord, target: PlayerRecord): FeedbackMatch {
  return guess.country === target.country ? "exact" : "miss";
}

export function evaluateCollege(guess: PlayerRecord, target: PlayerRecord): FeedbackMatch {
  return guess.college === target.college ? "exact" : "miss";
}

export function evaluateAge(
  guess: PlayerRecord,
  target: PlayerRecord,
  puzzleDateUtc: string,
): FeedbackMatch {
  const guessAge = ageOnPuzzleDate(guess.birthDateUtc, puzzleDateUtc);
  const targetAge = ageOnPuzzleDate(target.birthDateUtc, puzzleDateUtc);
  const difference = guessAge - targetAge;
  return exactOrPartial(difference, 2);
}

export function evaluatePosition(guess: PlayerRecord, target: PlayerRecord): FeedbackMatch {
  if (guess.positionPrimary === target.positionPrimary) {
    return "exact";
  }

  const targetPositions = new Set(allPositions(target));
  const overlaps = allPositions(guess).some((position) => targetPositions.has(position));
  return overlaps ? "partial" : "miss";
}

function displayValueForClue(clueId: ClueId, guess: PlayerRecord, puzzleDateUtc: string): string {
  switch (clueId) {
    case "team":
      return guess.teamCode;
    case "conference":
      return guess.conference;
    case "height":
      return formatHeight(guess.heightInches);
    case "draft-year":
      return formatDraftYear(guess);
    case "draft-pick":
      return formatDraftPick(guess);
    case "country":
      return guess.country;
    case "college":
      return guess.college;
    case "age":
      return String(ageOnPuzzleDate(guess.birthDateUtc, puzzleDateUtc));
    case "position":
      return formatPosition(guess);
  }
}

function matchForClue(
  clueId: ClueId,
  guess: PlayerRecord,
  target: PlayerRecord,
  puzzleDateUtc: string,
): FeedbackMatch {
  switch (clueId) {
    case "team":
      return evaluateTeam(guess, target);
    case "conference":
      return evaluateConference(guess, target);
    case "height":
      return evaluateHeight(guess, target);
    case "draft-year":
      return evaluateDraftYear(guess, target);
    case "draft-pick":
      return evaluateDraftPick(guess, target);
    case "country":
      return evaluateCountry(guess, target);
    case "college":
      return evaluateCollege(guess, target);
    case "age":
      return evaluateAge(guess, target, puzzleDateUtc);
    case "position":
      return evaluatePosition(guess, target);
  }
}

function evaluateClue(
  clueId: ClueId,
  guess: PlayerRecord,
  target: PlayerRecord,
  puzzleDateUtc: string,
): CellFeedback {
  const displayValue = displayValueForClue(clueId, guess, puzzleDateUtc);
  const match = matchForClue(clueId, guess, target, puzzleDateUtc);
  const cell: CellFeedback = { clueId, displayValue, match };
  return cell;
}

/** Evaluates one guessed player in the single, ordered clue collection owned by the contract. */
export function evaluateGuess(
  guess: PlayerRecord,
  target: PlayerRecord,
  puzzleDateUtc: string,
): GuessEvaluation {
  const cells = CLUE_DEFINITIONS.map((definition) =>
    evaluateClue(definition.id, guess, target, puzzleDateUtc),
  );
  const evaluation: GuessEvaluation = {
    guessedPlayerId: guess.playerId,
    guessedDisplayName: guess.displayName,
    cells,
  };
  return evaluation;
}
