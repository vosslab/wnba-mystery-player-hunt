## 2026-08-02

### Additions and New Features

- Add a concise first-run How to play dialog with exact, close, and no-match examples. Persist its
  dismissal in the existing save record and keep an `Open guide` button available for later review.
- Replace the plain completed-round dialog with an answer card, score/guess/streak metrics, and a
  spoiler-free visual feedback grid. Include current streak in copied results and use orange/blue
  share squares that match the game's actual feedback colors.
- Add replayable Practice rounds that choose fresh mystery players without changing the saved
  daily puzzle, statistics, or streaks.
- Expand the daily round to nine guesses and add a visible 100-point score that drops by 10 for
  each extra guess, with 20 points available on the ninth guess and zero for an unsolved round.
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
  Pick for me, win, loss, reload behavior, supported viewport widths, and zero WNBA runtime calls.
- Add install and usage guidance, the data-pipeline reports, and a four-token contrast audit.

### Behavior or Interface Changes

- Center the game in a 48rem maximum-width canvas so clue cells stop expanding on wide screens,
  matching Pickle's compact scanning rhythm while allowing for two extra WNBA clues. Size columns
  by their content role: Player and College receive the most room, Conference and Country remain
  scannable, and coded values such as Team, Position, Height, and Age stay compact. Keep the Theme
  choices visible in their already allocated information column instead of hiding them behind a
  disclosure. Use compact visible headings for Conference, Position, Draft year, and Draft pick
  while retaining their full accessible names.
- Order clues by their usefulness for narrowing the player pool: Conference, Team, Position,
  Country, Draft year, Draft pick, College, Height, then Age. Keep Player first as the row label,
  and normalize saved share rows to the same order.
- Show all nine guess slots from the start so the round length remains visible before the first
  guess. Hide repeated Exact, Close, and No match words by default while preserving complete cell
  labels for screen readers, and add a persisted `Match labels` checkbox for visible text.
- Shorten United States clue values to USA and give close matches a distinct blue fill: `#3154a6`
  with cream text in light mode and `#9abaff` with near-black text in dark mode. Measured text
  contrast is 5.59:1 and 10.43:1 respectively, and both fills exceed 3:1 against their neighboring
  neutral surface.

### Fixes and Maintenance

- Remove the retired temporary-roster provenance branch from the TypeScript contract. The game
  now accepts only verified derived or official snapshots, test rosters use the same verified
  derived envelope, and current schema and pipeline reports describe the shipped roster. Update
  archived workstream notes to use prototype-roster terminology so the retired provenance label
  no longer appears in tracked files.
- Regenerate [PALETTE_CONTRAST_AUDIT.md](PALETTE_CONTRAST_AUDIT.md) from the six distinct color
  tokens in `src/style.css` after adding the two theme-specific blue close-feedback fills.
- Keep Basketball-Reference Expansion Draft selections separate from original WNBA entry-draft
  clues, so an expansion-selected player documented as undrafted remains Undrafted in the game.
- Recover malformed Basketball-Reference player profiles that start a new paragraph before closing
  Position, name the active source in progress output, and resume long harvests from private
  five-player checkpoints instead of repeating every completed player request after a crash.
- Treat an absent previous-season total as a valid zero for rookies and players returning from a
  season off. Continue after individual player source failures, retain all successful profiles,
  retry only failed players on a matching rerun, and block incomplete pulls from snapshot promotion.
- Cache stable player biography fields individually for 14 days while refreshing totals and current
  rosters every run. Seed the cache from existing candidate files or checkpoints, save every five
  profile requests, and use stale biographies when a refresh temporarily fails.
- Add `--fast`/`-F` to refresh totals and rosters without player-page requests, plus
  `--refresh-players`/`-R` to force every player biography to refresh. Keep cache misses tolerant and
  mark fast pulls incomplete until new players receive biography data.
- Make root `fetch_wnba_player_data.py` complete the refresh by rebuilding the tracked GitHub Pages
  roster at the approved 300-point max-two-season cutoff. Preserve the last complete public roster
  when a tolerant pull has failures or `--max` deliberately limits the candidates.
- Complete the country override table for the real 206-player pull, including U.S. Virgin Islands,
  Austria, Egypt, Italy, Kenya, South Korea, Lithuania, and New Zealand, so the game-safe roster
  promotion validates every selected player.
- Promote the completed pull into the committed GitHub Pages roster with the selected 300-point
  two-season cutoff: 136 players across 15 teams, including 29 players admitted by prior-season
  recognizability and current-season rookie Olivia Miles. Keep fantasy totals, cache timestamps,
  and source URLs private.
- Tighten the game shell, cap the desktop clue grid at its 48rem optimal width, and keep 800x1280 as
  the minimum layout acceptance gate. Keep System as the default theme with light and dark as
  explicit, always-visible overrides.
- Show the complete nine-clue grid before the first guess so the game teaches its structure
  visually, and make `Pick for me` fill the search field without submitting on the player's behalf.
- Normalize multi-position clue displays to conventional role order, so equivalent source values
  such as `C/F` and `F/C` display as `F/C` and receive exact feedback.
- Keep How to play, Statistics, and Theme visible in their permanently allocated tool columns.
- Report the live bundled player count beside the game introduction and include it in no-match
  search feedback. The promoted roster now resolves previously absent searches for Kahleah Copper,
  Cameron Brink, Kate Martin, and Rae Burrell.
- Let the same autocomplete search accept team codes such as `GSV`, returning that team's bundled
  roster alphabetically while continuing to exclude players already guessed.
- Refresh [screenshots/wnba_pickle_feedback.png](screenshots/wnba_pickle_feedback.png) from the
  built site in a compact 1000x900 viewport with all nine guess slots, abbreviated USA,
  default-hidden match words, and blue close feedback. Record responsive heuristic evidence in
  [active_plans/reports/difficulty_and_fun.md](active_plans/reports/difficulty_and_fun.md).
- Extend the offline difficulty probe and report with the new nine-guess limit while retaining the
  smaller limits as comparison evidence for later score calibration.
- Replace the blocked WNBA Stats Angular-shell acquisition path with the proven Python-only,
  server-rendered Basketball-Reference WNBA HTML path. The bounded `--max 3` run found 15 teams,
  223 current totals rows, 182 prior totals rows, and three derived test-limit candidates; it does
  not claim a full refresh, cutoff decision, or public data-use approval.
- Keep the single `get_page()` boundary GET/HTML-only and pace requests at least three seconds plus
  random jitter, below Sports Reference's published other-sites cap. Document that candidates and
  snapshots from this path are derived rather than official WNBA data and require human data-use
  review before public deployment.
- Use neutral bundled-player-pool copy in gameplay status; browser text does not expose the private
  recognizability metric or claim the derived snapshot is an official WNBA feed.
- Anchor private candidate output paths to the repository's ignored `data/private/` directory,
  independent of the caller's working directory.
- Repair the package clean command, consolidate shared guess-limit and theme types, and remove an
  unused storage method.
- Make unit and browser tests follow configured clues and a fixed UTC test clock, and correct stale
  data-pipeline documentation paths and acquisition wording.
- Document the all-player manual harvester's progress output, randomized per-request pacing, and
  `-m` / `--max` plumbing limit. Only a limit that actually truncates the roster writes the
  separately named `test-limit` private file; stage two rejects that scope.
- Supersede the rejected WNBA-profile `FROM_YEAR` route: the active Basketball-Reference harvester
  treats a missing prior-season total as zero for both rookies and returning veterans.
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
- Prioritize a fun, clear win/loss guess loop over exact Pickle or pixel parity. The game ships a
  verified 136-player derived roster selected at the approved 300-point two-season cutoff.
- Keep all future roster and statistics gathering in the separate Python pipeline. Browser
  runtime and Playwright use only static development or committed snapshot data.
- Keep nine scored guesses as the human playtest decision; calibrate the score against the real
  derived-data pool instead of shortening the round.
- Preserve the WNBA Stats player-page and throttled `commonplayerinfo` observations as rejected
  route evidence only; they are not inputs to the active Basketball-Reference acquisition path.
- Keep the complete 206-player candidate pull private and ship only the validated 136-player game
  snapshot, which contains clue identity fields but no performance totals or source URLs.
- Preserve the WNBA traditional-page experiment as rejected evidence: it is a JavaScript-populated
  Angular shell without server-rendered player rows, so the harvester never uses its JSON/API
  requests or a browser fallback.

### Validation

- Pass the TypeScript and Node checks through `./check_codebase.sh` and the gameplay browser
  journeys through `./run_playwright_tests.sh --build` against the bundled derived data.
- Keep data acquisition validation in Python; no browser test is a source of roster or
  statistics evidence.
