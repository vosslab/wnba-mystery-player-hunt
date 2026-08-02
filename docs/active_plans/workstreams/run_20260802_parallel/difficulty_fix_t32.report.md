# Difficulty solver identity-elimination fix

## Outcome

Fixed the candidate update after a non-winning solver guess. Both the
information-gain baseline and lowest-`playerId` sensitivity solver now exclude
the exact guessed `playerId`, then apply the nine-clue feedback signature.
They therefore cannot repeat a guess when two different players share all
observable clue values.

`tools/simulate_difficulty.mjs` now runs a deterministic self-check on every
invocation. It creates an identical-profile pair from the static fixture,
guesses one identity while the other is the target, and verifies that only the
unguessed identity remains.

## Validation

Ran the offline tool twice and compared its text outputs byte-for-byte:

```sh
node --import tsx tools/simulate_difficulty.mjs
node --import tsx tools/simulate_difficulty.mjs
cmp /private/tmp/wnba_difficulty_run_1.txt /private/tmp/wnba_difficulty_run_2.txt
npx prettier --check tools/simulate_difficulty.mjs docs/active_plans/reports/difficulty_and_fun.md
npx tsc --noEmit -p tsconfig.json
git diff --check
```

All commands passed. The development-fixture numeric results did not change:
all 16 fixture targets are solved within five guesses by both solvers. This is
still provisional offline development evidence only; it neither selects the
200/300 fantasy-point cutoff nor calibrates release difficulty.
