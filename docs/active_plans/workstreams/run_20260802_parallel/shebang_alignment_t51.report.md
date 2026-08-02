# Shebang alignment

Removed shebangs from four non-executable source files:

- `tests/playwright/capture_readme_screenshot.mjs`
- `tools/build_roster_file.py`
- `tools/fetch_wnba_candidates.py`
- `tools/simulate_difficulty.mjs`

Their documented invocations explicitly use `node` or `python3`, so the removed
lines did not provide execution behavior. This aligns the files with the
repository's executable-bit/shebang policy without changing permissions or the
Git index.

## Validation

- `source source_me.sh && python3 -m pytest tests/test_shebangs.py`
- `./check_codebase.sh`
