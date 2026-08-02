# Python pipeline behavior tests

## Scope

Added offline, Python-only behavior coverage for the candidate acquisition and
roster snapshot boundaries. The tests do not make Stats requests, launch a
browser, or invoke Playwright.

## Coverage added

- Reject a supplied but empty current-roster response for an otherwise listed
  team.
- Reject manifest paths that escape the manifest directory and candidate output
  paths outside `data/private/`.
- Preserve explicit zero fantasy points while rejecting an absent total.
- Apply the cutoff to the maximum of 2026 and 2025 fantasy points.
- Require the explicit 200 or 300 cutoff choice.
- Keep private performance fields out of the emitted game snapshot.
- Verify both JSON writers replace the target without a residual temporary
  file.

## Security finding

The existing three-player data prototype used a fixed official HTTPS endpoint
without documenting the Bandit B310 exception. Added the narrowly scoped
`# nosec B310` rationale at that call site. A medium/high Bandit scan of that
prototype and the production candidate fetcher reports no findings.

## Validation

`source source_me.sh && python3 -m pytest tests/test_fetch_wnba_candidates.py tests/test_build_roster_file.py tests/test_pyflakes_code_lint.py tests/test_indentation.py tests/test_whitespace.py tests/test_function_typing.py`

Result: 168 passed.

`source source_me.sh && python3 -m bandit --severity-level medium --confidence-level medium tools/fetch_wnba_player_data.py tools/fetch_wnba_candidates.py`

Result: no medium/high findings.
