# M1 fantasy cutoff review fix report

## Assumptions

- The review's 102-at-300 and 131-at-200 figures are user-supplied 2026 current-season
  cross-checks for every row returned by the traditional-stats page.
- The current-roster enumeration that WP-1.2 proves remains authoritative for eligibility.

## Decisions

- Current-roster membership is the sole eligibility gate.
- `ROSTERSTATUS` remains diagnostic supporting evidence and never becomes a filter.
- An override may correct only a documented, proven authoritative roster-data error; it
  cannot establish eligibility or fame.
- WP-1.2 reports the all-page and post-current-roster counts at both supplied cutoffs.
- WP-1.3 intersects with the current roster before applying either fantasy-points cutoff.

## Concrete next steps

- WP-1.2 records the 2026 all-page cross-check counts and post-roster counts for 200 and
  300 FP, along with the route and season parameter used.
- WP-1.3 uses the post-roster population for the direct 200/300 and two-season comparison.
- WP-3.2 accepts an eligibility override only when its documented evidence proves an
  authoritative roster-data error.

## Changed files

- `docs/active_plans/wnba_game-plan.md`
- `docs/active_plans/workstreams/m1_fantasy_cutoff_review_fix_report.md`

## Validation

- `git diff --check` exits 0 with no output.
- `source source_me.sh && python3 -m pytest tests/test_markdown_links.py` exits 0:
  22 passed.
- Targeted `rg` audit confirms that `ROSTERSTATUS` is diagnostic-only, `forceEligible` is
  constrained to authoritative roster-data correction, and 102/131 are all-page checks with
  separate post-current-roster counts.
