# Game state completion report

## Outcome

Added `src/game_state.ts` as the single pure owner of daily-puzzle reconciliation, guess
submission, completion, and its statistics transition.

- `createTodayPuzzle` derives and records the deterministic target from the injected snapshot and
  UTC date.
- `reconcileTodayPuzzle` creates a missing puzzle, retains a valid one, and replaces a stale-date
  or missing-target puzzle without changing statistics.
- `submitGuess` rejects missing, completed, duplicate, and out-of-snapshot guesses with typed,
  user-actionable reasons. A duplicate is checked before roster lookup or clue evaluation.
- Accepted guesses append the evaluated row. An exact target completes a win; the last allowed
  incorrect guess completes a loss.
- `completePuzzle` is idempotent for a missing or already-completed puzzle and delegates the
  date-keyed statistic update to `applyPuzzleCompletion`, preventing a reload or replay recount.
- The caller must explicitly supply an integer guess limit from five through seven; this module
  has no clock, random source, DOM, or storage dependency.

## Validation

```text
npx tsc --noEmit -p tsconfig.json
exit 0, zero diagnostics

npx prettier --check src/game_state.ts
exit 0, All matched files use Prettier code style!

npx tsx --eval '<game state smoke>'
exit 0, game state smoke passed

npx tsx --eval '<loss, recovery, and limit smoke>'
exit 0, loss, recovery, and limit smoke passed

git diff --check
exit 0, no output
```

The two focused smoke checks covered first accepted guess, duplicate rejection without an
attempt, win and replay idempotency, stale-date recovery, invalid player rejection, final-guess
loss, missing-target recovery, and the five-through-seven limit boundary.

## Handoff

`submitGuess` returns the next complete `SaveDataV1` for the interaction layer to persist. The
result and share layers read the completed puzzle state; they do not create completion state.
