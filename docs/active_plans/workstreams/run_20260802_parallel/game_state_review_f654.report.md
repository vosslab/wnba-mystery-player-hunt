# Game state high-impact review

## Outcome: NEEDS_FIX

The normal active-game path is sound: a daily target is derived from the injected snapshot and
date; stale or missing-target puzzles replace only puzzle state; rejected submissions preserve
the save; accepted submissions append one evaluated row; an exact guess wins; the final normal
incorrect guess loses; and the single completion transition updates statistics idempotently.
The module has no clock, DOM, storage, or random dependency.

One correctness issue prevents acceptance:

1. **An existing active save can exceed the configured guess limit.** `submitGuess` completes a
   loss only when the appended count is exactly `guessLimit`. A player can retain an in-progress
   six-guess save when a later release calibrates the game down to five (the plan explicitly
   permits 5--7), then submit a distinct seventh guess. The result remains active at seven
   guesses. The same state can arise from a legacy save with more guesses than the current
   configuration. Change the comparison to `>= guessLimit` (or reject/reconcile an already
   over-limit active save before accepting) and add one behavior test covering an active save
   above the newly supplied limit. This preserves the no-extra-attempt rule through configuration
   changes.

The stored `snapshotId` is not currently compared during reconciliation. The plan says an
in-progress puzzle is bound to its originating snapshot, but its explicit reset rule only names
date change and a missing target. This does not block the core loop today; decide it deliberately
when wiring snapshot refreshes. If snapshots may change player clue data mid-day, reset on a
snapshot-ID mismatch or retain the originating snapshot for evaluation, rather than mixing saved
rows with new records.

## Validation

```text
npx tsc --noEmit -p tsconfig.json
exit 0, zero diagnostics

npx tsx --test tests/test_game_state.mjs
exit 0, 4 passed, 0 failed

npx tsx --eval '<configuration-change state smoke>'
exit 0, reproduced active/7 after a seven-guess save was submitted with guessLimit 5

git diff --check
exit 0, no output
```

The configuration-change smoke used a valid snapshot with eight players, first made six distinct
incorrect guesses at limit seven, then submitted the remaining distinct incorrect guess at limit
five. It returned `accepted` with `active/7`, confirming the comparison issue.
