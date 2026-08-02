# Search index handoff

## Outcome

Added `src/search_index.ts`, a pure player-search module with no DOM, event,
game-state, or data-loading dependencies.

- `buildPlayerSearchIndex(players)` precomputes normalized display and search
  names, and rejects duplicate player IDs.
- `queryPlayerSearch(index, input, excludedPlayerIds)` returns an immutable
  result list with `playerId`, `displayName`, `team`, and `position`.
- Normalization removes Unicode combining diacritics and punctuation, folds
  case, and normalizes whitespace without changing any display value.
- A two-normalized-character threshold returns no suggestions below the
  minimum. Whole-name prefixes rank first, then token prefixes, then
  substrings, with display name and player ID as deterministic tie-breaks.
- Guessed IDs are excluded before ranking, so the interaction layer can avoid
  offering duplicate guesses.

## Verification

- `npx prettier --write src/search_index.ts` exited 0 with
  `src/search_index.ts 32ms (unchanged)`.
- Focused smoke command exited 0 with
  `search smoke: normalization, threshold, no-results, ranking, exclusion passed`.
- `git diff --check -- src/search_index.ts` exited 0 with no output.
- `npx tsc --noEmit -p tsconfig.json` was attempted after this module compiled
  earlier in the lane, but the shared worktree had concurrent errors in
  `src/save_load.ts`: its `GameStatistics` object literals lacked
  `lastCompletedPuzzleDateUtc`. This is outside the owned search module and
  needs the save-state lane to settle before the repository-wide type check is
  rerun.

## Files

- `src/search_index.ts` - pure search-index construction, normalization,
  deterministic query ranking, and duplicate exclusion.
- `docs/active_plans/workstreams/run_20260802_parallel/search_q19.report.md`
  - this handoff and verification record.
