# Lowered guess-limit regression test

## Outcome

Added one durable game-state behavior test. It starts an active puzzle with six
distinct incorrect guesses made under the seven-guess setting, then submits a
seventh distinct incorrect guess after the setting is lowered to five. The
puzzle becomes a loss and the completion count remains one when completion is
replayed.

The test uses public game-state operations and outcomes; it does not inspect
private implementation details or assert object-key/count shapes.

## Validation

```text
npx tsx --test tests/test_game_state.mjs
exit 0; 5 passed, 0 failed

node --import tsx --test 'tests/test_*.mjs'
exit 0; 17 passed, 0 failed

./check_codebase.sh
exit 0; 5 checks passed

git diff --check
exit 0; no output
```
