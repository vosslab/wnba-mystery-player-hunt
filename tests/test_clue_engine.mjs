import assert from "node:assert/strict";
import test from "node:test";

import {
  ageOnPuzzleDate,
  evaluateAge,
  evaluateDraftPick,
  evaluateDraftYear,
  evaluateGuess,
  evaluateHeight,
  evaluatePosition,
} from "../src/clue_engine.ts";
import { CLUE_DEFINITIONS } from "../src/types/puzzle.ts";

function player(overrides = {}) {
  return {
    playerId: "1",
    displayName: "Test Player",
    searchName: "test player",
    teamCode: "CHI",
    conference: "East",
    heightInches: 72,
    birthDateUtc: "2000-06-15T00:00:00Z",
    draft: { kind: "drafted", year: 2020, overallPick: 4 },
    country: "United States",
    college: "Example U",
    positionPrimary: "G",
    positionAlternates: [],
    ...overrides,
  };
}

test("clues use inclusive numeric partial boundaries and distinguish misses", () => {
  const target = player();
  assert.equal(evaluateHeight(player({ heightInches: 74 }), target), "partial");
  assert.equal(evaluateHeight(player({ heightInches: 75 }), target), "miss");
  assert.equal(
    evaluateDraftYear(player({ draft: { kind: "drafted", year: 2018, overallPick: 9 } }), target),
    "partial",
  );
  assert.equal(
    evaluateDraftYear(player({ draft: { kind: "drafted", year: 2017, overallPick: 9 } }), target),
    "miss",
  );
  assert.equal(
    evaluateDraftPick(player({ draft: { kind: "drafted", year: 2020, overallPick: 7 } }), target),
    "partial",
  );
  assert.equal(
    evaluateDraftPick(player({ draft: { kind: "drafted", year: 2020, overallPick: 8 } }), target),
    "miss",
  );
});

test("undrafted players only match other undrafted players", () => {
  const undrafted = player({ draft: { kind: "undrafted" } });
  const drafted = player({ draft: { kind: "drafted", year: 2020, overallPick: 4 } });
  assert.equal(evaluateDraftYear(undrafted, undrafted), "exact");
  assert.equal(evaluateDraftPick(undrafted, undrafted), "exact");
  assert.equal(evaluateDraftYear(undrafted, drafted), "miss");
  assert.equal(evaluateDraftPick(drafted, undrafted), "miss");
});

test("position roles are order-independent sets with normalized display", () => {
  const guardForward = player({ positionPrimary: "G", positionAlternates: ["F"] });
  const forward = player({ positionPrimary: "F", positionAlternates: [] });
  const guard = player({ positionPrimary: "G", positionAlternates: [] });
  const centerForward = player({ positionPrimary: "C", positionAlternates: ["F"] });
  const forwardCenter = player({ positionPrimary: "F", positionAlternates: ["C"] });
  assert.equal(evaluatePosition(guardForward, forward), "partial");
  assert.equal(evaluatePosition(forward, guardForward), "partial");
  assert.equal(evaluatePosition(guardForward, guard), "partial");
  assert.equal(evaluatePosition(centerForward, forwardCenter), "exact");

  const evaluation = evaluateGuess(centerForward, forwardCenter, "2026-06-15");
  const position = evaluation.cells.find((cell) => cell.clueId === "position");
  assert.equal(position?.displayValue, "F/C");
  assert.equal(position?.match, "exact");
});

test("age is derived from the supplied UTC puzzle date at the birthday edge", () => {
  assert.equal(ageOnPuzzleDate("2000-06-15T00:00:00Z", "2026-06-14"), 25);
  assert.equal(ageOnPuzzleDate("2000-06-15T00:00:00Z", "2026-06-15"), 26);
  const target = player({ birthDateUtc: "2000-06-15T00:00:00Z" });
  assert.equal(
    evaluateAge(player({ birthDateUtc: "2002-06-15T00:00:00Z" }), target, "2026-06-15"),
    "partial",
  );
  assert.equal(
    evaluateAge(player({ birthDateUtc: "2003-06-15T00:00:00Z" }), target, "2026-06-15"),
    "miss",
  );
});

test("a guess produces the configured clue cells in the declared order", () => {
  const evaluation = evaluateGuess(player(), player(), "2026-06-15");
  assert.deepEqual(
    evaluation.cells.map((cell) => cell.clueId),
    CLUE_DEFINITIONS.map((definition) => definition.id),
  );
  assert.ok(evaluation.cells.every((cell) => cell.match === "exact"));
});
