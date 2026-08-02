# Core lint fix

## Scope

- `src/clue_engine.ts`
- `src/types/player.ts`

## Changes

- Removed the unnecessary escape from the height display string. The rendered value remains, for
  example, `6'2"`.
- Added an explicit two-element `unknown` tuple guard before reading the official snapshot seasons.
  This preserves the existing validation behavior while keeping untrusted JSON values narrowed as
  `unknown`, rather than accepting `Array.isArray`'s `any[]` element type.

## Validation

- `npx tsc --noEmit -p tsconfig.json` - passed.
- `npx eslint --max-warnings 0 src/clue_engine.ts src/types/player.ts` - passed.
- `node --import tsx --test tests/test_clue_engine.mjs` - 5 passed, 0 failed.
- `npx prettier --check src/clue_engine.ts src/types/player.ts` - passed.
- `git diff --check` - passed.
- `./check_codebase.sh` - subsequently stopped at a concurrent, unrelated error in
  `src/game_state.ts(117,7)`: `activeSaveData.puzzle.guesses.length` is possibly `undefined`.
  The targeted compiler command above passed before that parallel change appeared.

## Handoff

DONE. The requested three production ESLint errors are resolved without changing game or snapshot
contracts.
