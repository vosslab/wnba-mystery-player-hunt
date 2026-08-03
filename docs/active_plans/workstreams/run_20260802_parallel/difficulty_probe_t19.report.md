# Difficulty probe workstream

## Outcome

Added `tools/simulate_difficulty.mjs`, an offline deterministic analysis utility for a static
roster snapshot. It imports the production snapshot validator and clue engine, so it measures the
same feedback rules the game presents without acquiring data or connecting a browser.

The report in [difficulty_and_fun.md](../../reports/difficulty_and_fun.md) records 5/6/7 baseline
solve distributions, loss rates, a lowest-ID sensitivity pass, and single-clue discrimination.
It labels the 16-player prototype-roster results as provisional and retains six guesses pending
the official Python-generated roster.

## Verification

- `node --import tsx tools/simulate_difficulty.mjs` completed with deterministic output.
- `npx eslint --max-warnings 0 tools/simulate_difficulty.mjs` passed.
- `npx prettier --check tools/simulate_difficulty.mjs` passed.
- `git diff --check` passed.
