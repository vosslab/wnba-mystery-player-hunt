# Statistics completion identity contract

## Outcome

`GameStatistics` now carries the smallest durable completion marker:
`lastCompletedPuzzleDateUtc: string | null`. It is the UTC daily completion identity that
prevents a persisted puzzle from incrementing its counters more than once.

Fresh statistics must set `lastCompletedPuzzleDateUtc` to `null`. The save loader must treat a
missing field in an older persisted record as the legacy/fresh case (`null`) before returning a
`GameStatistics` value; this contract change intentionally does not prescribe that loader code.

No speculative metadata or persistence/gameplay implementation changed in this task.

## Validation

```text
npx tsc --noEmit -p tsconfig.json
exit 2: expected downstream coordination errors in src/save_load.ts at the parse and fresh-state
constructors, both missing the newly required lastCompletedPuzzleDateUtc field.

npx prettier --check src/types/save.ts
exit 0, All matched files use Prettier code style!

git diff --check
exit 0, no output
```

## Handoff

The persistence owner must add `lastCompletedPuzzleDateUtc: null` to fresh statistics and migrate
missing legacy serialized values to `null` during load. Once that owner lands the matching
implementation, the TypeScript gate should return cleanly.
