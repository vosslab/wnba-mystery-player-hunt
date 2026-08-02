# README Screenshot Harness Fix

## Outcome: ACCEPT

The capture harness now clears local storage and reloads before every bundled-player candidate.
Each attempt verifies that it begins with no saved comparison rows and no result dialog. It accepts
an attempt only when it creates exactly one comparison row while the round remains active; this
prevents a target-first attempt from leaving a persisted winning row that can be mistaken for
fresh feedback.

## Verification

- `./build_github_pages.sh` completed before recapture.
- `node tests/playwright/capture_readme_screenshot.mjs docs/screenshots/wnba_pickle_feedback.png`
  completed successfully against the local static `dist/` server.
- The harness verified a genuinely active puzzle, exactly one newly accepted row, no dialog, all
  nine feedback cells, and no `wnba.com` request, page error, or console error.
- Direct PNG inspection: `file` reports an RGB 1600 x 1000 PNG; `stat -c '%s'` reports 114206
  bytes. Visual inspection confirms a readable, spoiler-free feedback state.
- `./check_codebase.sh` passed all five checks.
