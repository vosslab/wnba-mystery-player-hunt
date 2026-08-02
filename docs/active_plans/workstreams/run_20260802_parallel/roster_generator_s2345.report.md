# Python roster generator handoff

## Outcome

Implemented `tools/build_roster_file.py`, the Python-only selection and static-snapshot stage.
It accepts a complete private candidate file, requires an explicit `--cutoff 200` or `--cutoff
300`, and writes only the caller-selected output path. No network, browser, Playwright, or game
code is involved.

## Files

- `tools/build_roster_file.py`
- `data_review/country_overrides.csv`
- `data_review/eligibility_overrides.csv`
- `data_review/team_conferences.csv`
- `docs/active_plans/reports/python_roster_generation.md`

## Important behavior

- Current-roster candidate membership is the sole eligibility gate.
- Selection is exactly the maximum of 2026 and 2025 fantasy points against the explicit cutoff.
- The report separates current-season-only and two-season-union pools, including preceding-season
  additions.
- Fantasy points are never emitted into player records or snapshot provenance beyond metric,
  seasons, cutoff, and selected pool size.
- Strict input validation rejects partial envelopes, duplicate players, missing numeric totals,
  unknown teams/countries, and undocumented source disagreements.
- The generated snapshot has a Python allowlist check and is accepted by the TypeScript parser.

## Offline validation

- `source source_me.sh && python3 -m py_compile tools/build_roster_file.py` - pass.
- `source source_me.sh && python3 tools/build_roster_file.py --help` - pass.
- A two-player private fixture ran at both cutoffs into `/tmp`:
  - 200: current-only 1, two-season union 2, preceding-season addition `99`.
  - 300: current-only 1, two-season union 1, no preceding-season additions.
- Both `/tmp` outputs passed `parseRosterSnapshot` using the repository TypeScript contract.
- `source source_me.sh && python3 -m pyflakes tools/build_roster_file.py` - pass.
- `source source_me.sh && python3 -m bandit -q tools/build_roster_file.py` - pass.
- `git diff --check` - pass.

## Delivery boundary

No production roster was generated or overwritten. A complete official candidate file and the
user's selected 200 or 300 cutoff remain the only inputs needed for a real refresh.
