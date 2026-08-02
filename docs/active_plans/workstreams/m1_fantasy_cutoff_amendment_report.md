# M1 fantasy cutoff amendment report

## Assumptions

- The current WNBA roster enumeration remains the authoritative eligibility source.
- The supplied WNBA traditional-stats route can be tested for current and preceding-season
  `NBA_FANTASY_PTS` coverage before the data pipeline is implemented.
- A reported zero is valid. An absent row or field is incomplete data and is not converted
  to zero.

## Decisions

- Recognizability uses `max(currentSeasonNBAFantasyPts, precedingSeasonNBAFantasyPts) >=
  approvedCutoff`, after the current-roster eligibility gate.
- WP-1.3 directly compares 200 and 300 points. The user-supplied 2026 current-season
  cross-checks are 131 players at 200 and 102 players at 300.
- The real pull reports how adding the preceding season expands each cutoff pool and names
  every player added by that union. The 75/100/125/150 comparison remains supporting context.
- Fantasy points remain in the gitignored candidate file only. They never ship in
  `src/data/roster.json` and never become a game clue.

## Concrete next steps

- WP-1.2 proves the traditional-stats route, its season parameter, embedded-data availability,
  and league-wide `NBA_FANTASY_PTS` coverage for both seasons.
- WP-1.2 reconciles its current-season counts with 131 at 200 and 102 at 300.
- WP-1.3 presents both direct cutoff pools, preceding-season additions, named boundaries, and
  supporting 75/100/125/150 context for user approval.
- WP-3.2 writes only approved players to the snapshot and removes fantasy-point fields first.

## Changed files

- `docs/active_plans/wnba_game-plan.md`
- `docs/CHANGELOG.md`
- `docs/active_plans/workstreams/m1_fantasy_cutoff_amendment_report.md`

## Validation performed

- `source source_me.sh && python3 -m pytest tests/test_markdown_links.py` passed: 22 passed.
- `rg -n -i 'minute|fantasy' docs/active_plans/wnba_game-plan.md` confirms that active
  recognizability requirements now use fantasy points; remaining minute references are the
  deliberate prohibition on shipping performance statistics.
- `git diff --check` passed with no whitespace errors.
