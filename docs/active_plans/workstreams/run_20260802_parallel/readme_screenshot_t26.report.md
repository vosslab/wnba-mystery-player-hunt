# README Screenshot Capture Report

## Outcome

Captured `docs/screenshots/wnba_pickle_feedback.png` from the built local static game and placed
its descriptive embed in the README-managed screenshot block. The 1600 x 1000 PNG is 16:10,
112 KB, and its longer edge is below the 1920-pixel limit.

The view deliberately shows one accepted, non-winning prototype-roster guess. It makes the
development-data disclosure, remaining guesses, status recovery text, and clue feedback visible
without disclosing the daily answer. The comparison grid retains its intentional horizontal-scroll
behavior for the remaining columns; this is the product's responsive interaction, not a cropped
or browser-connected data view.

## Reproduction

From the repository root, capture the same static-artifact state with:

```bash
./build_github_pages.sh
node tests/playwright/capture_readme_screenshot.mjs /tmp/wnba_pickle_feedback.png
mkdir -p docs/screenshots
cp /tmp/wnba_pickle_feedback.png docs/screenshots/wnba_pickle_feedback.png
```

The harness serves only `dist/`, clears local storage, submits a non-winning bundled-fixture
player, verifies nine feedback cells, and fails on page/console errors or any `wnba.com` request.

## Verification

- Ran the production static build successfully before capture.
- Inspected the PNG visually at 1600 x 1000: it is a useful desktop game state with readable
  development disclosure and clue feedback.
- `file docs/screenshots/wnba_pickle_feedback.png` reports a 1600 x 1000 RGB PNG.
- The PNG is new and untracked until the eventual commit, so git-age metadata is not available
  yet.

## Changelog Handoff

Add an unreleased entry noting the README gameplay screenshot, its capture harness, and the
Python-free, bundled-data-only capture path.
