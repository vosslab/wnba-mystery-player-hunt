import { puzzleNumberFromInteger } from "./brands";
import { DAILY_EPOCH_UTC } from "./constants";
import type { PuzzleNumber } from "./brands";
import type { PlayerRecord, RosterSnapshotV1 } from "./types/player";

const UTC_DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
const UTC_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type RankedPlayer = {
  readonly player: PlayerRecord;
  readonly rank: number;
};

/**
 * Converts one strictly formatted UTC calendar date into its schedule number.
 * Callers supply the date so selection remains independent of the wall clock.
 */
export function puzzleNumberForUtcDate(utcDate: string): PuzzleNumber {
  const dateMilliseconds = utcDateToMilliseconds(utcDate);
  const epochMilliseconds = utcDateToMilliseconds(DAILY_EPOCH_UTC);
  const dayOffset = (dateMilliseconds - epochMilliseconds) / UTC_DAY_MILLISECONDS;

  if (dayOffset < 0) {
    throw new Error(`UTC puzzle date must not precede ${DAILY_EPOCH_UTC}.`);
  }

  return puzzleNumberFromInteger(dayOffset);
}

/**
 * Selects the day's player from a roster-specific fixed permutation. Each
 * player appears once before the puzzle schedule wraps to the first position.
 */
export function selectDailyPlayer(snapshot: RosterSnapshotV1, utcDate: string): PlayerRecord {
  const puzzleNumber = puzzleNumberForUtcDate(utcDate);
  const permutation = createRosterPermutation(snapshot);
  const playerIndex = Number(puzzleNumber) % permutation.length;
  const player = permutation[playerIndex];

  if (player === undefined) {
    throw new Error("Daily player selection could not resolve a player index.");
  }

  return player;
}

function utcDateToMilliseconds(utcDate: string): number {
  if (!UTC_DATE_PATTERN.test(utcDate)) {
    throw new Error("UTC puzzle date must use YYYY-MM-DD format.");
  }

  const date = new Date(`${utcDate}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || !date.toISOString().startsWith(`${utcDate}T`)) {
    throw new Error("UTC puzzle date must be a real calendar date.");
  }

  return date.valueOf();
}

function createRosterPermutation(snapshot: RosterSnapshotV1): readonly PlayerRecord[] {
  if (snapshot.players.length === 0) {
    throw new Error("Daily player selection requires at least one roster player.");
  }

  const playerIds = new Set<string>();
  const rankedPlayers: RankedPlayer[] = [];
  for (const player of snapshot.players) {
    const playerId = String(player.playerId);
    if (playerIds.has(playerId)) {
      throw new Error("Daily player selection requires unique player IDs.");
    }

    playerIds.add(playerId);
    rankedPlayers.push({
      player,
      rank: hash32(playerId),
    });
  }

  rankedPlayers.sort(compareRankedPlayers);
  return rankedPlayers.map(extractPlayer);
}

function compareRankedPlayers(left: RankedPlayer, right: RankedPlayer): number {
  if (left.rank !== right.rank) {
    return left.rank - right.rank;
  }

  const leftId = String(left.player.playerId);
  const rightId = String(right.player.playerId);
  return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
}

function extractPlayer(rankedPlayer: RankedPlayer): PlayerRecord {
  return rankedPlayer.player;
}

/** A small, specified 32-bit FNV-1a hash implemented with integer operations. */
function hash32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    const characterCode = value.charCodeAt(index);
    hash ^= characterCode;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash;
}
