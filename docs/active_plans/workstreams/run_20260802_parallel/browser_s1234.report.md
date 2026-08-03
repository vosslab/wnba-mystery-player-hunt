# Browser playthrough report

## Outcome

The built game passed five browser walkthroughs. The checks focus on whether a person can play
and recover from mistakes, rather than on image or timing equivalence.

## Verified player paths

- A clean boot shows the game title, development-data disclosure, enabled search, Guess, Pick for
  me, and a clear first action.
- Keyboard autocomplete yields a real accepted guess. The resulting row has all nine configured
  feedback cells, with readable Exact, Close, or No match labels.
- A duplicate guess leaves the attempt count unchanged, preserves the name in the search input,
  and gives a visible recovery message. Pick for me adds a different accepted guess.
- A deterministic test-controlled target produces a full win. The result dialog is explicit;
  its manual-copy fallback contains neither the target name nor its team code. Reloading retains
  the completed result and still reports one played, one won.
- Six distinct visible non-target guesses produce a full loss with an explicit outcome and
  revealed answer.
- A 390px modern-phone dark-mode walkthrough keeps both primary actions in the viewport. The
  clue table is intentionally horizontally scrollable when it exceeds the available width.

The browser diagnostic guards saw no console errors, page errors, or WNBA-domain requests. The
test imports the bundled prototype roster and public deterministic selector only to choose a
known answer for win/loss control; the browser itself loads only the built bundle and bundled JSON.

## Evidence

Ignored walkthrough screenshots:

- `test-results/playable_walkthrough/00_desktop_light_boot.png` (800px desktop width)
- `test-results/playable_walkthrough/01_feedback_and_recovery.png`
- `test-results/playable_walkthrough/02_win_share.png`
- `test-results/playable_walkthrough/03_loss.png`
- `test-results/playable_walkthrough/04_phone_dark_boot.png` (390px wide)

Visual review found a clear title, prominent action controls, explicit development disclaimer,
legible feedback key, and a usable phone layout. This is evidence of functional clarity, not a
pixel-comparison baseline.

## Files owned

- `tests/playwright/smoke.spec.ts`
- `tests/playwright/gameplay.spec.ts`
- `test-results/playable_walkthrough/` (ignored)
- `docs/active_plans/workstreams/run_20260802_parallel/browser_s1234.report.md`

## Validation

- `npx tsc --noEmit -p tsconfig.json` exited 0 with no diagnostics.
- `./run_playwright_tests.sh --build` exited 0: 5 passed.
- `./check_codebase.sh` exited 0: typecheck, lint typecheck, lint, Prettier, and 17 Node tests
  passed.
- `git diff --check` exited 0.

## Follow-up

No browser-level correctness blocker was found. The only data caveat remains intentional: this
is a clearly labelled prototype roster until the separate Python data pipeline publishes a
verified official snapshot.
