# Python pipeline tests re-review

## Verdict

ACCEPT

The repaired offline test lane now covers the two previously missing
high-impact boundaries without coupling to implementation details.

## Verified boundaries

- A current-roster player absent from the preceding-season traditional-totals
  response is rejected, even when that response contains another player. This
  exercises the actual two-season join rather than an empty-response shortcut.
- `validate_official_url()` rejects both insecure HTTP and a non-official host.
  These tests are local validation calls; they do not issue requests.
- Explicit zero fantasy points remain valid, while a missing fantasy-points
  field and a missing player-season row fail separately.
- The writer tests assert only the durable observable result: a pre-existing
  file is replaced by complete parseable JSON. They contain no assertion about
  an internal temporary filename.
- The tests import the two Python tools directly and contain no browser,
  Playwright, Selenium, `urllib`, `requests`, or live-mode invocation. The
  data path remains Python-only and offline for test execution.

## Verification

- `source source_me.sh && python3 -m pytest tests/test_fetch_wnba_candidates.py tests/test_build_roster_file.py` - PASS, 13 tests.
- `source source_me.sh && python3 -m pyflakes tools/fetch_wnba_candidates.py tools/build_roster_file.py tests/test_fetch_wnba_candidates.py tests/test_build_roster_file.py` - PASS, no findings.
- `source source_me.sh && python3 -m bandit --severity-level medium --confidence-level medium tools/fetch_wnba_player_data.py tools/fetch_wnba_candidates.py` - PASS, no medium/high findings.
- `git diff --check --no-index /dev/null` against each untracked test file - PASS, no whitespace errors.
