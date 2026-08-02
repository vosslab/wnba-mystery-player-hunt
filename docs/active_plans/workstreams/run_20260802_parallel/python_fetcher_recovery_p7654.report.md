# Python candidate-fetcher recovery

## Outcome

Recovered the Python-only candidate-fetcher slice without contacting the network or a browser.
The fetcher accepts saved official exports or its bounded `--live` mode, writes only ignored
private working data, and does not choose a recognizability cutoff.

## Decisions

- Current-roster response membership is the sole candidate gate. `ROSTERSTATUS` is retained only
  as diagnostic profile evidence.
- Both 2026 and 2025 `NBA_FANTASY_PTS` are required working-data fields. A numeric zero is valid;
  a missing value is an explicit error.
- The fetcher now rejects duplicate or unexpected roster responses, roster rows whose `TEAM_ID`
  disagrees with the requested team, and duplicate traditional-stat player rows. These prevent a
  stale or partial export from silently entering the candidate pool.
- The output path must be inside ignored `data/private/`. This keeps performance totals out of the
  game-facing snapshot and tracked files.
- URLs are validated as HTTPS on `stats.wnba.com` before `urllib` can retrieve them. No browser
  module or browser-control path is imported.

## Changed files

- `tools/fetch_wnba_candidates.py`
- `.gitignore`
- `docs/active_plans/reports/python_candidate_pipeline.md`

## Offline validation

- `source source_me.sh && python3 -m py_compile tools/fetch_wnba_candidates.py` - pass.
- `source source_me.sh && python3 tools/fetch_wnba_candidates.py --help` - pass.
- A minimal saved-export fixture completed end to end: exactly one candidate was written, the
  2026 value `0` was retained, and the candidate/profile allowlists were verified.
- The same fixture with a missing 2025 fantasy value failed nonzero with the named
  `NBA_FANTASY_PTS` field.
- `source source_me.sh && python3 -m bandit -q tools/fetch_wnba_candidates.py` - pass (Bandit
  emitted informational `nosec` comment-token warnings only).
- `source source_me.sh && python3 -m pyflakes tools/fetch_wnba_candidates.py` - pass.
- `git diff --check` - pass.

## Next step

Use only a complete official export manifest or a successful paced Python live pull. The roster
generator may apply the separately approved two-season fantasy-point cutoff after this working
file is validated; no cutoff belongs in this fetcher.
