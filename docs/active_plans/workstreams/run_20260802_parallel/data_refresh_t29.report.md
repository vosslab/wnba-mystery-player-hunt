# Data refresh documentation report

## Outcome

Added [DATA_REFRESH.md](../../../DATA_REFRESH.md), a release-safe operational runbook for the
two-stage WNBA roster refresh. It uses Python only: the first stage obtains or validates official
Stats exports in ignored private storage, and the second stage writes a review snapshot without
network or browser involvement.

## Documented behavior

- Shows exact saved-manifest and live official acquisition commands using
  `source source_me.sh && python3`.
- Shows explicit 200 and 300 cutoff review commands and does not select either cutoff.
- Keeps examples on `data_review/` review outputs rather than overwriting the prototype roster.
- Explains complete current-roster membership, both fantasy-point seasons, valid zero versus
  missing values, and the private-to-public allowlist boundary.
- Gives actionable recovery for incomplete rosters, player pages, traditional totals, and reviewed
  normalization mappings.
- States that browser tests and the shipped game have no WNBA runtime fetch path.

## Verification

- `source source_me.sh && python3 tools/fetch_wnba_candidates.py --help` -- PASS.
- `source source_me.sh && python3 tools/build_roster_file.py --help` -- PASS.
- `source source_me.sh && python3 -m pytest tests/test_fetch_wnba_candidates.py tests/test_build_roster_file.py` -- PASS (10 tests).
- `source source_me.sh && python3 -m pytest tests/test_markdown_links.py` -- the new runbook links
  pass; the suite is currently blocked by pre-existing README links to `docs/INSTALL.md` and
  `docs/USAGE.md` while their parallel documentation workstream is in progress.
- `git diff --check -- docs/DATA_REFRESH.md docs/active_plans/workstreams/run_20260802_parallel/data_refresh_t29.report.md` -- PASS.
- Local Markdown links in the new runbook point to the two pipeline reports in
  `docs/active_plans/reports/`.
