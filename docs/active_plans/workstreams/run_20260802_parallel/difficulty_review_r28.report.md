# Difficulty probe independent review

## Verdict

**NEEDS_FIX.** The probe is correctly offline, deterministic, and appropriately
honest about the 16-player development fixture. Its candidate-update algorithm,
however, does not remove a player after that player has been guessed and shown
not to be the answer. That can make the baseline and the weak lowest-ID
sensitivity solver repeat an already rejected player when future official data
contains two players with identical nine-cell feedback profiles. The game knows
the selected player identity, so the solver must use that information as well as
the feedback cells.

## Required correction

After a non-winning guess, remove the guessed `playerId` from the next candidate
set in addition to retaining players with the observed complete feedback
signature. Keep the current deterministic `playerId` tie-break. This is a
correctness fix, not a request for arrows, a different clue set, or a target
success-rate threshold.

The expected-remaining calculation may continue to rank the current candidates
as it does today: the successful all-exact outcome contributes the same constant
at a particular decision point. The important missing state is excluding an
identity already disproved by the game.

## Accepted evidence

- The tool reads one static JSON snapshot with `readFile`, runs the existing
  validator and clue engine, and contains no browser APIs, HTTP client, fetch,
  or Python acquisition invocation.
- Two `--json` executions produced byte-identical output. The checked-in
  development snapshot reports itself as `development/development`, has 16
  players, and the report clearly says it is not a cutoff decision or release
  calibration.
- The information-gain baseline uses all nine feedback cells, a uniform answer
  set, expected posterior size, and an ascending-`playerId` tie-break. The
  lowest-ID solver is deliberately a weaker context measurement, not a product
  policy.
- The report keeps the fun conclusion proportionate: retain six guesses for
  development and defer the real decision to the official Python-generated
  roster plus human playtesting.

## Validation

```text
node --import tsx tools/simulate_difficulty.mjs --json (twice)
byte-identical output; exit 0

npx eslint tools/simulate_difficulty.mjs
exit 0

npx tsc --noEmit -p tsconfig.json
exit 0

git diff --check
exit 0
```

`npx prettier --check` reports the prose report needs formatting. Format
`docs/active_plans/reports/difficulty_and_fun.md` while making the correctness
fix.
