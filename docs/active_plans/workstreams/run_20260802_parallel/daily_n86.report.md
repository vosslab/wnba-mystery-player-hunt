# WP-4.1 daily selection handoff

## Result

Added `src/daily_puzzle.ts`, a pure deterministic daily selector, and one UTC epoch
constant in `src/constants.ts`.

- `puzzleNumberForUtcDate` accepts only real `YYYY-MM-DD` UTC dates on or after
  `DAILY_EPOCH_UTC`; callers inject the date, so it reads neither a clock nor browser state.
- `selectDailyPlayer` ranks the snapshot's unique player IDs with a specified 32-bit FNV-1a
  hash of the snapshot identity and player ID. The puzzle number indexes that fixed ordering,
  which gives one full no-repeat cycle for each unchanged snapshot.
- Empty and duplicate-player snapshots fail loudly rather than silently weakening the cycle
  guarantee. A snapshot refresh intentionally creates a different ordering.

## Validation

- `npx tsc --noEmit -p tsconfig.json` exited 0 with zero diagnostics.
- `npx prettier --check src/daily_puzzle.ts src/constants.ts` reported all matched files use
  Prettier code style.
- Focused `npx tsx --eval` cycle check reported `full fixture cycle: 16 unique players; stable
  same-date selection: Kelsey Plum`.
- Focused UTC-boundary check reported `UTC date rejection and epoch offsets passed.`
- `git diff --check` exited 0.
