# Difficulty solver repeat-guess re-review

## Verdict

**ACCEPT.** The correction removes the exact rejected `playerId` before it
retains candidates with the observed nine-clue feedback signature. Both
strategies share that update through `playOne()` and `remainingCandidates()`,
so neither can choose an already rejected identity when two distinct players
have identical observable clue values.

The deterministic self-check builds exactly that case: it gives a copied player
a different identity and name, makes the original the rejected guess, and
asserts that the copied identity alone remains. The regular run reports the
self-check as passed.

## Scope checks

- The tool remains deterministic, static, and offline: it reads a supplied
  snapshot with `readFile`, validates it locally, and contains no browser or
  network acquisition path.
- The development report remains proportionate: the 16-player fixture supports
  keeping six guesses during development, not choosing the 200/300 fantasy
  cutoff or declaring release difficulty calibrated.
- The information-gain and lowest-ID strategies retain their deterministic
  ascending-`playerId` behavior. The identity-elimination rule is shared rather
  than duplicated between them.

## Validation

```text
node --import tsx tools/simulate_difficulty.mjs
exit 0; reports "Identity-elimination self-check: passed"

node --import tsx tools/simulate_difficulty.mjs --json (twice)
cmp /private/tmp/wnba_difficulty_r35_1.json /private/tmp/wnba_difficulty_r35_2.json
both runs and comparison exit 0; byte-identical output

npx eslint tools/simulate_difficulty.mjs
npx prettier --check tools/simulate_difficulty.mjs docs/active_plans/reports/difficulty_and_fun.md
npx tsc --noEmit -p tsconfig.json
git diff --check
all exit 0
```
