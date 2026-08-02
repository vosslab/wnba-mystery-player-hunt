# Python pipeline tests review

## Verdict

NEEDS_FIX

The added tests are fast, deterministic, offline, and Python-only. They cover
the important empty-roster, output-boundary, zero-value, two-season cutoff,
and public-snapshot privacy paths. The focused tests pass, as do the repository
pyflakes gate. A medium/high Bandit scan reports no findings.

Two small changes are needed before accepting this test lane.

1. Add an offline test that proves a current-roster player with no row at all
   in one season's traditional totals is rejected. The current zero test only
   covers a present row missing its `WNBA_FANTASY_PTS` field. A missing player
   row is the higher-impact form of the stated "missing is not zero" contract
   because it is the join boundary used by `build_candidates`.
2. Add an offline test that an untrusted/non-official URL is rejected by
   `validate_official_url`. This anchors the security assumption behind the
   narrow B310 suppression without attempting a request. The present B310
   suppression is acceptably scoped: the production fetcher validates HTTPS
   `stats.wnba.com` immediately before `urlopen`, and the prototype's endpoint
   is a fixed HTTPS template. Neither suppression hides generic manifest URL
   input.

The atomic-writer tests are useful boundary coverage, but their assertion on a
specific `.json.tmp` filename couples to an internal implementation detail.
Keep the assertion that the replaced output is complete JSON; remove the
specific temporary-path assertion unless the temp-file name is documented as a
user-visible contract.

## Evidence

- `source source_me.sh && python3 -m pytest tests/test_fetch_wnba_candidates.py tests/test_build_roster_file.py` -> 10 passed.
- `source source_me.sh && python3 -m pytest tests/test_fetch_wnba_candidates.py tests/test_build_roster_file.py tests/test_pyflakes_code_lint.py` -> 37 passed.
- `source source_me.sh && python3 -m pyflakes tools/fetch_wnba_candidates.py tools/build_roster_file.py tools/fetch_wnba_player_data.py tests/test_fetch_wnba_candidates.py tests/test_build_roster_file.py` -> no findings.
- `source source_me.sh && python3 -m bandit --severity-level medium --confidence-level medium tools/fetch_wnba_player_data.py tools/fetch_wnba_candidates.py` -> no medium/high findings.
