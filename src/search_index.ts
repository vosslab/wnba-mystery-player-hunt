import type { PlayerId } from "./brands";
import type { PlayerRecord, PositionCode } from "./types/player";

export const MINIMUM_SEARCH_CHARACTERS = 2;

export type PlayerSearchResult = {
  readonly playerId: PlayerId;
  readonly displayName: string;
  readonly team: string;
  readonly position: PositionCode;
};

type IndexedPlayer = {
  readonly player: PlayerRecord;
  readonly normalizedNames: readonly string[];
  readonly normalizedTokens: readonly string[];
};

export type PlayerSearchIndex = {
  readonly entries: readonly IndexedPlayer[];
};

type RankedPlayer = {
  readonly entry: IndexedPlayer;
  readonly matchRank: number;
};

// Normalize input for matching only. Display values always come from PlayerRecord.
export function normalizeSearchText(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, "")
    .trim()
    .replace(/\s+/g, " ");
  return normalized;
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  const uniqueValues = new Set<string>();
  for (const value of values) {
    if (value.length > 0) {
      uniqueValues.add(value);
    }
  }

  const result = [...uniqueValues];
  return result;
}

function tokensForNames(names: readonly string[]): readonly string[] {
  const tokens: string[] = [];
  for (const name of names) {
    tokens.push(...name.split(" "));
  }

  const uniqueTokens = uniqueStrings(tokens);
  return uniqueTokens;
}

function indexPlayer(player: PlayerRecord): IndexedPlayer {
  const normalizedNames = uniqueStrings([
    normalizeSearchText(player.displayName),
    normalizeSearchText(player.searchName),
  ]);
  if (normalizedNames.length === 0) {
    throw new Error(`Player ${player.playerId} has no searchable name.`);
  }

  const normalizedTokens = tokensForNames(normalizedNames);
  const entry: IndexedPlayer = {
    player,
    normalizedNames,
    normalizedTokens,
  };
  return entry;
}

/** Build once per roster snapshot so each keystroke only evaluates normalized names. */
export function buildPlayerSearchIndex(players: readonly PlayerRecord[]): PlayerSearchIndex {
  const playerIds = new Set<PlayerId>();
  const entries: IndexedPlayer[] = [];

  for (const player of players) {
    if (playerIds.has(player.playerId)) {
      throw new Error(`Duplicate player ID in search index: ${player.playerId}`);
    }
    playerIds.add(player.playerId);
    entries.push(indexPlayer(player));
  }

  const index: PlayerSearchIndex = { entries };
  return index;
}

function hasPrefix(values: readonly string[], query: string): boolean {
  return values.some(function hasValuePrefix(value: string): boolean {
    return value.startsWith(query);
  });
}

function hasSubstring(values: readonly string[], query: string): boolean {
  return values.some(function hasValueSubstring(value: string): boolean {
    return value.includes(query);
  });
}

function matchRank(entry: IndexedPlayer, query: string): number | undefined {
  if (hasPrefix(entry.normalizedNames, query)) {
    return 0;
  }
  if (hasPrefix(entry.normalizedTokens, query)) {
    return 1;
  }
  if (hasSubstring(entry.normalizedNames, query)) {
    return 2;
  }
  return undefined;
}

function compareRankedPlayers(left: RankedPlayer, right: RankedPlayer): number {
  const rankDifference = left.matchRank - right.matchRank;
  if (rankDifference !== 0) {
    return rankDifference;
  }

  if (left.entry.player.displayName < right.entry.player.displayName) {
    return -1;
  }
  if (left.entry.player.displayName > right.entry.player.displayName) {
    return 1;
  }
  if (left.entry.player.playerId < right.entry.player.playerId) {
    return -1;
  }
  if (left.entry.player.playerId > right.entry.player.playerId) {
    return 1;
  }
  return 0;
}

function toSearchResult(entry: IndexedPlayer): PlayerSearchResult {
  const result: PlayerSearchResult = {
    playerId: entry.player.playerId,
    displayName: entry.player.displayName,
    team: entry.player.teamCode,
    position: entry.player.positionPrimary,
  };
  return result;
}

/**
 * Returns an empty list until two normalized characters are present. Prefixes
 * rank ahead of token-prefixes and substrings so short queries stay predictable.
 */
export function queryPlayerSearch(
  index: PlayerSearchIndex,
  input: string,
  excludedPlayerIds: ReadonlySet<PlayerId> = new Set<PlayerId>(),
): readonly PlayerSearchResult[] {
  const query = normalizeSearchText(input);
  if (query.length < MINIMUM_SEARCH_CHARACTERS) {
    return [];
  }

  const matches: RankedPlayer[] = [];
  for (const entry of index.entries) {
    if (excludedPlayerIds.has(entry.player.playerId)) {
      continue;
    }

    const rank = matchRank(entry, query);
    if (rank !== undefined) {
      matches.push({ entry, matchRank: rank });
    }
  }

  matches.sort(compareRankedPlayers);
  const results = matches.map(function mapSearchResult(match: RankedPlayer): PlayerSearchResult {
    return toSearchResult(match.entry);
  });
  return results;
}
