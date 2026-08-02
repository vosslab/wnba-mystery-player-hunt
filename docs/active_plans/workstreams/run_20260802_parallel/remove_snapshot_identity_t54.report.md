# Snapshot-identity removal report

## Outcome

Removed `snapshotId` from the public roster envelope, daily puzzle state, persisted saves, and
daily selection. The game now selects deterministically from the player-ID pool and UTC date;
changing provenance text or the roster file's as-of date does not change the daily target.

`schemaVersion`, `asOfDateUtc`, `dataKind`, `dataStatus`, and `selectionRule` remain validation
and provenance fields only. No game-side age display, freshness check, refresh history, file
identity, or activation tracking was added.

## Compatibility

The save parser continues to accept existing save objects with extra keys. A behavioral test
proves that a legacy stored `snapshotId` is ignored while the saved date, target, status, and
evaluated guesses are retained.

## Validation

- `npx tsc --noEmit` - passed.
- `npx tsx --test tests/test_daily_puzzle.mjs tests/test_game_state.mjs tests/test_save_load.mjs`
  - 13 passed.
- `source source_me.sh && python3 -m pytest tests/test_build_roster_file.py` - 5 passed.
