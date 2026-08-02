# Official Python refresh - 2026-08-02

## Result

Blocked by an official WNBA Stats read timeout. No browser, Playwright, curl, manual export, or
non-Python retrieval was used. No candidate or roster output was created, and
`src/data/roster.json` was not touched.

## Exact run

```bash
source source_me.sh && python3 tools/fetch_wnba_candidates.py --live \
  --output data/private/wnba_candidates.json
```

The process exited 1 after about 48 seconds. Its terminal exception was:

```text
TimeoutError: The read operation timed out
```

The exception occurred in Python's `urllib.request.urlopen` while
`fetch_official_text` retrieved a validated HTTPS `stats.wnba.com` source.

## Required recovery input

Saved unmodified official responses plus a manifest at
`data/private/official_exports/manifest.json`, as specified in
`docs/active_plans/reports/python_candidate_pipeline.md`. The manifest must contain the team
list, every current 2026 team roster, 2026 and 2025 traditional stats, and a player page for
every rostered player. The existing Python fetcher can then create the private candidate file;
the two cutoff outputs should be generated only after that step succeeds.
