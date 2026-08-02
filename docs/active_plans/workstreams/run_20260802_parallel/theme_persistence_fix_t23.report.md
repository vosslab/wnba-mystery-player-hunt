# Theme persistence recovery fix

## Result

`loadSaveData` now treats an absent, invalid, or unknown `themePreference` as
`"system"`. It continues to reject malformed puzzle or statistics data, so the
existing recovery boundary for actual game-state corruption is unchanged.

The regression fixture includes a valid in-progress puzzle and nonzero
statistics with an unsupported theme (`"sepia"`). Loading preserves both
records and normalizes only the preference.

## Validation

- `node --import tsx --test tests/test_save_load.mjs` - 5 passing tests.
- `npx tsc --noEmit -p tsconfig.json` - passed.
- `npx prettier --check src/save_load.ts tests/test_save_load.mjs` - passed.
- `git diff --check` - passed.
