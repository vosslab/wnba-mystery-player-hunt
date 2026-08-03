import assert from "node:assert/strict";
import test from "node:test";

import { loadSaveData, saveSaveData } from "../src/save_load.ts";
import { applyPuzzleCompletion } from "../src/stats_state.ts";

function memoryStore(initial = null) {
  let value = initial;
  return {
    getItem() {
      return value;
    },
    setItem(_key, next) {
      value = next;
    },
    serialized() {
      return value;
    },
  };
}

test("loading recovers a usable fresh save from malformed, unknown, legacy, and broken storage", () => {
  for (const serialized of ["{", JSON.stringify({ version: 2 }), JSON.stringify({ version: 1 })]) {
    const save = loadSaveData(memoryStore(serialized), 4);
    assert.equal(save.version, 1);
    assert.equal(save.puzzle, null);
    assert.equal(save.statistics.gamesPlayed, 0);
  }
  const brokenStore = {
    getItem() {
      throw new Error("storage unavailable");
    },
    setItem() {},
  };
  assert.equal(loadSaveData(brokenStore).statistics.gamesPlayed, 0);
});

test("saving and loading preserve valid save data while failed writes remain nonfatal", () => {
  const store = memoryStore();
  const original = loadSaveData(store, 4);
  assert.equal(saveSaveData(store, original), true);
  assert.deepEqual(loadSaveData(store, 4), original);
  const brokenStore = {
    getItem() {
      return null;
    },
    setItem() {
      throw new Error("quota");
    },
  };
  assert.equal(saveSaveData(brokenStore, original), false);
});

test("presentation preferences round-trip and legacy v1 saves migrate safely", () => {
  const store = memoryStore();
  const original = loadSaveData(store, 4);
  const personalized = {
    ...original,
    themePreference: "dark",
    matchLabelsVisible: true,
    hasSeenHowToPlay: true,
  };
  assert.equal(saveSaveData(store, personalized), true);
  assert.deepEqual(loadSaveData(store, 4), personalized);

  const legacyStatistics = {
    gamesPlayed: 3,
    gamesWon: 2,
    currentStreak: 1,
    maximumStreak: 2,
    lastCompletedPuzzleDateUtc: "2026-03-05",
    guessDistribution: { 1: 0, 2: 1, 3: 1, 4: 0 },
  };
  const legacyStore = memoryStore(
    JSON.stringify({
      version: 1,
      puzzle: null,
      statistics: legacyStatistics,
    }),
  );
  const migrated = loadSaveData(legacyStore, 4);
  assert.equal(migrated.themePreference, "system");
  assert.equal(migrated.matchLabelsVisible, false);
  assert.equal(migrated.hasSeenHowToPlay, false);
  assert.deepEqual(migrated.statistics, legacyStatistics);
});

test("invalid presentation values normalize without discarding valid progress", () => {
  const puzzle = {
    puzzleDateUtc: "2026-03-06",
    snapshotId: "legacy-file-identity",
    targetPlayerId: "1628932",
    status: "active",
    guesses: [
      {
        guessedPlayerId: "1628933",
        guessedDisplayName: "Example Player",
        cells: [{ clueId: "team", displayValue: "Phoenix Mercury", match: "miss" }],
      },
    ],
  };
  const statistics = {
    gamesPlayed: 3,
    gamesWon: 2,
    currentStreak: 1,
    maximumStreak: 2,
    lastCompletedPuzzleDateUtc: "2026-03-05",
    guessDistribution: { 1: 0, 2: 1, 3: 1, 4: 0 },
  };
  const store = memoryStore(
    JSON.stringify({
      version: 1,
      puzzle,
      statistics,
      themePreference: "sepia",
      matchLabelsVisible: "yes",
      hasSeenHowToPlay: "yes",
    }),
  );
  const recovered = loadSaveData(store, 4);
  assert.equal(recovered.themePreference, "system");
  assert.equal(recovered.matchLabelsVisible, false);
  assert.equal(recovered.hasSeenHowToPlay, false);
  assert.deepEqual(recovered.puzzle, {
    puzzleDateUtc: "2026-03-06",
    targetPlayerId: "1628932",
    status: "active",
    guesses: puzzle.guesses,
  });
  assert.deepEqual(recovered.statistics, statistics);
});

test("statistics update streaks, losses, maximums, and winning distribution without recounting a completion", () => {
  const initial = loadSaveData(memoryStore(), 6).statistics;
  const first = applyPuzzleCompletion(initial, {
    puzzleDateUtc: "2026-03-01",
    outcome: "won",
    guessCount: 2,
  });
  const consecutive = applyPuzzleCompletion(first, {
    puzzleDateUtc: "2026-03-02",
    outcome: "won",
    guessCount: 3,
  });
  assert.equal(consecutive.currentStreak, 2);
  assert.equal(consecutive.maximumStreak, 2);
  assert.equal(consecutive.guessDistribution["2"], 1);
  const gap = applyPuzzleCompletion(consecutive, {
    puzzleDateUtc: "2026-03-04",
    outcome: "won",
    guessCount: 1,
  });
  assert.equal(gap.currentStreak, 1);
  assert.equal(gap.maximumStreak, 2);
  const loss = applyPuzzleCompletion(gap, {
    puzzleDateUtc: "2026-03-05",
    outcome: "lost",
    guessCount: 6,
  });
  assert.equal(loss.currentStreak, 0);
  const replay = applyPuzzleCompletion(loss, {
    puzzleDateUtc: "2026-03-05",
    outcome: "lost",
    guessCount: 6,
  });
  assert.equal(replay, loss);
  assert.equal(replay.gamesPlayed, 4);
});
