# Persistence fix re-review

## Verdict

**ACCEPT.** The two reported persistence defects are fixed without changing the
working recovery or completion behavior.

## Confirmed contract behavior

- An otherwise valid V1 save with `lastCompletedPuzzleDateUtc` absent retains its
  counters and distribution and receives a `null` completion marker. The loader
  normalizes only `undefined`; present values still go through the UTC-date
  validation.
- Present malformed completion markers recover to a fresh save. Malformed JSON,
  unknown versions, and thrown storage reads likewise recover; a thrown write
  returns `false` without throwing.
- `SAVE_STORAGE_KEY` is exactly `wnba-20-questions-save-v1`, the single key in
  WP-3.6, for both reads and writes.
- A normal save round-trips through an injected store. A repeated dated
  completion returns the same statistics object, so the existing idempotency
  behavior remains sound.

## Focused verification

```text
npx tsc --noEmit -p tsconfig.json
exit 0, no diagnostics

npx prettier --check src/save_load.ts src/constants.ts src/stats_state.ts src/types/save.ts tests/test_save_load.mjs
exit 0, all matched files use Prettier code style

node --import tsx --test tests/test_save_load.mjs
exit 0, 3 passed

npx tsx --eval '<legacy migration, malformed-present recovery, unknown-version and
store-exception recovery, exact-key write, roundtrip, and idempotency assertions>'
exit 0, persistence contract smoke OK

git diff --check
exit 0, no output
```

## Delivery note

The current committed test names the malformed truncated V1 object as
"legacy"; it does not itself assert the valid missing-field migration. The
focused smoke above verifies that contract now. Add that compact regression
case when the planned persistence behavior-test workstream owns its test file;
it is useful coverage, but it is not a reason to delay the correct production
fix.
