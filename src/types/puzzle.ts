import type { PlayerId } from "../brands";

export type ClueId =
  | "team"
  | "conference"
  | "height"
  | "draft-year"
  | "draft-pick"
  | "country"
  | "college"
  | "age"
  | "position";

export type ClueDefinition = {
  readonly id: ClueId;
  readonly label: string;
  readonly compactLabel?: string;
};

/**
 * The grid and clue engine both derive their order, labels, and identities here.
 * It is intentionally an array contract rather than a fixed-length tuple.
 */
export const CLUE_DEFINITIONS: readonly ClueDefinition[] = [
  { id: "conference", label: "Conference", compactLabel: "Conf." },
  { id: "team", label: "Team" },
  { id: "position", label: "Position", compactLabel: "Pos." },
  { id: "country", label: "Country" },
  { id: "draft-year", label: "Draft year", compactLabel: "Draft" },
  { id: "draft-pick", label: "Draft pick", compactLabel: "Pick" },
  { id: "college", label: "College" },
  { id: "height", label: "Height" },
  { id: "age", label: "Age" },
];

export type FeedbackMatch = "exact" | "partial" | "miss";

/** No arrow state is represented in the first game version. */
export type CellFeedback = {
  readonly clueId: ClueId;
  readonly displayValue: string;
  readonly match: FeedbackMatch;
};

export type GuessEvaluation = {
  readonly guessedPlayerId: PlayerId;
  readonly guessedDisplayName: string;
  readonly cells: readonly CellFeedback[];
};

export type PuzzleStatus = "active" | "won" | "lost";

/**
 * Stored feedback makes an in-progress puzzle renderable after refresh without
 * looking up a historical player record.
 */
export type DailyPuzzleState = {
  readonly puzzleDateUtc: string;
  readonly targetPlayerId: PlayerId;
  readonly status: PuzzleStatus;
  readonly guesses: readonly GuessEvaluation[];
};
