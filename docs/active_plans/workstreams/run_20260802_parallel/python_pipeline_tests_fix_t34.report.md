# Python pipeline tests fix

## Scope

Updated only the offline Python data-pipeline behavior tests in response to
the independent review.

## Changes

- Added a candidate-join test that rejects a current-roster player absent from
  the preceding season's traditional-totals rows. A different player's row
  keeps the season payload nonempty, so the test reaches the player-join
  boundary rather than only testing an empty response.
- Added parameterized URL validation coverage for insecure HTTP and a
  non-official host. The tests make no network requests.
- Kept the observable writer contract: a preexisting output is replaced by
  complete parseable JSON. Removed assertions about the private temporary
  filename, which is not a user-visible contract.

## Validation

`source source_me.sh && python3 -m pytest tests/test_fetch_wnba_candidates.py tests/test_build_roster_file.py`

Result: 13 passed.

`source source_me.sh && python3 -m pyflakes tools/fetch_wnba_candidates.py tools/build_roster_file.py tests/test_fetch_wnba_candidates.py tests/test_build_roster_file.py`

Result: no findings.

`git diff --check -- tests/test_fetch_wnba_candidates.py tests/test_build_roster_file.py docs/active_plans/workstreams/run_20260802_parallel/python_pipeline_tests_fix_t34.report.md`

Result: no whitespace errors.
