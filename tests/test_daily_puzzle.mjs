import assert from "node:assert/strict";
import test from "node:test";

import { puzzleNumberForUtcDate, selectDailyPlayer } from "../src/daily_puzzle.ts";

function player(playerId) {
  return {
    playerId,
    displayName: `Player ${playerId}`,
    searchName: `player ${playerId}`,
    teamCode: "CHI",
    conference: "East",
    heightInches: 72,
    birthDateUtc: "2000-01-01T00:00:00Z",
    draft: { kind: "drafted", year: 2020, overallPick: 1 },
    country: "United States",
    college: "Example U",
    positionPrimary: "G",
    positionAlternates: [],
  };
}

function snapshot() {
  const players = [player("1"), player("2"), player("3"), player("4")];
  return {
    schemaVersion: 1,
    asOfDateUtc: "2026-01-01",
    dataKind: "derived",
    dataStatus: "verified",
    sourceNote: "inline test roster",
    selectionRule: {
      kind: "derived",
      eligibilityGate: "current-roster",
      recognizabilityMetric: "WNBA_FANTASY_PTS",
      seasons: ["2026", "2025"],
      cutoff: 0,
      selectedPoolSize: players.length,
    },
    players,
  };
}

test("daily selection is stable and visits every player before repeating", () => {
  const roster = snapshot();
  const dates = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"];
  const selected = dates.map((date) => selectDailyPlayer(roster, date).playerId);
  assert.equal(selectDailyPlayer(roster, "2026-01-03").playerId, selected[2]);
  assert.equal(selected.length, roster.players.length);
  assert.equal(new Set(selected).size, selected.length);
  assert.equal(selectDailyPlayer(roster, "2026-01-05").playerId, selected[0]);
});

test("daily selection depends only on the player pool and date", () => {
  const roster = snapshot();
  const changedProvenance = { ...roster, asOfDateUtc: "2026-02-01", sourceNote: "changed" };
  assert.equal(
    selectDailyPlayer(roster, "2026-01-03").playerId,
    selectDailyPlayer(changedProvenance, "2026-01-03").playerId,
  );
});

test("daily puzzle dates use real UTC calendar dates on or after the epoch", () => {
  assert.equal(Number(puzzleNumberForUtcDate("2026-01-01")), 0);
  assert.equal(Number(puzzleNumberForUtcDate("2026-01-02")), 1);
  for (const value of ["2025-12-31", "2026-02-30", "2026/01/01", "2026-1-01"]) {
    assert.throws(() => puzzleNumberForUtcDate(value));
  }
});
