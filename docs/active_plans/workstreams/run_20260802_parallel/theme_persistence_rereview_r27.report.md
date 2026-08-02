# Theme persistence recovery re-review (R27)

## Verdict: ACCEPT

`loadSaveData` now treats `themePreference` as independently recoverable: the
only accepted values are `system`, `light`, and `dark`; a missing or invalid
value becomes `system` while the already-validated puzzle and statistics are
returned unchanged. This preserves valid active or completed puzzle data and
nonzero statistics rather than replacing the whole save.

Puzzle and statistics validation remains all-or-nothing. A malformed puzzle
or statistics object causes `parseSaveData` to fail, and `loadSaveData`
returns a fresh save. That is the correct distinction between a harmless
presentation-preference defect and corrupt game progress.

Persistence continues to use the single `SAVE_STORAGE_KEY`
(`wnba-20-questions-save-v1`): both load and save call it, and no separate
theme-storage key exists. The interaction controller changes the theme in the
same save record and persists it through the same path.

Verification passed:

- `node --import tsx --test tests/test_save_load.mjs` - 5 passed, including
  invalid-theme preservation and legacy migration.
- `npx tsc --noEmit -p tsconfig.json` - passed.

