# Gameplay unit-test review

## Decision: ACCEPT

The Node unit-test slice concentrates on durable game behavior that would materially harm play if
it regressed:

- the nine visible clue categories, numeric feedback boundaries, undrafted handling, position
  overlap, and UTC puzzle-date age;
- deterministic daily selection with a no-repeat roster cycle and invalid-date rejection;
- recovery from bad or unavailable browser storage, valid save round-trip, streak and loss
  handling, winning distribution, and date-keyed completion idempotency;
- accent/punctuation-insensitive search, two-character activation, ranking, and exclusion of
  prior guesses;
- accepted, duplicate, win, loss, stale-date, missing-target, and lowered-limit game-state
  outcomes.

The lowered-limit test is especially valuable. It uses ordinary public game-state operations to
model a saved seven-guess game whose setting changes to five, then proves the next distinct wrong
guess finishes the puzzle exactly once. That protects a realistic configuration-change bug without
pinning a default value or internal algorithm.

The tests use inline deterministic fixtures and injected dates/stores. They make no network,
browser, clock, sleep, external-data, or mock-heavy assertions. The few exact values are the
player-visible result of a specified rule (for example, feedback at a tolerance boundary or a
completed game's statistics), rather than incidental object-key, collection-size, implementation,
or rendering checks.

One non-blocking maintenance observation: two game-state tests use reference equality to express
an unchanged save. That matches the documented pure-state contract today. If the implementation
later adopts equivalent immutable copies, those assertions should be changed to behavioral state
preservation rather than preserving object identity; no change is warranted now.

## Validation

```text
node --import tsx --test 'tests/test_*.mjs'
exit 0: 17 passed, 0 failed

./check_codebase.sh
exit 0: typecheck, lint, format, and Node unit-test gates all passed

git diff --check
exit 0, no output
```
