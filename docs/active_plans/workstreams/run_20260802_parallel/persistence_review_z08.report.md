# Persistence and statistics review

## Verdict

**NEEDS_FIX.** Two narrow persistence contracts would otherwise lose a player's saved
statistics or use a different persistent namespace than the approved game.

## High-impact findings

1. **Legacy saves with the newly added completion field absent are reset instead of
   migrated.** `parseGameStatistics` destructures the absent value as `undefined`, then
   rejects it because it is neither `null` nor a UTC date (`src/save_load.ts:144-160`).
   `loadSaveData` consequently returns a completely fresh save (`src/save_load.ts:229-236`).
   This contradicts the added-field contract: an older valid record must retain its counters
   and receive `lastCompletedPuzzleDateUtc: null`. A focused smoke with an otherwise valid
   four-game legacy record produced zero games played. Normalize only an absent field to
   `null`; keep malformed present values as recovery-to-fresh.

2. **The actual storage key does not match the approved plan contract.** The implementation
   uses `wnba-pickle-save-v1` (`src/constants.ts:6`), while WP-3.6 specifies the single key
   `wnba-20-questions-save-v1` (`docs/active_plans/wnba_game-plan.md:1016-1019`). Choose the
   approved key or explicitly revise the plan before integrating browser storage. This matters
   because the key is the only durable namespace for progress and statistics.

## Accepted behavior

- Storage is injected; neither persistence nor statistics reads DOM, clock, network, or
  gameplay state.
- Malformed JSON, an unknown version, and thrown reads produce a usable fresh V1 state;
  thrown writes return `false` without crashing.
- A valid current save round-trips through the injected store.
- Fresh statistics use a null completion identity. Reapplying the same dated completion
  returns the unchanged statistics object, which makes a persisted reload idempotent once the
  completion coordinator writes it.
- Wins on consecutive UTC dates extend the streak, a date gap starts at one, losses reset the
  current streak, maximum streak does not fall, and only wins increment the distribution.
  Distribution creation follows the injected guess limit rather than a literal.

## Validation

```text
npx tsc --noEmit -p tsconfig.json
exit 0, no diagnostics

npx tsx --eval '<malformed, unknown-version, read-throw, write-throw recovery smoke>'
exit 0: recovery smoke OK

npx tsx --eval '<legacy missing-field plus completion/idempotency smoke>'
exit 0: exposed the legacy migration failure; current-completion idempotency passed

npx prettier --check src/types/save.ts src/save_load.ts src/stats_state.ts src/constants.ts
exit 0, all matched files use Prettier code style

git diff --check
exit 0, no output
```

## Focused handoff

The persistence owner should make the two contract corrections above and add a behavior test
that loads an otherwise valid pre-field record and verifies preservation plus a `null` marker.
The existing pure statistics transition does not need a redesign.
