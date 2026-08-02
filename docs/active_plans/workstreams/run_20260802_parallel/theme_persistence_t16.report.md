# Theme persistence slice

## Outcome

`SaveDataV1` now carries a `themePreference` of `system`, `light`, or `dark` under
the existing `wnba-20-questions-save-v1` record. The browser integration restores
that preference at boot and writes an explicit change through the same save path as
puzzle progress and statistics; it does not create a second storage key.

Older valid version-1 records without `themePreference` migrate in memory to
`system` while retaining their puzzle and statistics. Invalid theme values recover
through the established fresh-save path.

## Focused verification

- `npx tsc --noEmit -p tsconfig.json` - passed.
- `node --import tsx --test tests/test_save_load.mjs` - 5 passed.
- `npx prettier --check src/types/save.ts src/save_load.ts src/interaction.ts tests/test_save_load.mjs` - passed.
- `git diff --check` - passed.
