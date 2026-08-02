# README Screenshot Harness Re-review

## Outcome: ACCEPT

Direct inspection of `tests/playwright/capture_readme_screenshot.mjs` confirms that each candidate
attempt clears local storage and reloads before it submits a guess. Each fresh attempt must have
zero comparison rows and no open dialog. A candidate is accepted only when it produces exactly one
row and leaves the puzzle active, so a target-first candidate cannot poison a later attempt with a
saved winning row.

The successful replay used the bundled local `dist/` server. The harness rejects any `wnba.com`
request, page error, or console error; the replay completed without any of them. It also verified
one accepted row and exactly nine feedback cells before capture.

`docs/screenshots/wnba_pickle_feedback.png` is readable and spoiler-free on visual inspection. It
is an RGB 1600 x 1000 PNG (16:10), 114,206 bytes, and remains comfortably within the documented
screenshot size budget.

## Verification

- `./build_github_pages.sh` passed.
- `node tests/playwright/capture_readme_screenshot.mjs docs/screenshots/wnba_pickle_feedback.png`
  passed against a local static server.
- `file`, `sips`, and byte-count inspection confirmed the current PNG's format, dimensions, and
  size.
- `./check_codebase.sh` passed all five canonical checks, including 19 Node behavior tests.
