import type { Conference } from "./types/player";

export const DEFAULT_GUESS_LIMIT = 9;
export const MINIMUM_GUESS_LIMIT = 5;
export const MAXIMUM_GUESS_LIMIT = 9;
export const SAVE_STORAGE_KEY = "wnba-20-questions-save-v1";

/** The first UTC day in the deterministic daily-puzzle schedule. */
export const DAILY_EPOCH_UTC = "2026-01-01";

export const TEAM_CONFERENCES = {
  ATL: "East",
  CHI: "East",
  CON: "East",
  DAL: "West",
  GSV: "West",
  IND: "East",
  LAS: "West",
  LVA: "West",
  MIN: "West",
  NYL: "East",
  PHX: "West",
  POR: "West",
  SEA: "West",
  TOR: "East",
  WAS: "East",
} as const satisfies Readonly<Record<string, Conference>>;
