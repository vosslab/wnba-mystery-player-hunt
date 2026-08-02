## 2026-08-02

### Additions and New Features

- Add a playable daily WNBA player-guessing game with deterministic UTC puzzles, nine WNBA
  biography clues, autocomplete, keyboard control, Pick for me, win/loss dialogs, share
  fallback, and responsive light/dark themes.
- Add versioned puzzle persistence, idempotent statistics and streak updates, safe malformed
  save recovery, and duplicate-guess handling that preserves the current input and attempt.
- Add a Python-only WNBA data lane: the root `fetch_wnba_player_data.py` command harvests private
  candidates through `data_fetcher/wnba_harvester.py`, while reusable validation and roster
  generation live in `data_fetcher/wnba_candidates.py` and `data_fetcher/wnba_roster.py`.
  Performance data remains private and does not enter the shipped snapshot.
- Add Node unit coverage and Playwright journeys for boot, feedback, duplicate recovery,
  Pick for me, win, loss, reload behavior, mobile reachability, and zero WNBA runtime calls.
- Add install and usage guidance, the data-pipeline reports, and a four-token contrast audit.

### Fixes and Maintenance

- Replace the blocked WNBA Stats Angular-shell acquisition path with the proven Python-only,
  server-rendered Basketball-Reference WNBA HTML path. The bounded `--max 3` run found 15 teams,
  223 current totals rows, 182 prior totals rows, and three derived test-limit candidates; it does
  not claim a full refresh, cutoff decision, or public data-use approval.
- Keep the single `get_page()` boundary GET/HTML-only and pace requests at least three seconds plus
  random jitter, below Sports Reference's published other-sites cap. Document that candidates and
  snapshots from this path are derived rather than official WNBA data and require human data-use
  review before public deployment.
- Use neutral bundled-player-pool copy in gameplay status and document that the committed
  hand-maintained roster is not an official current-roster refresh.
- Anchor private candidate output paths to the repository's ignored `data/private/` directory,
  independent of the caller's working directory.
- Repair the package clean command, consolidate shared guess-limit and theme types, and remove an
  unused storage method.
- Make unit and browser tests follow configured clues and a fixed UTC test clock, and correct stale
  data-pipeline documentation paths and acquisition wording.
- Document the all-player manual harvester's progress output, randomized per-request pacing, and
  `-m` / `--max` plumbing limit. Only a limit that actually truncates the roster writes the
  separately named `test-limit` private file; stage two rejects that scope.
- Supersede the rejected WNBA-profile `FROM_YEAR` route: the active Basketball-Reference
  harvester treats a missing prior-season total as zero only for a current-roster entrant marked
  `R`; an established player's gap remains a data error.
- Record the existing GitHub Pages workflow and WNBA Mystery Player Hunt repository and Pages
  addresses without treating the unverified full derived-data refresh or cutoff as complete.
- Keep the game wholly independent from refresh timing: no snapshot-age gate, data tracking, or
  browser-time WNBA request controls whether the committed static roster remains playable.
- Carry the requested current and preceding years in candidate `source.seasons`; stage two reads
  those values instead of assuming fixed calendar years.
- Record the superseded rejected-route experiment: a `get_page()` boundary was added while testing
  WNBA Stats traditional-page discovery, but that Angular shell has no server-rendered player rows
  and its JSON/API route is forbidden. The active boundary allowlists Basketball-Reference WNBA
  GET/HTML pages instead.
- Correct the recognizability metric name to `WNBA_FANTASY_PTS` across Python, TypeScript, tests,
  plans, and refresh documentation; the active Basketball-Reference harvester derives it from
  server-rendered totals rather than reading a WNBA Stats field.

### Decisions and Failures

- Use current-roster membership as the eligibility gate and `WNBA_FANTASY_PTS` as the
  working-file-only recognizability cutoff metric; compare 200 and 300 using the maximum of
  current and preceding-season totals, with the user-supplied 2026 count cross-checks.
- Prioritize a fun, clear win/loss guess loop over exact Pickle or pixel parity. The game is
  buildable and playable with its static valid roster; a future full derived-data refresh and
  cutoff calibration remain separate maintenance work.
- Keep all future roster and statistics gathering in the separate Python pipeline. Browser
  runtime and Playwright use only static development or committed snapshot data.
- Keep six guesses as the development-fixture default. It is a provisional fun choice, not a
  release calibration result for the real derived-data pool.
- Preserve the WNBA Stats player-page and throttled `commonplayerinfo` observations as rejected
  route evidence only; they are not inputs to the active Basketball-Reference acquisition path.
- Keep a full no-limit refresh and cutoff decision unverified rather than claim a current public
  roster. The independent game remains playable with its committed snapshot.
- Preserve the WNBA traditional-page experiment as rejected evidence: it is a JavaScript-populated
  Angular shell without server-rendered player rows, so the harvester never uses its JSON/API
  requests or a browser fallback.

### Validation

- Pass the TypeScript and Node checks through `./check_codebase.sh` and the gameplay browser
  journeys through `./run_playwright_tests.sh --build` against the bundled development data.
- Keep data acquisition validation in Python; no browser test is a source of roster or
  statistics evidence.
