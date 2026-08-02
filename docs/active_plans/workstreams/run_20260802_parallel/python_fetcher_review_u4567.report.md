# Python fetcher review

## Verdict

NEEDS_FIX. The Python-only boundary and fantasy-point handling are sound, but two input-boundary
gaps can silently produce an incomplete roster candidate pool or read files outside an export.

## High-impact findings

### Empty team response passes

- `build_candidates()` verifies that each team has one roster response, but not that each response
  contains a roster row ([tools/fetch_wnba_candidates.py](../../../../tools/fetch_wnba_candidates.py#L615)).
- An offline fixture with two official team IDs, one valid roster, and one empty `CommonTeamRoster`
  succeeded and wrote one candidate. That loses an entire team while reporting two roster responses.
- Require at least one validated roster row for every official team response before constructing the
  candidate set. This protects the plan's sole current-roster eligibility gate.

### Manifest paths can escape

- `resolve_manifest_path()` rejects absolute paths but accepts `..` traversal
  ([tools/fetch_wnba_candidates.py](../../../../tools/fetch_wnba_candidates.py#L460)).
- A manifest entry using `../wnba-fetch-secret/teams.json` completed successfully. The manifest
  should only read saved exports below its own directory.
- Resolve both the manifest directory and entry path, then require the entry to be relative to the
  resolved manifest directory. This is a small, durable provenance boundary.

## Accepted behavior

- The tool imports no browser or Playwright module. Live retrieval uses fixed HTTPS
  `stats.wnba.com` URLs and validates the host before `urllib` is used.
- Output is constrained to ignored `data/private/`, uses a temporary sibling and replace for an
  atomic write, and only carries allowlisted candidate fields.
- A duplicate roster response, duplicate player, wrong roster `TEAM_ID`, missing team response,
  missing player page, and missing season total each raise an explicit error.
- Both 2026 and 2025 `WNBA_FANTASY_PTS` values are mandatory. An offline end-to-end fixture retained
  a numeric 2026 zero. `ROSTERSTATUS` is retained as profile evidence and never filters candidates.
- `extract_json_value()` uses `JSONDecoder.raw_decode`, so the player-page assignment is parsed
  without delimiter guessing. The fetcher does not choose a fantasy-point cutoff.
- Live requests have a fixed timeout and randomized polite pacing. No live network request was run.

## Verification

- `source source_me.sh && python3 -m py_compile tools/fetch_wnba_candidates.py` - pass.
- `source source_me.sh && python3 tools/fetch_wnba_candidates.py --help` - pass.
- Offline valid fixture - pass; one candidate written and current-season value `0` retained.
- Offline missing-2025 fixture - failed with an explicit 2025 totals error.
- Offline partial-roster fixture - incorrectly passed, confirming the first finding.
- Offline parent-path fixture - incorrectly passed, confirming the second finding.
- `source source_me.sh && python3 -m bandit -q tools/fetch_wnba_candidates.py` - pass; only
  informational `nosec` comment-token warnings.
- `source source_me.sh && python3 -m pyflakes tools/fetch_wnba_candidates.py` - pass.
- `git diff --check` - pass.
