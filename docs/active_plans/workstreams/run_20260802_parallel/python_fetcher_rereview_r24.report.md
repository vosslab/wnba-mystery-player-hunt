# Python fetcher re-review

## Verdict

ACCEPT. The repaired acquisition boundary now prevents the two prior incomplete/export-escape
failures and remains entirely Python-based.

## Boundary findings

- `build_candidates()` derives the complete expected team set from the official team payload,
  rejects duplicate, missing, and unexpected roster responses, then rejects every response with
  zero `CommonTeamRoster` rows. A partial pull cannot silently omit a team.
- `resolve_manifest_path()` resolves both the manifest directory and every relative export path,
  then requires containment. This rejects parent traversal and an in-directory symlink that
  resolves outside the export directory. Absolute paths are also rejected.
- Both traditional-stat seasons are indexed independently. A numeric `NBA_FANTASY_PTS` value of
  `0` is retained; an absent field or absent player-season row fails explicitly.
- `main()` validates its output before writing. The only accepted destination is under ignored
  `data/private/`; `write_json()` writes a sibling temporary file and replaces the destination
  only after a complete JSON document has been written.
- The fetcher imports only Python standard-library modules. Saved-manifest processing is local;
  the bounded live mode uses `urllib` only after validating fixed HTTPS `stats.wnba.com` URLs.
  It has no browser, Playwright, Selenium, or runtime-game dependency.

## Verification

- `source source_me.sh && python3 -m pytest tests/test_fetch_wnba_candidates.py` - PASS, 5 tests.
- `source source_me.sh && python3 -m py_compile tools/fetch_wnba_candidates.py` - PASS.
- `source source_me.sh && python3 -m pyflakes tools/fetch_wnba_candidates.py` - PASS.
- `source source_me.sh && python3 -m bandit -q tools/fetch_wnba_candidates.py` - PASS; Bandit
  printed only informational parsing warnings for the explanatory `nosec` comments.
- A temporary manifest-directory symlink to a file outside that directory raised the expected
  containment `ValueError`.
- `git diff --check` and `git diff --cached --check` - PASS. The fetcher/test/report files are
  currently untracked, so Git's tracked-file diff contains only the private-data ignore rule.
