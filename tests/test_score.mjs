import assert from "node:assert/strict";
import test from "node:test";

import {
  MAXIMUM_ROUND_SCORE,
  MINIMUM_WIN_SCORE,
  scoreAvailableAfter,
  scoreForWin,
} from "../src/score.ts";

test("round score starts at 100 and falls ten points for each extra guess", () => {
  assert.deepEqual(
    [scoreForWin(1), scoreForWin(5), scoreForWin(9)],
    [MAXIMUM_ROUND_SCORE, 60, MINIMUM_WIN_SCORE],
  );
});

test("the live score previews the value of solving on the next guess", () => {
  assert.deepEqual(
    [scoreAvailableAfter(0), scoreAvailableAfter(1), scoreAvailableAfter(8)],
    [100, 90, 20],
  );
});

test("score input validation rejects impossible attempt counts", () => {
  assert.throws(() => scoreForWin(0));
  assert.throws(() => scoreAvailableAfter(-1));
});
