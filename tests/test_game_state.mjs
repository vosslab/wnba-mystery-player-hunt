import assert from "node:assert/strict";
import test from "node:test";

import { playerIdFromString } from "../src/brands.ts";
import { createFreshSaveData } from "../src/save_load.ts";
import { completePuzzle, reconcileTodayPuzzle, submitGuess } from "../src/game_state.ts";

function player(playerId) {
  return {
    playerId,
    displayName: `Player ${playerId}`,
    searchName: `player ${playerId}`,
    teamCode: "CHI",
    conference: "East",
    heightInches: 72,
    birthDateUtc: "2000-01-01T00:00:00Z",
    draft: { kind: "drafted", year: 2020, overallPick: Number(playerId) },
    country: "United States",
    college: "Example U",
    positionPrimary: "G",
    positionAlternates: [],
  };
}

function snapshot() {
  return {
    schemaVersion: 1,
    asOfDateUtc: "2026-01-01",
    dataKind: "development",
    dataStatus: "development",
    sourceNote: "test fixture",
    selectionRule: { kind: "development-fixture", description: "test fixture" },
    players: [
      player("1"),
      player("2"),
      player("3"),
      player("4"),
      player("5"),
      player("6"),
      player("7"),
      player("8"),
    ],
  };
}

function todaySave(roster, date = "2026-02-01") {
  return reconcileTodayPuzzle(createFreshSaveData(5), roster, date).saveData;
}

function nonTargetIds(saveData, roster) {
  return roster.players
    .filter((candidate) => candidate.playerId !== saveData.puzzle.targetPlayerId)
    .map((candidate) => candidate.playerId);
}

test("accepted guesses add one attempt, while duplicate guesses do not", () => {
  const roster = snapshot();
  const initial = todaySave(roster);
  const [firstGuess] = nonTargetIds(initial, roster);
  const accepted = submitGuess(initial, roster, playerIdFromString(firstGuess), 5);
  assert.equal(accepted.kind, "accepted");
  assert.equal(accepted.saveData.puzzle.guesses.length, 1);
  const duplicate = submitGuess(accepted.saveData, roster, playerIdFromString(firstGuess), 5);
  assert.equal(duplicate.kind, "rejected");
  assert.equal(duplicate.reason, "duplicate-guess");
  assert.equal(duplicate.saveData, accepted.saveData);
});

test("an exact target guess wins immediately and cannot recount after completion", () => {
  const roster = snapshot();
  const initial = todaySave(roster);
  const won = submitGuess(initial, roster, initial.puzzle.targetPlayerId, 5);
  assert.equal(won.kind, "accepted");
  assert.equal(won.completedStatus, "won");
  assert.equal(won.saveData.puzzle.status, "won");
  assert.equal(won.saveData.statistics.gamesPlayed, 1);
  const replay = completePuzzle(won.saveData, "won");
  assert.equal(replay, won.saveData);
  assert.equal(replay.statistics.gamesPlayed, 1);
});

test("the final distinct incorrect guess completes a loss", () => {
  const roster = snapshot();
  let saveData = todaySave(roster);
  for (const playerId of nonTargetIds(saveData, roster).slice(0, 5)) {
    const result = submitGuess(saveData, roster, playerIdFromString(playerId), 5);
    assert.equal(result.kind, "accepted");
    saveData = result.saveData;
  }
  assert.equal(saveData.puzzle.status, "lost");
  assert.equal(saveData.statistics.gamesPlayed, 1);
  assert.equal(saveData.statistics.gamesWon, 0);
});

test("a lowered guess limit completes an already over-limit active puzzle once", () => {
  const roster = snapshot();
  let saveData = todaySave(roster);
  const incorrectPlayerIds = nonTargetIds(saveData, roster);

  for (const playerId of incorrectPlayerIds.slice(0, 6)) {
    const result = submitGuess(saveData, roster, playerIdFromString(playerId), 7);
    assert.equal(result.kind, "accepted");
    saveData = result.saveData;
  }
  assert.equal(saveData.puzzle?.status, "active");

  const result = submitGuess(saveData, roster, playerIdFromString(incorrectPlayerIds[6]), 5);
  assert.equal(result.kind, "accepted");
  assert.equal(result.completedStatus, "lost");
  assert.equal(result.saveData.puzzle?.status, "lost");
  assert.equal(result.saveData.statistics.gamesPlayed, 1);
  assert.equal(completePuzzle(result.saveData, "lost").statistics.gamesPlayed, 1);
});

test("stale puzzles and missing targets reset play without recording a loss", () => {
  const roster = snapshot();
  const stale = todaySave(roster, "2026-02-01");
  const staleResult = reconcileTodayPuzzle(stale, roster, "2026-02-02");
  assert.equal(staleResult.reason, "stale-date");
  assert.equal(staleResult.saveData.statistics.gamesPlayed, 0);

  const missingTarget = {
    ...todaySave(roster),
    puzzle: { ...todaySave(roster).puzzle, targetPlayerId: playerIdFromString("999") },
  };
  const missingTargetResult = reconcileTodayPuzzle(missingTarget, roster, "2026-02-01");
  assert.equal(missingTargetResult.reason, "missing-target");
  assert.equal(missingTargetResult.saveData.statistics.gamesPlayed, 0);
});
