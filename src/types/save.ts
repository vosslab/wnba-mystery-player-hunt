import type { DailyPuzzleState } from "./puzzle";

/** The explicit presentation preference persisted alongside game progress. */
export type ThemePreference = "system" | "light" | "dark";

export type GameStatistics = {
  readonly gamesPlayed: number;
  readonly gamesWon: number;
  readonly currentStreak: number;
  readonly maximumStreak: number;
  readonly guessDistribution: Readonly<Record<string, number>>;
  /** UTC daily-completion identity used to reject a duplicate counter update. */
  readonly lastCompletedPuzzleDateUtc: string | null;
};

export type SaveDataV1 = {
  readonly version: 1;
  readonly puzzle: DailyPuzzleState | null;
  readonly statistics: GameStatistics;
  /** Missing on pre-theme v1 saves; loadSaveData migrates those to "system". */
  readonly themePreference: ThemePreference;
};

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
