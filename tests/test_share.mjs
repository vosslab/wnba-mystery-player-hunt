import assert from "node:assert/strict";
import test from "node:test";

import { formatShareText } from "../src/share.ts";

test("share rows use the visible clue order even for older saved cell order", () => {
  const cells = [
    { clueId: "conference", displayValue: "West", match: "exact" },
    { clueId: "team", displayValue: "PHX", match: "partial" },
    { clueId: "position", displayValue: "F", match: "miss" },
    { clueId: "country", displayValue: "USA", match: "miss" },
    { clueId: "draft-year", displayValue: "2020", match: "miss" },
    { clueId: "draft-pick", displayValue: "#5", match: "miss" },
    { clueId: "college", displayValue: "Maryland", match: "miss" },
    { clueId: "height", displayValue: "6'2\"", match: "miss" },
    { clueId: "age", displayValue: "30", match: "miss" },
  ];
  const puzzle = {
    puzzleDateUtc: "2026-08-03",
    targetPlayerId: "target",
    status: "won",
    guesses: [
      {
        guessedPlayerId: "guess",
        guessedDisplayName: "Example Player",
        cells: cells.toReversed(),
      },
    ],
  };

  const expectedRow = `\u{1F7E9}\u{1F7E8}${"\u{2B1B}".repeat(7)}`;
  assert.equal(
    formatShareText(puzzle, 9),
    `WNBA Mystery Player Hunt 2026-08-03 1/9 | 100 pts\n${expectedRow}`,
  );
});
