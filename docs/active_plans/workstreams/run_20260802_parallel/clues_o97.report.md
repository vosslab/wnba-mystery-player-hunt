# Clue engine handoff

## Result

Implemented `src/clue_engine.ts` as a pure nine-clue evaluator. `evaluateGuess` derives its
ordered output directly from `CLUE_DEFINITIONS`; it does not duplicate the clue list or encode
arrows.

## Behavior covered

- Exact-only: team, conference, country, and college.
- Partial boundaries: height within two inches, draft year within two years, draft pick within
  three picks, and age within two years.
- Drafted and undrafted values only match each other when both are undrafted.
- Position partial matching uses symmetric overlap across primary and alternate position sets.
- Age is derived from the injected UTC puzzle date, including the birthday boundary, and rejects
  malformed or future calendar dates without consulting the current clock.
- Display values are grid-ready, including feet/inches, `Undrafted`, pick numbers, and concise
  position sets.

## Validation

- `node --import tsx _temp_clue_smoke.ts` - exit 0; exercised tolerance boundaries, undrafted
  handling, symmetric position overlap, birthday behavior, and nine-cell ordered output.
- `npx prettier --check src/clue_engine.ts` - exit 0: `All matched files use Prettier code style!`
- `npx tsc --noEmit -p tsconfig.json` - exit 0 with zero diagnostics.
- `git diff --check` - exit 0.

The temporary smoke file was removed after the run. No commit was created.
