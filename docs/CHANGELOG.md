## 2026-08-02

### Additions and New Features

- Add a playable daily WNBA player-guessing game with deterministic UTC puzzles, nine WNBA
  biography clues, autocomplete, keyboard control, Pick for me, win/loss dialogs, share
  fallback, and responsive light/dark themes.
- Add versioned puzzle persistence, idempotent statistics and streak updates, safe malformed
  save recovery, and duplicate-guess handling that preserves the current input and attempt.
- Add a manifest-only Python candidate-validation and roster-generation pipeline. It keeps
  official data maintenance and fantasy-point ranking outside the browser, emits static data,
  and prevents performance fields from entering the shipped game snapshot.
- Add Node unit coverage and Playwright journeys for boot, feedback, duplicate recovery,
  Pick for me, win, loss, reload behavior, mobile reachability, and zero WNBA runtime calls.
- Add install and usage guidance, the data-pipeline reports, and a four-token contrast audit.

### Fixes and Maintenance

- Anchor private candidate output paths to the repository's ignored `data/private/` directory,
  independent of the caller's working directory.
- Repair the package clean command, consolidate shared guess-limit and theme types, and remove an
  unused storage method.
- Make unit and browser tests follow configured clues and a fixed UTC test clock, and correct stale
  data-pipeline documentation paths and acquisition wording.

### Decisions and Failures

- Use current-roster membership as the eligibility gate and `NBA_FANTASY_PTS` as the
  working-file-only recognizability cutoff metric; compare 200 and 300 using the maximum of
  current and preceding-season totals, with the user-supplied 2026 count cross-checks.
- Prioritize a fun, clear win/loss guess loop over exact Pickle or pixel parity. The game is
  buildable and playable with its static valid roster; official current-roster and
  2025/2026 fantasy-point evidence remains incomplete only for a future official pool and
  cutoff calibration.
- Keep all future roster and statistics gathering in the separate Python pipeline. Browser
  runtime and Playwright use only static development or committed snapshot data.
- Keep six guesses as the development-fixture default. It is a provisional fun choice, not a
  release calibration result for the real official pool.
- Record that a known player page works for individual biography data, but it does not replace
  the still-unproven league-list, team-roster, or 2025/2026 fantasy-point acquisition routes.
- Remove the unproven live REST refresh path after its timeout. The known player page loads for
  biography evidence, while team/traditional page data and the page-primed roster REST request
  remain unresolved for a complete official refresh. The independent game remains playable.

### Validation

- Pass the TypeScript and Node checks through `./check_codebase.sh` and the gameplay browser
  journeys through `./run_playwright_tests.sh --build` against the bundled development data.
- Keep data acquisition validation in Python; no browser test is a source of roster or
  statistics evidence.
