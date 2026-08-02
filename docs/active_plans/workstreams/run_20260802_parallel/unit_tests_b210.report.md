# Gameplay unit-test handoff

## Outcome

Added durable Node behavior tests for the pure gameplay modules:

- clue feedback boundaries, undrafted status, symmetric positions, UTC birthday age, and the
  public nine-clue grid;
- deterministic daily selection, one complete no-repeat cycle, and invalid-date rejection;
- save recovery from malformed, unknown-version, incomplete, and unavailable storage; save
  round-trip; streak, loss, maximum-streak, distribution, and same-date idempotency behavior;
- search normalization, two-character activation, prefix ranking, and guessed-player exclusion;
- game-state accepted, duplicate, immediate-win, final-loss, replay-idempotency, stale-date, and
  missing-target behavior.

The fixtures inject roster data, dates, and stores. They use no network, clock, sleep, browser,
or implementation-detail assertions.

## Validation

```text
node --import tsx --test 'tests/test_*.mjs'
exit 0: 16 passed, 0 failed

git diff --check
exit 0, no output
```

`./check_codebase.sh` reached the lint phase but currently fails on concurrent production lint
findings outside this test-only scope: one unnecessary escape in `src/clue_engine.ts` and two
unsafe assignments in `src/types/player.ts`. The test suite itself ran in the same command path
only after those source findings are repaired.

## Handoff

No production files were changed. The suite is ready for the source-lint repair and the final
fast gate.
