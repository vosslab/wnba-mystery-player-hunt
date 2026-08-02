# Theme persistence review

## NEEDS_FIX

The one-key persistence path is correctly wired: `SAVE_STORAGE_KEY` is the sole
application storage key, controls restore the saved `system`/`light`/`dark`
preference at boot, and a theme change updates and saves the same `SaveDataV1`
record used for puzzle progress and statistics. A legacy valid v1 record that
omits `themePreference` is also parsed as `system` without changing its parsed
puzzle or statistics.

However, an otherwise-valid save with an invalid theme value causes
`parseSaveData()` to reject the *entire* record. `loadSaveData()` then returns a
fresh save, losing an in-progress puzzle and all statistics. A display-preference
corruption must not erase gameplay progress. Normalize an invalid or missing
theme to `system` while retaining a valid puzzle/statistics payload; retain the
fresh-save path for malformed gameplay/statistics data.

## Verification

- `npx tsc --noEmit -p tsconfig.json` - passed.
- `node --import tsx --test tests/test_save_load.mjs` - 5 passed.
- Repository search found no second application storage key or session storage
  use. `save_load.ts` alone reads/writes `wnba-20-questions-save-v1`.
- `git diff --check` - passed.

The focused test currently asserts only a zero-statistics invalid-theme fixture,
so it does not detect the progress-loss case above.
