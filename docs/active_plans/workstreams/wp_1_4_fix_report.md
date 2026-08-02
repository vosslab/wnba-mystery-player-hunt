# WP-1.4 fix report

## Assumptions

- Existing numbered Pickle screenshots remain the primary direct observation.
- Unobserved duplicate and completed-round details are non-blocking reference information.

## Changes

- Corrected Age ownership: the clue engine derives it from `birthDateUtc` and the injected UTC
  puzzle date, never at build time.
- Corrected fantasy points: current-roster membership is the sole eligibility gate; fantasy
  points rank eligible players for recognizability only.
- Added direct official WNBA surface links and split the clue matrix into fan salience,
  learning, upstream stability, maintenance, width, and deduction columns.
- Retained the configured nine-clue list and scoped no-arrows to the observed UI.

## New observations and fallback evidence

- No new reliable live capture was produced: the bounded follow-up repeated the browser
  launch/goto stall before a usable page artifact.
- Duplicate handling, end dialog, statistics, and exact share text remain unobserved and are
  explicitly non-blocking. No authoritative published or archived fallback established them.

## Changed files

- `docs/active_plans/reports/wnba_pickle_parity_and_clues.md`
- `docs/active_plans/workstreams/wp_1_4_fix_report.md`

## Validation

- `source source_me.sh && python3 -m pytest tests/test_markdown_links.py`
- `git diff --check`

## Residual risks

- A healthy completed Pickle round could revise the non-blocking end-state reference details.
