# WP-1.2 browser-led data follow-up

## Outcome

DONE_WITH_CONCERNS. The bounded browser-led probe resolved the player-page contradiction and
captured the exact traditional-stat and team-roster request shapes. It did not receive the
league-wide response bodies needed for a production roster snapshot or fantasy-cutoff decision.

## Evidence retained

- `test-results/wnba_data_probe_followup/observation.json` records timestamps, statuses,
  request URLs, response events, DOM-state results, and redacted body excerpts.
- `test-results/wnba_data_probe_followup/*.png` records the public page/error surfaces.
- [wnba_data_access_and_fields.md](../reports/wnba_data_access_and_fields.md) separates
  verified facts from unknowns and records the release-data boundary.

## What changed from the first probe

- The known A'ja Wilson player HTML route completed HTTP 200 in 142 ms, 120335 bytes, with all
  three `window.nbaStatsPlayer*` assignments present once. The page-embedded route is still
  viable for individual biographies.
- Browser network observation confirmed the exact `leaguedashplayerstats` parameters for 2026
  and 2025 and the exact `commonteamroster` parameters for the Phoenix Mercury profile.
- The traditional requests started but emitted no response during each 55-second state-based
  page wait. The external WNBA roster route shapes were tested for Las Vegas, Portland, and
  Toronto and returned environment-specific 403 pages.

## Delivery boundary

The manager's explicit priority override after this single approved browser run prohibits more
probe/retry work in this slice. Product work may continue with data visibly labeled as a
development fixture. Production daily-player selection, roster eligibility, and the 200/300
fantasy-point calibration remain release-data dependencies until a complete official capture or
user-provided official export is available.

## Validation

```text
node _temp_probe_followup.mjs
exit 0

source source_me.sh && python3 -m pytest tests/test_markdown_links.py
22 passed in 0.03s

git diff --check
exit 0
```
