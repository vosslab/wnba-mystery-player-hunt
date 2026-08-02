import assert from "node:assert/strict";
import test from "node:test";

import { parseRosterSnapshot } from "../src/types/player.ts";

function player() {
  return {
    playerId: "1",
    displayName: "Example Player",
    searchName: "example player",
    teamCode: "ATL",
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

function snapshot(dataKind, selectionKind) {
  return {
    schemaVersion: 1,
    asOfDateUtc: "2026-08-02",
    dataKind,
    dataStatus: "verified",
    sourceNote: "test provenance",
    selectionRule: {
      kind: selectionKind,
      eligibilityGate: "current-roster",
      recognizabilityMetric: "WNBA_FANTASY_PTS",
      seasons: ["2026", "2025"],
      cutoff: 200,
      selectedPoolSize: 1,
    },
    players: [player()],
  };
}

test("roster snapshot parser preserves verified derived and official provenance", () => {
  for (const kind of ["derived", "official"]) {
    const parsed = parseRosterSnapshot(snapshot(kind, kind));
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.snapshot.dataKind, kind);
      assert.equal(parsed.snapshot.selectionRule.kind, kind);
    }
  }
});

test("roster snapshot parser rejects mismatched verified provenance", () => {
  for (const [dataKind, selectionKind] of [
    ["derived", "official"],
    ["official", "derived"],
  ]) {
    const parsed = parseRosterSnapshot(snapshot(dataKind, selectionKind));
    assert.equal(parsed.ok, false);
  }
});
