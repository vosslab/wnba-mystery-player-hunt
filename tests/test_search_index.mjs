import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPlayerSearchIndex,
  normalizeSearchText,
  queryPlayerSearch,
} from "../src/search_index.ts";

function player(playerId, displayName, searchName = displayName, teamCode = "CHI") {
  return {
    playerId,
    displayName,
    searchName,
    teamCode,
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

test("search normalizes accents, punctuation, and case without changing display names", () => {
  const index = buildPlayerSearchIndex([
    player("1", "A'ja Wilson", "aja wilson"),
    player("2", "Brittney Griner"),
  ]);
  assert.equal(normalizeSearchText("  A'JÁ—WILSON  "), "ajawilson");
  assert.deepEqual(
    queryPlayerSearch(index, "AJ").map((result) => result.displayName),
    ["A'ja Wilson"],
  );
  assert.deepEqual(
    queryPlayerSearch(index, "gr").map((result) => result.displayName),
    ["Brittney Griner"],
  );
});

test("search waits for two normalized characters, ranks natural prefixes, and excludes guesses", () => {
  const aja = player("1", "Aja Wilson");
  const willa = player("2", "Willa Smith");
  const index = buildPlayerSearchIndex([willa, aja]);
  assert.deepEqual(queryPlayerSearch(index, "a"), []);
  assert.deepEqual(
    queryPlayerSearch(index, "aj").map((result) => result.playerId),
    ["1"],
  );
  assert.deepEqual(
    queryPlayerSearch(index, "wi").map((result) => result.playerId),
    ["2", "1"],
  );
  assert.deepEqual(
    queryPlayerSearch(index, "wi", new Set(["1"])).map((result) => result.playerId),
    ["2"],
  );
});

test("searching a team code returns that roster alphabetically and respects exclusions", () => {
  const kayla = player("1", "Kayla Thornton", undefined, "GSV");
  const tiffany = player("2", "Tiffany Hayes", undefined, "GSV");
  const aja = player("3", "Aja Wilson", undefined, "LVA");
  const index = buildPlayerSearchIndex([tiffany, aja, kayla]);

  assert.deepEqual(
    queryPlayerSearch(index, "GSV").map((result) => result.displayName),
    ["Kayla Thornton", "Tiffany Hayes"],
  );
  assert.deepEqual(
    queryPlayerSearch(index, "gs", new Set(["1"])).map((result) => result.displayName),
    ["Tiffany Hayes"],
  );
});
