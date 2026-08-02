# Persistence and statistics handoff

## Outcome

- Added `src/save_load.ts`: injected-store loading and saving under the single
  `SAVE_STORAGE_KEY`, with a recursively narrowed JSON boundary.
- Malformed JSON, an unknown save version, missing data, and `KeyValueStore` exceptions all
  yield a fresh usable save instead of preventing boot. Failed writes return `false` for the
  caller to surface if appropriate.
- Added `src/stats_state.ts`: a pure completion transition with an explicit UTC date, outcome,
  and guess count. It records the completed date in statistics, so reapplying the same saved
  completion returns the same statistics object.
- Win streaks only extend on the preceding UTC day; a skipped day begins at one, losses reset
  the current streak, and maximum streak never falls. Guess distribution keys are created from
  the supplied guess limit and winning results add their actual guess count.

## Contract coordination

`GameStatistics.lastCompletedPuzzleDateUtc` was added by the manager's dedicated shared-contract
agent while this work was in progress. That durable field is necessary to make reload idempotency
real rather than an in-memory convention. This slice reads and writes it without changing the
shared type itself.

## Validation

```text
npx tsx _temp_persistence_smoke.ts
exit 0

npx tsc --noEmit -p tsconfig.json
exit 0, zero diagnostics

npx prettier --check src/save_load.ts src/stats_state.ts
exit 0, All matched files use Prettier code style!

git diff --check
exit 0, no output
```

The removed focused smoke covered malformed JSON, unknown versions, unavailable storage,
round-trip saving, configured distribution sizing, consecutive wins, a skipped day, a loss,
maximum streak preservation, and replay idempotency.

## Handoff

Ready for the completion coordinator to persist the returned statistics together with the puzzle
state. No DOM, data-fetching, or gameplay files were changed.
