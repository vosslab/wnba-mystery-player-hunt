# Refresh WNBA roster data

This is an optional, two-stage, Python-only maintenance workflow. It validates saved official
Stats responses, then creates a static, game-safe roster snapshot. The browser, Playwright, and
the released game never contact WNBA endpoints; they use the bundled snapshot only. A snapshot
may be months old and the game remains playable; only its schema and selection invariants matter
to the game.

## Choose an input mode

Use a saved-export manifest containing Python-produced official responses. This is the repeatable
route for review and recovery. The manifest and every referenced response remain below ignored
`data/private/official_exports/`. Its required structure is documented in
[python_candidate_pipeline.md](active_plans/reports/python_candidate_pipeline.md).

```bash
source source_me.sh && python3 tools/fetch_wnba_candidates.py \
  --input-manifest data/private/official_exports/manifest.json \
  --output data/private/wnba_candidates.json
```

The first-stage command must finish with a saved candidate count. It requires one nonempty
current-roster response for every official team, one player page for every rostered player, and
2026 plus 2025 traditional totals. A numeric `NBA_FANTASY_PTS` value of zero is valid. A missing
player or missing/non-numeric fantasy-points field stops the run; it is never silently treated as
zero.

## Build a review snapshot

The second command is offline. It admits only players already present in the complete current
roster data, then applies `max(2026 NBA_FANTASY_PTS, 2025 NBA_FANTASY_PTS) >= cutoff`. The cutoff
is a product choice still awaiting approval. Run the approved option explicitly; neither option is
a default.

```bash
source source_me.sh && python3 tools/build_roster_file.py \
  --input data/private/wnba_candidates.json \
  --cutoff 200 \
  --output data_review/wnba_roster_review_fp200.json
```

```bash
source source_me.sh && python3 tools/build_roster_file.py \
  --input data/private/wnba_candidates.json \
  --cutoff 300 \
  --output data_review/wnba_roster_review_fp300.json
```

Review the selected-pool count and preceding-season additions printed by the command. The review
outputs retain no fantasy points, minutes, or other performance stats. They are static
`RosterSnapshotV1` files containing only the game allowlist. Do not replace `src/data/roster.json`
until the official candidate refresh, cutoff decision, generated snapshot, and game-import
validation have all been explicitly verified.

## Recover from data failures

- Missing or duplicate team rosters mean the export set is incomplete. Produce a new saved
  official export set in Python, then run the first stage again. Do not gather responses through
  the browser or Playwright.
- A rostered player missing a 2026 or 2025 total needs the matching complete traditional-totals
  export. Preserve an explicit zero; repair an absent record instead of inventing one.
- A missing player page or required biography field needs that player's official page export.
  The tool names the player and field so the manifest can be corrected.
- An unknown country or team code in stage two needs a reviewed correction in the maintained
  `data_review/` CSV mapping, followed by another stage-two run. An eligibility override can only
  document a roster-source team-code correction; it cannot add, remove, or rank a player.

## Repeat a refresh

Keep the old ignored candidate file until the new run is accepted. Each successful stage writes a
complete replacement through a temporary sibling file, so an interrupted write does not publish a
partial JSON file. After replacing the saved exports, rerun stage one and then both review outputs
above to compare the 200 and 300 pools. Re-run the focused Python tests before promoting a
verified snapshot:

```bash
source source_me.sh && python3 -m pytest \
  tests/test_fetch_wnba_candidates.py tests/test_build_roster_file.py
```

An incomplete official refresh does not prevent the existing static game snapshot from building or
playing. For the private-file schema and public normalization contract, see
[python_candidate_pipeline.md](active_plans/reports/python_candidate_pipeline.md) and
[python_roster_generation.md](active_plans/reports/python_roster_generation.md).
