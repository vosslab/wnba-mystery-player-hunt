# Data refresh review

## Verdict

ACCEPT

`docs/DATA_REFRESH.md` matches the two Python command interfaces and preserves the required
Python-only boundary. It gives runnable Python 3.12 commands for saved-export and live modes,
then keeps snapshot generation offline.

## Verified contract

- `fetch_wnba_candidates.py` requires exactly one of `--input-manifest` or `--live` and accepts
  the documented private `--output` path. Its output-path validator rejects destinations outside
  `data/private/`; the browser has no role in either acquisition mode.
- Saved exports are resolved below the manifest directory and each provenance URL must be HTTPS
  `stats.wnba.com`. Live acquisition uses the same Python tool and validates the same sources.
- Stage one rejects missing, duplicate, extra, or empty current-roster responses; requires both
  2026 and 2025 traditional totals and a player page for every rostered player; preserves numeric
  zero fantasy totals; and rejects missing or nonnumeric totals.
- `build_roster_file.py` requires an explicit `--cutoff {200,300}`. It selects only current-roster
  candidates using `max(2026, 2025 NBA_FANTASY_PTS) >= cutoff`; neither 200 nor 300 is presented
  as a default or settled product decision.
- The documented review destinations are safe before promotion. The generator emits the public
  allowlisted snapshot and excludes fantasy points, minutes, and other performance fields. The
  guide correctly says not to replace `src/data/roster.json` before explicit verification.
- Recovery guidance correctly distinguishes missing evidence from an explicit zero and confines
  mapping/eligibility corrections to their documented non-ranking role.
- Repeated refresh behavior is accurate: both writers use temporary sibling files and replace only
  after a complete successful write; the guide retains the prior private candidate file until the
  new run succeeds and asks for both cutoff outputs for review.

## Evidence

- `source source_me.sh && python3 tools/fetch_wnba_candidates.py --help` passed.
- `source source_me.sh && python3 tools/build_roster_file.py --help` passed.
- `source source_me.sh && python3 -m pytest tests/test_fetch_wnba_candidates.py tests/test_build_roster_file.py` passed: 10 tests.
- `git diff --check -- docs/DATA_REFRESH.md` passed.
- The Markdown-link test passed for `docs/DATA_REFRESH.md`. Its full-suite invocation currently
  has one unrelated README failure because `docs/INSTALL.md` and `docs/USAGE.md` are not yet
  present; that does not affect this guide's two relative report links.
