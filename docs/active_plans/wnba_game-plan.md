# Plan: WNBA daily player-guessing game

## Context

`wnba-20-questions` is a fresh `REPO_TYPE=typescript` scaffold with no `src/` yet.

**North star: this is MLB Pickle for the WNBA.** [mlbpickle.com](http://www.mlbpickle.com/)
is the reference implementation, and the only deliberate departures are the ones
basketball and the WNBA brand force: basketball-relevant clue columns, a conference in
place of league-and-division, a guess count matched to a much smaller player pool, and
the four-color WNBA palette in place of Pickle's green/yellow/gray. Everything else
copies Pickle. The comparison grid IS the twenty-questions mechanic; no separate yes/no
question system ships in v1.

All player data is pulled offline and committed to the repo as JSON, bundled into
`dist/` at build time. The published page makes zero network calls, which is what makes
a static GitHub Pages deployment viable.

An earlier draft (`plan_draft.md`) locked most of the product surface. This plan supersedes
it and changes four things the draft got wrong or left
unresolved:

1. **Data comes from JSON embedded in public stats.wnba.com HTML pages wherever
   available, with any additional source selected and documented by WP-1.2.** The player
   page is the proven case, not necessarily the whole dataset: enumerating the league and
   obtaining per-season minutes may require team pages, a league page, or a limited,
   heavily paced REST call. The direction is page-first; the full source list is WP-1.2's
   output. A working prototype already exists at `fetch_wnba_player_data.py`: it requests
   `https://stats.wnba.com/player/<id>/` with a browser user agent and pulls the
   `window.nbaStatsPlayerInfo`, `window.nbaStatsPlayerStats`, and
   `window.nbaStatsPlayerSeasons` assignments out of the HTML. That is structured JSON
   carrying every biography field the game needs, it needs no account, and it uses only the
   Python standard library.

   The page route is not a stylistic preference, it is the route that works.
   `https://stats.wnba.com/player/1628932/` loads immediately, while the equivalent REST
   call `https://stats.wnba.com/stats/commonplayerinfo?LeagueID=10&PlayerID=1628932` gets
   throttled. Every data-lane decision in this plan therefore prefers an HTML page carrying
   embedded JSON over a `/stats/` REST path, and treats REST as a last resort that must be
   paced heavily and proven to survive a full run before anything depends on it.

   The route is also undocumented and can change without notice, so the production fetcher
   records the retrieved field structure on every run and fails clearly when a required
   field moves or disappears. Authenticated commercial feeds (Sportradar and similar) are
   ruled out: they require an account, which the user has declined.
2. **Guess count 9 -> 6, the one deliberate gameplay departure.** MLB Pickle draws from
   1000+ players. Active WNBA rosters are roughly 180 players (15 teams after the 2026
   Portland Fire and Toronto Tempo expansion, 12 roster spots each). Nine guesses against
   180 candidates is trivial.
3. **Pickle behavior is observed, not guessed.** Where this plan is silent, the answer is
   whatever mlbpickle.com does. WP-1.4 records the real behavior before any gameplay code
   is written.
4. **The clue list and answer pool are designed for WNBA fans.** Age remains, and overall
   Draft pick joins Draft year as a separate clue, giving the baseline game nine clues.
   The grid is driven by configured clue definitions rather than an eight-column limit.
   Separately, a current-roster player is only a candidate; WP-1.3 selects a recognizable
   answer and autocomplete pool so daily play is not dominated by unfamiliar names.

This revision incorporates an external plan review. The material changes are recorded in
`## Resolved decisions` and in the work packages: the guess count no longer reverts to
nine, the calibration solver is fully specified, stale-puzzle handling is explicit,
completion state has one owner, and the primary responsive target is a portrait viewport
rather than a 320-pixel minimum. The roster data model was also simplified to a single
committed file, with no versioning, manifest, activation dates, or structure
fingerprinting: puzzles reset daily, so none of that machinery earns its keep.

The first pool stage is eligibility. Earlier versions required a human to
verify each player's contract class (standard versus hardship, seven-day, replacement, or
camp). Nothing in the available data states contract class, so that review would have been
manual, unbounded, and stale within a week of any transaction. Eligibility is now a
reproducible rule computed from the committed data: a player is eligible when she is listed
on a current team roster and has recorded recent WNBA minutes. Minutes are used only as a
build-time filter and never ship as a clue or appear in the snapshot -- the user's rule
that no performance statistic reaches the game still holds.

Eligibility does not imply recognizability. A roughly 180-player roster pool risks turning
the game into repeated encounters with names a typical fan does not know. The user reports
that the Panini Donruss base set carries roughly 100 players, including rookies; that is a
useful observation about the likely scale of a recognizable pool, not a data source or a
gate. Card checklist data may be difficult to obtain and blocks nothing. WP-1.3 instead
inspects the top 75, 100, 125, and 150 current-roster players by recent two-season minutes,
shows the boundary names, and brings a recommended answer pool to the user. A readily
verifiable card checklist may appear as optional context only. The answer pool and
autocomplete use the same selected players, so obscure candidates cannot become optimal
information-gain guesses.

## Objectives

- Ship a playable daily WNBA guessing game served from `dist/` on GitHub Pages, with no
  runtime backend and no runtime network calls.
- Match observed MLB Pickle behavior on every interaction the two games share.
- Make roster eligibility reproducible, then select a recognizable answer and guess pool
  from those candidates using a measured, reviewable rule.
- Calibrate the guess count against a measured solve distribution from a specified solver,
  rather than an assumed number.
- Make the clue set recognizable to WNBA fans and interesting to learn from, then measure
  each clue's deduction value and redundancy instead of preserving MLB's column count.
- Preserve in-progress games, statistics, and streaks across refreshes, with an
  in-progress puzzle that resets cleanly when the day rolls over.
- Deliver an accessible portrait-first light and dark theme built only from the four
  supplied WNBA brand colors and their opacity variants.

## Design philosophy

**The Pickle parity rule.** Where this plan is silent or ambiguous, do what
mlbpickle.com does. This settles most interface and interaction questions without a round
trip to the user. It is overridden only by an explicit entry in `## Resolved decisions`,
or where basketball has no equivalent (the WNBA has conferences, not league-and-division;
handedness is meaningless in basketball). A parity question that WP-1.4 did not record is
escalated, not invented. The parity rule governs interface and interaction; it does not
reopen a decision the user has already made.

**The WNBA identity rule.** College is a defining WNBA clue, not a generic biography
substitute: programs such as Connecticut, South Carolina, Stanford, Notre Dame, Tennessee,
Baylor, and Iowa immediately locate a player in the league's culture. Draft year and
overall Draft pick remain separate because they answer different questions: era and entry
expectation. Age remains as a useful Pickle-parity clue, but it is not assumed to be fan
knowledge. The game may teach a compact fact as long as the clue produces meaningful
deduction. No arbitrary column count overrides that test.

The governing trade-off: **a recognizable answer pool beats a complete roster.** A full
current roster is correct but may not be fun: a deduction game fails when the answer and
the useful guesses are mostly unknown names. This plan keeps current-roster membership as
a hard eligibility gate, then intentionally selects the familiar part of that pool. The
rejected alternative is treating every eligible player as equally suitable for daily play.

Two repo core philosophies from `docs/REPO_STYLE.md` carry weight here:

- **Use the scientific method.** Pool size, guess count, arrow presence, Draft-pick
  tolerance, and each clue's marginal value are hypotheses. WP-1.3 and WP-5.1 measure them
  and the plan updates from the evidence.
- **Fix the design, not the symptom.** Roster data is a reviewed build-time artifact,
  never a runtime fetch with a fallback. Eligibility is a rule recomputed from that data,
  not a human judgment cached in a spreadsheet; a player who fails the rule is excluded,
  and there is no "assume active" path.

Evidence strategy for uncertain methods:

- Pickle behavior is proved by direct observation (WP-1.4).
- WNBA clue identity is evaluated in WP-1.4 with a fan-salience and data-quality matrix;
  WP-5.1 then measures each selected clue's information gain and redundancy.
- Data source viability is proved by a bounded multi-team, multi-player probe (WP-1.2) that
  also characterizes request pacing and access behavior. The probe's first job is finding a
  page-based enumeration route, because the REST family is already known to throttle.
- Recognizability is tested in WP-1.3 by comparing recent-minutes pools at 75, 100, 125,
  and 150 players and showing named boundary players. The Donruss observation motivates
  the experiment but supplies no required data and no pass/fail criterion.
- Difficulty is proved by a specified, reproducible solver over the real snapshot (WP-5.1).
- Palette contrast is proved by measured ratios against actually-rendered backgrounds
  (WP-5.5).

## Scope

- Build a one-page TypeScript browser game with search, autocomplete, a "Pick for me"
  helper, a configurable comparison grid, statistics, a result dialog, and share output.
- Present one deterministic mystery player per UTC day, selected from a committed roster
  snapshot, with six guesses (subject to the WP-5.1 calibration gate, bounded to 5 to 7).
- Evaluate nine baseline clues: Team, Conference, Height, Draft year, Draft pick, Country,
  College, Age, and Position, with exact and partial states and directional arrows on the
  ordinal clues per the WP-1.4 adaptation rule. Keep clue count configurable; WP-1.4 may
  recommend additional compact WNBA-natural clues before the type contracts freeze.
- Build a two-stage Python 3.12 data pipeline that stands entirely apart from the game:
  fetch candidates from the stats.wnba.com pages into an ignored working file, then apply
  the computed eligibility rule and emit a versioned, validated snapshot JSON committed to
  the repo. The game consumes only that file; no build or test step ever runs the fetcher.
- Compute a current-roster candidate pool, rank it by recent two-season minutes, and apply
  the WP-1.3 recognizability rule to both the answer pool and autocomplete. Minutes stay in
  the working file and never enter the shipped snapshot.
- Persist puzzle progress, statistics, guess distribution, streaks, and theme under one
  versioned localStorage key, with an in-progress puzzle bound to its originating
  snapshot.
- Ship light and dark themes from the four WNBA brand colors, meeting stated contrast
  targets, documented in a palette audit.
- Optimize the layout for a portrait viewport (800x1280) as the primary acceptance target
  across platforms, and verify it scales on representative phone, tablet, and large
  desktop viewports.
- Produce a `dist/` artifact ready for GitHub Pages, built by the existing
  `build_github_pages.sh`.

## Non-goals

- Build a yes/no question mode. The grid carries the elimination mechanic in v1; the clue
  engine keeps a documented seam so a question bank can layer on later.
- Include players who are not on a current roster or outside the WP-1.3 recognizable-pool
  rule in either the answer pool or autocomplete.
- Ship any performance statistic as a clue or a snapshot field: points, rebounds, assists,
  rankings, fantasy values, efficiency metrics, or minutes. Minutes exist only in the
  gitignored working file, as the eligibility filter.
- Research contract class by hand. No manual per-player contract review is performed.
- Fetch data at runtime, run a server, add authentication, or synchronize across devices.
- Ship team logos, player headshots, handedness, audio, or animation-heavy presentation.
- Cap the clue list at eight or preserve MLB's table width when another compact clue makes
  the WNBA game better.
- Show Draft round as its own clue. Overall Draft pick supplies the useful entry signal.
- Require trading-card checklist data for a refresh or use card inclusion as a player gate.
- Add colors outside the four brand tokens: no purple, green, gold, team colors, or
  decorative gradients.
- Produce a `dist-single/` single-file export. GitHub Pages serves `dist/`.
- Offer unlimited mode, practice mode, historical puzzle archive, multiplayer, or hints.
- Optimize for viewports narrower than a modern phone. Very narrow widths are checked for
  graceful degradation only, never as a design target.
- Perform GitHub Pages account-level activation. Publishing is an operator action outside
  the software deliverable (see `## Rollout and release checklist`).

## Resolved decisions

Locked by the user or by this revision. Not reopened during execution.

| Decision | Value | Source |
| --- | --- | --- |
| North star | MLB Pickle for the WNBA; observed parity is the default answer | User requirement |
| Game mode | Pickle-style comparison grid only | User selection |
| Guesses per day | 6. Calibration may move it within 5 to 7. Nine is reference information only and does not re-enter automatically | User selection, narrowed by review |
| Candidate pool | Players listed on a current WNBA roster with recent participation data | User requirement, made measurable |
| Answer and guess pool | One recognizable subset selected by WP-1.3 from the same ranked candidates | User concern about unknown players |
| Recognizability experiment | Compare top 75, 100, 125, and 150 by recent two-season minutes, with named boundary players and user review | User decision |
| Trading cards | Motivation or optional context only; never a gate or required data source | User decision |
| Rookie treatment | Evaluated in the same ranked pool; WP-1.3 must call out recognizable rookies near or outside each boundary | User concern |
| Minutes visibility | Build-time filter only; never a clue, never a snapshot field | User rule on performance statistics |
| Data source | JSON embedded in stats.wnba.com HTML pages (`window.nbaStats*`), no account required | User selection, proven by the prototype |
| Retrieval route | Prefer HTML pages; `/stats/` REST is throttled and is a last resort requiring proven pacing | Observed behavior |
| Authenticated feeds | Ruled out; Sportradar and similar require an account | User decision |
| Data delivery | Pulled offline, committed as JSON, bundled into `dist/`; zero runtime fetches | User requirement |
| Handedness | Omitted; basketball has no equivalent of Pickle's bats/throws column | User guidance |
| Baseline clue fields | Team, Conference, Height, Draft year, Draft pick, Country, College, Age, Position | User decisions; Draft pick added without removing Age |
| Clue count | No hard maximum; one configured clue-definition list drives every consumer | User decision |
| Draft pick clue | Overall selection number, separate from Draft year; drafted and undrafted players supported | User decision |
| Draft round | Not displayed as its own clue | User decision |
| College clue | Exact match only, from `SCHOOL`; players with no US college share one normalized bucket | User request; sample confirms the field exists |
| Age clue | Retained alongside Draft pick; derived for the UTC puzzle date | User decision |
| Position match | Exact when primary equals primary; partial when the two players' full position sets overlap in either direction | Review point 7 |
| Country authority | ISO 3166 English short names, plus one committed override table for upstream spellings and territories | Review point 8 |
| Completion ownership | One pure transition in `src/game_state.ts` updates puzzle state and statistics together; dialog and share read it | Review point 25 |
| Primary viewport | 800x1280 portrait (10:16), across desktop and mobile | User decision |
| Palette | Ultra Black `#050707`, Neutral Dark Gray `#4C4C4D`, Balm `#EFE3C6`, Orange Passion `#F57B20` | Draft, retained |
| Pages activation | Operator action, outside the software deliverable | Review point 19 |

## Current state summary

- Repo is the bare TypeScript starter: no `src/`, no `tests/test_*.mjs`, and no
  `tests/playwright/*.spec.ts` (only `repo_root.mjs`).
- Front-door scripts exist and are executable: `check_codebase.sh`,
  `build_github_pages.sh`, `run_web_server.sh`, `run_playwright_tests.sh`,
  `devel/clean_build.sh`.
- Fourteen repo-hygiene pytest modules already exist under `tests/` (ASCII, whitespace,
  pyflakes, typing, shebangs, markdown links, naming conventions, bandit, README first
  paragraph). Every file this plan adds must pass them. Where an acceptance criterion
  below looks like a formatting rule, it is one of these existing repo checks, not a new
  gate.
- Two scaffold hazards to clear in M2:
  - `check_codebase.sh` step 2 runs `npx tsc --noEmit -p tsconfig.lint.json`, whose
    include list is `tests/**/*.ts` and `tools/**/*.ts`. The repo has neither, so the step
    exits 2 with `TS18003`.
  - `pip_requirements.txt` does not exist (only `pip_requirements-dev.txt`).
    `tests/test_import_requirements.py` fails as soon as the pipeline imports `requests`.
- The current plan is filed at `docs/active_plans/wnba_game-plan.md`; the superseded
  `plan_draft.md` has already been retired.
- A working data prototype already exists at the repo root: `fetch_wnba_player_data.py`
  plus its output `wnba_player_samples.json`. It proves the retrieval path end to end for
  three known players. Two limits to carry into M3:
  - It fetches by hard-coded player id. Nothing yet enumerates the current league, which is
    the largest remaining unknown and a named WP-1.2 question.
  - `extract_json_value` ends each JSON value at the first `;` after the assignment. That
    holds for the sampled players but breaks on any value containing a semicolon inside a
    string. WP-3.1 replaces it with `json.JSONDecoder().raw_decode`, which stops at the real
    end of the value.
  - It imports only `json`, `time`, `random`, `pathlib`, and `urllib.request`, all standard
    library. `pip_requirements.txt` is therefore needed only if the production pipeline adds
    a third-party import; if the stdlib path holds, the file is still created but lists no
    fetch dependency.

## Data inventory

One committed roster file at `src/data/roster.json`, imported by the bundle so `dist/` is
self-contained.

A real three-player sample of `commonplayerinfo` output is already in the repo at
`wnba_player_samples.json` (A'ja Wilson, Caitlin Clark, Breanna Stewart). It confirms the
field names and formats in the table below, so the plan no longer guesses at them. It also
confirms three things worth stating plainly: `SCHOOL` is present, which is what makes the
College clue possible; `DRAFT_NUMBER` is present, which makes overall Draft pick available;
and `headline_stats` carries `PTS`, `AST`, `REB`, and `PIE`, which is exactly the payload
the field allowlist exists to drop.

| Field | Type | Upstream key | Notes |
| --- | --- | --- | --- |
| `playerId` | branded string | `PERSON_ID` | Stable league person id; the join key. Sample: `1628932` |
| `displayName` | string | `DISPLAY_FIRST_LAST` | Proper display form, apostrophes preserved. Sample: `A'ja Wilson` |
| `searchName` | string | derived | Lowercased, punctuation and diacritics stripped |
| `teamCode` | string | `TEAM_ABBREVIATION` | Sample: `LVA`, `IND`, `NYL` |
| `conference` | `"East" \| "West"` | derived | Static team-to-conference table in `src/constants.ts` |
| `heightInches` | number | `HEIGHT` | Upstream is feet-dash-inches. Sample: `6-4`, `6-0` |
| `birthDateUtc` | ISO date string | `BIRTHDATE` | Sample: `1996-08-08T00:00:00`. Age is derived from this for the puzzle date by the clue engine; the upstream `AGE` field is deliberately unused, because it is current-day and not puzzle-day |
| `draft` | discriminated union | `DRAFT_YEAR`, `DRAFT_NUMBER` | Drafted players carry year and overall pick. Both are strings upstream; the sample confirms `"2018"` and `"1"`. The undrafted spellings remain a WP-1.2 question |
| `country` | string | `COUNTRY` | Sample: `USA`. Normalized per the country authority above |
| `college` | string | `SCHOOL` | Sample: `South Carolina`, `Iowa`, `Connecticut`. `LAST_AFFILIATION` (`Iowa/USA`) is the cross-check for players with no US college |
| `positionPrimary` | `"G" \| "F" \| "C"` | `POSITION_INITIALS` | Sample: `C`, `G`, `F` |
| `positionAlternates` | ordered array | `POSITION` | Upstream is a full word in all three samples (`Center`, `Guard`, `Forward`), so alternates are empty for them. Compound spellings may exist for other players; WP-1.2 reports the league-wide value set |

Roster file envelope: `schemaVersion`, `asOfDateUtc`, `sourceNote`, `selectionRule`,
`players[]`. The `selectionRule` field records the current-roster gate, ranking quantity,
seasons used, and selected pool size, so the shipped file states the rule that produced it.

### Stable game-facing interface

One file at one fixed path: `src/data/roster.json`. The game imports that path and nothing
else; the generator overwrites it. A refresh is a data-only commit, with no TypeScript
edit and no manifest to keep in sync. The bundler inlines it, so `dist/` stays
self-contained.

There is no snapshot versioning, no manifest, no scheduled activation date, and no
field-structure fingerprint. The data is the data: whatever is committed is what the game
plays. This is deliberate simplicity, and it is affordable because of the daily reset
below.

### Old in-progress games

An in-progress puzzle lives at most one UTC day. The next day is a different puzzle, so a
stale in-progress game is discarded on load rather than resumed. That reset is a normal
daily event, not an error path, and it is what makes snapshot retention a non-problem: no
old roster file ever needs to be kept, because no puzzle outlives the day it began on.

Two details keep the one remaining edge case clean:

- The save records each guess's evaluated `CellFeedback` row alongside the guessed player,
  so rows already on screen redisplay from the save itself without looking any record back
  up.
- The save records the puzzle's UTC date and its target `playerId`. On load, a puzzle whose
  date is not today is discarded, with no loss recorded. If the roster file changed under an
  open puzzle and its target is no longer present, the same discard applies.

Completed puzzles keep their statistics contribution regardless; only unfinished ones
reset.

The importer allowlists field names rather than blocklisting them, so a new upstream
statistic cannot leak in silently.

Working-file-only fields, present in the gitignored candidate file and deliberately absent
from the shipped snapshot: `minutesCurrentSeason`, `minutesPreviousSeason`, `ROSTERSTATUS`,
`GAMES_PLAYED_CURRENT_SEASON_FLAG`, `TO_YEAR`, `SEASON_EXP`, `DRAFT_ROUND`, the whole
`headline_stats` block, and the raw upstream country and school strings. These support pool
selection and normalization and stop there.

Candidate eligibility is computed, not reviewed. A player enters the ranked candidate set
when both hold:

- She appears on a current team roster, per whichever enumeration route WP-1.2 proves.
  Roster membership is the source of truth for "is she on a team right now".
- The pipeline has complete current- and previous-season participation data for her. A zero
  is valid data; a missing record is not.

The recognition ranking is the sum of current- and previous-season minutes. WP-1.3 inspects
the top 75, 100, 125, and 150 rather than assuming a cutoff. For each boundary it lists the
players just inside and outside, calls out recognizable veterans and rookies that the metric
may underrank, and reports months before a guaranteed repeat. The user then approves the
pool size or asks for a different reproducible ranking rule. The selected set becomes both
the answer pool and the autocomplete pool.

The Donruss observation motivates this experiment but never enters the algorithm. If a
current checklist is easy to verify, the report may state overlap as context. If it is not,
the report proceeds unchanged and card data is absent from the pipeline, snapshot, and
release gates.

`ROSTERSTATUS` (`Active` in all three samples) is supporting evidence, not a mandatory
second gate. If roster enumeration is authoritative, the field adds nothing, and it could
actively harm accuracy if the player page updates on a different cadence than the roster
source. WP-1.2 reports its distinct values and whether it ever disagrees with roster
membership; it is promoted to a filter only if that evidence shows it improves accuracy.

The minutes fields are the one part of this rule the sample does not confirm:
`headline_stats` carries `PTS`, `AST`, `REB`, and `PIE` but no minutes, so per-season
minutes must come from another endpoint. Confirming that endpoint is a named WP-1.2
deliverable. If no per-season minutes endpoint is reachable without an account, the
fallback is games played, using `GAMES_PLAYED_CURRENT_SEASON_FLAG` plus a per-season games
count, with WP-1.3 ranking the same candidate pool by two-season games instead. The
experiment's shape does not change; only the ranking quantity does.

Two seasons are used because a single-season ranking would bury established players,
injured players, and offseason acquisitions early in a season before they accumulate
minutes. A rookie has zero previous-season minutes and is ranked by current minutes; the
WP-1.3 boundary review makes any recognizability failure visible rather than hiding it in a
special-case rule.

`data_review/eligibility_overrides.csv` (committed, expected to stay empty or near-empty):
`playerId`, `displayName`, `forceEligible`, `reason`, `reviewDateUtc`. This is an escape
hatch for a genuine roster-data error, not a fame ranking or review workflow. The generator
reports every override it applied so an accumulating override list is visible rather than
silent.

## Architecture boundaries and ownership

### The data pipeline is a separate program from the game

The roster tooling and the game share exactly one thing: a committed JSON file and its
documented schema. Nothing else crosses that line.

- Different languages, no shared code. The pipeline is Python under `tools/`; the game is
  TypeScript under `src/`. Neither imports from the other, and no build step runs the
  fetcher.
- Different commands. `./check_codebase.sh`, `./build_github_pages.sh`, and
  `./run_playwright_tests.sh` never fetch anything and never need network access. The
  refresh is its own invocation, run by a maintainer when rosters change.
- Different cadence. A data refresh happens on roster churn; a game change happens on
  feature work. Either can ship without the other. Refreshing data requires no game edit,
  and editing the game requires no refetch.
- One direction of dependency. The game reads the snapshot; the pipeline knows nothing
  about the game. The pipeline's correctness is judged entirely by whether it emits a valid
  snapshot, which is why it has its own pytest suite and its own validator.
- The published page inherits the separation. It ships a static snapshot and makes no
  request at runtime, which is what allows a static GitHub Pages deployment with no key,
  no backend, and no rate limit exposure for players.

The practical test: if the WNBA data route disappears tomorrow, the game still builds,
still passes its gates, and still plays the last committed snapshot.

Three specific ways this separation gets eroded later, none of which are permitted: sharing
normalization code between the Python pipeline and the TypeScript game, invoking Python
from a build or test script, and writing a test that depends on live data. Normalization
belongs to the pipeline, and the game trusts the validated snapshot instead of
re-normalizing it.

### Lane ownership

Each lane below owns a named file set and publishes a named interface. Lanes read each
other's published interfaces and write only their own files; a lane that needs a change
inside another lane's files requests it through the orchestrator.

- `src/types/*.ts` is written once, before any parallel dispatch, and stays
  orchestrator-owned. An agent needing a new cross-module shape pauses and invokes
  `typescript-engineer`.
- `src/data/` snapshot JSON has one producing owner (the data lane) and is read-only
  everywhere else.
- The clue engine and daily selection are pure: records in, feedback out. No DOM, no
  storage, no clock; the UTC date is a parameter. This is what makes the solver simulation
  and the unit tests possible.
- One ordered clue-definition list owns clue identity, labels, comparison behavior, and
  display format. The grid, solver, share output, and tests iterate that list; none encodes
  a column count.
- `src/game_state.ts` owns the authoritative game transitions: accept-or-reject a guess
  (including the duplicate rule) and the single active-to-won-or-lost completion step that
  updates puzzle state and statistics together. The dialog, share, and interaction modules
  read that state rather than deriving completion themselves.
- Randomness has exactly two injected sources: the daily-selection seed and the
  "Pick for me" RNG. No module calls `Math.random()` directly.

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream | Component | Review boundary |
| --- | --- | --- |
| M1 / WS-A0 | `src/types/*.ts`, `src/brands.ts` | Orchestrator-owned for the whole build |
| M1 / WS-Q | Probe, recognizability, parity, and clue-identity reports under `docs/active_plans/reports/` | Observation and reporting; writes no product code |
| M2 / WS-F | `src/main.ts`, `src/index.html`, `src/style.css`, `src/constants.ts`, a development `src/data/roster.json`, `tsconfig.lint.json`, `pip_requirements.txt`, `tests/playwright/smoke.spec.ts` | Sequential; unblocks every parallel lane without waiting on real data |
| M3 / WS-D | `tools/*.py`, `data_review/`, `src/data/`, `tests/test_roster_snapshot.py` | Python lane; publishes the snapshot |
| M3 / WS-U | `src/ui_grid.ts`, `src/ui_controls.ts`, `src/style.css`, `src/index.html` | Presentation; publishes render functions |
| M3 / WS-P | `src/save_load.ts`, `src/stats_state.ts` | Storage; publishes load, save, and counter updates |
| M4 / WS-G | `src/daily_puzzle.ts`, `src/clue_engine.ts`, `src/game_state.ts` | Pure logic; publishes selection, evaluation, and transitions |
| M4 / WS-I | `src/search_index.ts`, `src/interaction.ts` | Input handling; consumes WS-G and WS-U |
| M4 / WS-T | `tests/test_*.mjs` | Tests; reports needed production changes rather than making them |
| M5 / WS-R | `src/result_dialog.ts`, `src/share.ts` | Reads completed state; creates none |
| M5 / WS-Q | `tests/playwright/*.spec.ts`, `tools/simulate_difficulty.mjs`, `docs/PALETTE_CONTRAST_AUDIT.md` | Verification and measurement |
| M5 / WS-X | `README.md`, `docs/*.md` | Documentation |

## Milestone plan

| M | Title | Summary | Goal |
| --- | --- | --- | --- |
| M1 | External assumptions and contracts | Prove the endpoints, select a recognizable pool, record Pickle and WNBA clue evidence, write shared types | No lane starts on an unproven assumption |
| M2 | Foundation and build shell | Booting page, constants, development snapshot, scaffold hazards cleared, first smoke spec | The game builds and renders against schema-valid data while the data lane still investigates |
| M3 | Infrastructure batch | Data pipeline, interface shell, persistence in parallel | A real committed snapshot, a rendered grid, working storage |
| M4 | Core gameplay batch | Selection, clue engine, game state, interaction, tests | A complete win path and a complete loss path |
| M5 | Calibration and release batch | Difficulty measurement, result and share, QA, docs | Guess count locked by measurement; Pages-ready `dist/` |

### Milestone: M1 external assumptions and contracts

- Depends on: none.
- Deliverables: `src/types/*.ts` and `src/brands.ts`; an API field-inventory, access, and
  minutes-pull report; a recognizable-pool decision report; an observed-Pickle-behavior and
  WNBA-clue report; a data-use decision record.
- Entry criteria: none.
- Exit criteria: `npx tsc --noEmit -p tsconfig.json` succeeds on the types alone; the API
  report confirms every inventory field across a multi-team sample, characterizes request
  pacing, and supplies a league-wide minutes pull; the pool report compares 75, 100, 125,
  and 150 players, names boundary players, and records the user's approved rule; the parity
  and clue report answers every question WP-1.4 lists; the data-use record states whether
  public deployment proceeds.
- Done checks: three reports and one decision record committed; types compile.
- Parallel-plan ready: partly. WP-1.2 and WP-1.4 begin independently; WP-1.3 depends on
  WP-1.2's minutes pull, WP-1.1 depends on WP-1.4's clue decision, and WP-1.5 depends on
  WP-1.2's access findings.

### Milestone: M2 foundation and build shell

- Depends on: WP-1.1 for the contracts and WP-1.4 for parity. It does NOT wait on the data
  investigation: WP-1.2, WP-1.3, and WP-1.5 continue in the background while M2 proceeds
  against the development snapshot.
- Deliverables: `src/main.ts`, `src/index.html`, `src/style.css` with palette custom
  properties, `src/constants.ts` with the team-to-conference table,
  a development `src/data/roster.json`,
  `tests/playwright/smoke.spec.ts`, `pip_requirements.txt`, a working
  `tsconfig.lint.json`, and the active plan kept current at
  `docs/active_plans/wnba_game-plan.md`.
- Entry criteria: WP-1.1 and WP-1.4 complete.
- Exit criteria: `./check_codebase.sh` reports every step PASS or an explained SKIP;
  `./build_github_pages.sh` emits `dist/main.js`, `dist/index.html`, `dist/.nojekyll`;
  `./run_playwright_tests.sh --build` passes the boot smoke with no console or page errors.
- Done checks: command output for all three.
- Parallel-plan ready: no. Serial foundation across three shared files.

### Milestone: M3 infrastructure batch

- Depends on: M2 for WS-U and WS-P; additionally WP-1.2 and WP-1.3 for WS-D, since the
  pipeline cannot be written before enumeration and the minutes source are known.
- Deliverables: WS-D (pipeline plus the first real committed snapshot), WS-U (grid and
  controls rendering from the development snapshot), WS-P (versioned save and statistics
  state).
- Workstreams: WS-D, WS-U, WS-P.
- Sequencing note: WS-U and WS-P start as soon as M2 lands and never wait on WS-D. They
  build against the development snapshot, which is schema-identical to the real one. If the
  data investigation runs long, this milestone's interface and storage halves still complete
  and M4's pure logic can also proceed; only the M4 exit criteria, which require the real
  answer pool, actually depend on WS-D finishing.
- Entry criteria: M2 exit criteria met for WS-U and WS-P; `src/types/` frozen for the batch.
- Exit criteria: a real committed snapshot passes its validator; the grid renders rows
  in both themes at the primary viewport; storage round-trips and recovers from malformed
  data.
- Done checks: `./check_codebase.sh` passes; `source source_me.sh && python3 -m pytest tests/`
  passes; the M2 smoke still passes.
- Parallel-plan ready: yes. Three disjoint file sets over one read-only contract. WS-D is
  the most independent lane in the plan: it shares no code with the other two and could run
  earlier or later without disturbing them, as long as a snapshot exists before M4 needs a
  real pool.

### Milestone: M4 core gameplay batch

- Depends on: M3's interface and storage halves. The pure logic in WS-G and the tests in
  WS-T need only the contracts and a schema-valid snapshot, so they can be built against the
  development snapshot while WS-D finishes.
- Deliverables: WS-G (daily selection, clue evaluation, game state and completion), WS-I
  (search, autocomplete, keyboard, "Pick for me", wiring), WS-T (unit tests).
- Workstreams: WS-G, WS-I, WS-T.
- Entry criteria: WS-U and WS-P complete. The real snapshot is required to satisfy the exit
  criteria, not to start the work.
- Exit criteria: a full win path and a full loss path are playable in the browser; the
  same UTC day and snapshot yield the same answer across reloads; a duplicate guess
  consumes no attempt.
- Done checks: `./check_codebase.sh` passes; Playwright win-path and loss-path specs pass.
- Parallel-plan ready: yes, with WS-T staggered. WS-T authors cases against the contracts
  while WS-G implements, then binds and runs them once WS-G exports are stable. Treat
  WS-T's first half as parallel and its second half as dependent on WP-4.1, WP-4.2, and
  WP-4.4.

### Milestone: M5 calibration and release batch

- Depends on: M4.
- Deliverables: WS-Q (difficulty measurement, Playwright coverage, accessibility and
  contrast audit), WS-R (result dialog, share with clipboard fallback), WS-X (README,
  data-refresh runbook, changelog).
- Workstreams: WS-Q, WS-R, WS-X.
- Entry criteria: M4 exit criteria met.
- Exit criteria: the guess count matches the WP-5.1 decision rule; no critical or serious
  accessibility violation remains; every documented contrast pair meets its target; the
  release checklist is complete.
- Done checks: the four release commands pass; the contrast audit records measured values;
  an independent `reviewer` agent signs off on `dist/`.
- Parallel-plan ready: yes. WS-X and WS-Q are read-only against `src/`; WS-R owns two new
  files. Note that WP-5.6 waits on WP-5.1 for the final guess count.

## Workstream breakdown

### Workstream: WS-A0 types and contracts

- Goal: one authoritative set of cross-module shapes.
- Owner: orchestrator, with `typescript-engineer` for type design.
- Work packages: WP-1.1.
- Needs: nothing.
- Provides: `PlayerId` and `PuzzleNumber` brands; `Conference`; `PositionCode`;
  `DraftInfo`; `ClueId`; `ClueDefinition`; `PlayerRecord`; `RosterSnapshotV1`;
  `CellFeedback`; `GuessEvaluation`; `DailyPuzzleState`; `SaveDataV1`; `KeyValueStore`.
- Review boundary: a mid-batch contract change requires re-running the typecheck for every
  lane before the batch is green.

### Workstream: WS-D roster data pipeline

- Goal: a versioned, validated snapshot produced by the approved recognizable-pool rule and
  carrying no performance fields.
- Owner: `coder` (Python 3.12).
- Work packages: WP-3.1, WP-3.2, WP-3.3.
- Needs: the WP-1.2 field inventory, the WP-1.3 pool-selection rule, and the roster JSON
  schema published in prose by WP-1.1.
- Provides: `src/data/roster.json`, plus the validator and the refresh commands. That one
  fixed path and its documented schema are the lane's entire public surface; a refresh
  rewrites data, never TypeScript.
- Review boundary: owns `tools/*.py`, `data_review/`, `src/data/`, and its own pytest
  module. It imports nothing from `src/*.ts` and nothing in `src/*.ts` imports from it; the
  game reads the JSON through the WP-1.1 validator and never reaches into the pipeline.

### Workstream: WS-U interface shell

- Goal: the grid, the controls, and both themes at the portrait primary viewport.
- Owner: `coder`, with `ui-ux-engineer` guidance.
- Work packages: WP-3.4, WP-3.5.
- Needs: `CellFeedback` and `PlayerRecord`.
- Provides: `render_grid`, `render_controls`, and the palette custom properties.
- Review boundary: owns the presentation files; game rules live in WS-G.

### Workstream: WS-P persistence and statistics

- Goal: durable, recoverable, versioned state.
- Owner: `coder`.
- Work packages: WP-3.6, WP-3.7.
- Needs: `SaveDataV1` and `KeyValueStore`.
- Provides: load, save, migrate, and the counter updates that WS-G's completion step calls.
- Review boundary: owns storage; touches no DOM and performs no completion decision.

### Workstream: WS-G gameplay logic

- Goal: deterministic selection, correct clue evaluation, and one authoritative completion
  transition.
- Owner: `expert_coder`. The tolerance rules and the completion invariants are the subtle
  part.
- Work packages: WP-4.1, WP-4.2, WP-4.4.
- Needs: the snapshot from WS-D and the counters from WS-P.
- Provides: `select_daily_player`, `evaluate_guess`, `submit_guess`, and `complete_puzzle`.
- Review boundary: pure functions; no DOM.

### Workstream: WS-I interaction

- Goal: search, autocomplete, keyboard parity, and the wiring from keystroke to grid row.
- Owner: `coder`.
- Work packages: WP-4.3, WP-4.5.
- Needs: WS-U rendering and WS-G transitions.
- Provides: the wired input path.
- Review boundary: owns search and interaction; game rules stay in WS-G.

### Workstream: WS-T tests

- Goal: durable behavioral coverage of the rules.
- Owner: `tester`.
- Work packages: WP-4.6.
- Needs: the contracts, then the WS-G exports.
- Provides: `tests/test_*.mjs`.
- Review boundary: reports a needed production change to the orchestrator rather than
  making it.

### Workstream: WS-R result and share

- Goal: end-of-game presentation and shareable output.
- Owner: `coder`.
- Work packages: WP-5.2, WP-5.3.
- Needs: the completed state produced by WS-G and the counters held by WS-P.
- Provides: the result dialog and the share text.
- Review boundary: reads completed state; never creates it.

### Workstream: WS-Q quality, measurement, and accessibility

- Goal: measured proof the shipped page is correct, difficult enough, and usable.
- Owner: `playwright_operator`, with `tester` for the minutes and solver analyses and
  `image_evaluator` for the visual pass.
- Work packages: WP-1.2, WP-1.3, WP-1.4 (in M1), WP-5.1, WP-5.4, WP-5.5.
- Needs: browser and network access in M1; a complete playable build in M5.
- Provides: the M1 reports, the approved pool rule, the calibration report, the Playwright
  suite, and the contrast audit.
- Review boundary: owns `tests/playwright/` after M2 hands over the smoke spec, plus the
  simulation tool and the audit doc.

### Workstream: WS-X documentation

- Goal: a repo someone else can refresh and redeploy.
- Owner: `coder`.
- Work packages: WP-5.6.
- Needs: the final command set, the final guess count, and the file layout.
- Provides: README, refresh runbook, changelog entries.
- Review boundary: documentation only.

## Work packages

### Work package: WP-1.1 write shared type contracts

- Owner: orchestrator with `typescript-engineer`.
- Touch points: `src/types/player.ts`, `src/types/puzzle.ts`, `src/types/save.ts`,
  `src/brands.ts`.
- Depends on: WP-1.4 (the selected clue definitions determine the cross-module contract).
- Acceptance criteria: every shape in the WS-A0 "Provides" list exists; snapshot JSON
  enters as `unknown` and passes through an explicit validator rather than a cast;
  the ordered clue-definition collection has no fixed length and is the only source of
  clue labels and identity; `DraftInfo` carries overall pick separately from year;
  `DailyPuzzleState` carries the puzzle's UTC date, the target `playerId`, and each guess's
  evaluated `CellFeedback` row, so a stale puzzle is detectable and already-played rows
  redisplay without a lookup; the typecheck succeeds.
- Evidence: the typecheck command, its exit status, and confirmation of zero diagnostics.
- Obvious follow-ons: publish the snapshot JSON schema in prose so WP-3.2 can target it
  without importing TypeScript.

### Work package: WP-1.2 probe API fields, access, and pacing

- Owner: `coder`.
- Touch points: `_temp_probe.py` (scratch, removed after), one report under
  `docs/active_plans/reports/`.
- Depends on: none.
- Already answered by `wnba_player_samples.json`, and not to be re-derived: the
  `commonplayerinfo` field names, the height format (`6-4`), the birthdate format
  (`1996-08-08T00:00:00`), the drafted representations (`DRAFT_YEAR` and `DRAFT_NUMBER` as
  strings), the team tricode field, the presence of `SCHOOL`, `COUNTRY`,
  `POSITION_INITIALS`, and `ROSTERSTATUS`, and the fact that `headline_stats` carries
  scoring lines that the allowlist must drop.
- Acceptance criteria: the report resolves the questions the sample leaves open, using a
  league-wide pull rather than three players:
  - How to enumerate every current player. The prototype fetches by hard-coded id, so this
    is the largest open question. Test HTML pages first, since those are the ones that load:
    a team page carrying an embedded roster JSON in the same `window.` style, then a
    league-wide players or roster page. Fall back to the `commonallplayers` and
    `commonteamroster` REST paths only if no page route exists, and if so report the pacing
    that survives a full-league run rather than a single successful call. Report the working
    route, its exact URL shape, and the record it returns.
  - Which source supplies per-season minutes, and a league-wide pull of minutes for the
    current and preceding seasons, so WP-1.3 has a real distribution. Check the player page
    routes first (the profile page already embeds `nbaStatsPlayerStats` and
    `nbaStatsPlayerSeasons`; a career or splits page may embed per-season totals the same
    way) before reaching for a `/stats/` path such as `leaguedashplayerstats`, which is in
    the throttled family. If no route yields minutes at acceptable cost, say so and pull
    per-season games played instead.
  - How an undrafted player is represented in both `DRAFT_YEAR` and `DRAFT_NUMBER` (all
    three samples are number one picks, so this is unconfirmed).
  - The full set of distinct `POSITION` values league-wide, which settles whether compound
    positions such as `Guard-Forward` exist at all, and therefore whether the Position
    partial state can ever trigger.
  - The full set of distinct `SCHOOL` values, including how players with no US college are
    represented (empty, a club name, or something else), plus the count of such players, so
    WP-3.2 can define the normalized bucket and the plan can judge whether the College
    column carries enough information.
  - The distinct raw `COUNTRY` values, so WP-3.2 can seed the override table.
  - The distinct `ROSTERSTATUS` values, to confirm whether it usefully separates anyone.
  - The exact endpoint URLs and any headers the requests need; access behavior at
    league-wide volume, including throttling, intermittent failure, and the pacing that
    worked; and the request volume a full refresh requires.
- Evidence: the value distributions above, quoted from the real pull.
- Obvious follow-ons: if a field is missing upstream or the request volume looks
  impractical, escalate to the user before M3 rather than substituting a source.

### Work package: WP-1.3 select the recognizable player pool

- Owner: `tester`.
- Touch points: one report under `docs/active_plans/reports/`, the ranking and pool-size
  constants consumed by WP-3.2.
- Depends on: WP-1.2 (needs a league-wide minutes pull).
- Acceptance criteria: rank every current-roster candidate by
  `minutesCurrentSeason + minutesPreviousSeason`, descending, with ascending `playerId` as
  the deterministic tie-break. For candidate pool sizes 75, 100, 125, and 150, report:
  - The complete selected name list and at least ten names on each side of the boundary.
  - Current rookies and established high-recognition players near or outside the boundary,
    so a failure of the minutes proxy is visible.
  - Team, conference, position, country, and college coverage, so recognizability does not
    accidentally collapse the game's clue diversity.
  - Guaranteed days before a repeat within one unchanged snapshot.
  - Optional Donruss overlap only if a current checklist is easy to obtain and verify. No
    missing checklist may delay or weaken the report.
- Decision rule: recommend the smallest pool whose named list still feels representative
  of the WNBA, whose boundary is mostly players a typical fan could plausibly recognize,
  and whose repeat cycle remains acceptable. Present all four lists and the recommendation
  to the user; user approval locks the pool size and ranking rule before WP-3.2. If the
  minutes ordering clearly buries recognizable rookies or stars, compare one deterministic
  alternative ranking and ask the user rather than adding silent manual exceptions.
- Evidence: the four ordered lists, boundary tables, coverage comparison, repeat-cycle
  lengths, and the user's recorded selection. Card data is never required evidence.
- Obvious follow-ons: hand the approved rule to WP-3.2 and all four pool variants to WP-5.1
  so difficulty can be reported against the chosen pool and its neighboring sizes.

### Work package: WP-1.4 record Pickle behavior and evaluate WNBA clues

- Owner: `playwright_operator`.
- Touch points: one parity and clue-identity report under `docs/active_plans/reports/`,
  screenshots under `test-results/`.
- Depends on: none.
- Acceptance criteria: the agent plays a real round at mlbpickle.com and records, each
  with a screenshot reference and as a factual statement rather than an inference: the
  exact column set and header labels; the feedback states and what each means per column;
  whether directional arrows appear and on which columns; the guess count; when
  autocomplete activates and what each row shows; duplicate-guess handling; the
  end-of-game dialog contents; the exact share-text format and whether it reveals the
  answer; and the statistics panel contents.
- The same report evaluates the baseline WNBA clue set -- Team, Conference, Height, Draft
  year, Draft pick, Country, College, Age, and Position -- plus plausible additions such as
  jersey number, years of experience, Draft team, and birthplace. For each it separates:
  fan-salience evidence, learning value, upstream availability and stability, maintenance
  cost, display width, and likely deduction value. Visibility on official league and team
  player surfaces is evidence; an agent's intuition about what fans know is not.
- The nine baseline clues are locked by the user. WP-1.4 may recommend an additional compact
  clue, because the engine has no column limit, but it does not remove Age or Draft pick or
  add a new clue without presenting the evidence to the user before WP-1.1 freezes types.
- College is treated as a defining WNBA clue. The report explicitly considers the league's
  culturally prominent college programs rather than describing College as a generic
  substitute for a removed baseball field.
- Draft pick means overall selection number and stays separate from Draft year. Its
  provisional comparison is exact for the same pick or two undrafted players, partial when
  two drafted players are within three overall picks, and directional as "earlier pick" or
  "later pick". Draft round is not displayed and does not define partial state. WP-5.1
  compares numeric tolerances of two, three, and five before release.
- Adaptation rule for the arrow question: if Pickle shows arrows on its ordinal columns,
  this game shows arrows on all four baseline ordinal clues (Height, Draft year, Draft pick,
  Age). If Pickle shows no arrows, this game ships none. WP-5.1 measures both variants
  either way, so the choice is revisited with data.
- Evidence: the report, clue matrix, recommendation, and numbered screenshots.
- Fallback: if the site is unreachable, work from archived captures and published rule
  write-ups, mark each observation's confidence, and escalate any low-confidence item that
  gameplay depends on.
- Obvious follow-ons: lock the clue-definition list for WP-1.1. A later parity or clue
  question that this report does not answer returns here for targeted evidence rather than
  being decided by the implementing agent.

### Work package: WP-1.5 record the data-use posture

- Owner: `reviewer`.
- Touch points: one decision record under `docs/active_plans/decisions/`.
- Depends on: WP-1.2.
- Acceptance criteria: the record states what is fetched, what is committed, what
  attribution the README carries, and confirms no logos or headshots ship; it states
  plainly whether public deployment proceeds or the build stays local.
- Evidence: cites the consulted terms and the specific clauses.
- Sequencing note: this decision lands in M1, before implementation, precisely so it
  cannot invalidate release work later. Until it is recorded as favorable, documentation
  written in later milestones describes the local build and keeps public-deployment
  language conditional.

### Work package: WP-2.1 land the foundation shell

- Owner: orchestrator.
- Touch points: `src/main.ts`, `src/index.html`, `src/style.css`, `src/constants.ts`.
- Depends on: WP-1.1.
- Acceptance criteria: the page boots with a header and an empty grid container; palette
  values exist as CSS custom properties for both themes; the team-to-conference table is
  `as const satisfies` typed; the layout is authored portrait-first against 800x1280; no
  console or page errors on load.
- Evidence: the build command and its exit status, plus a clean-console screenshot.

### Work package: WP-2.2 clear the scaffold hazards

- Owner: orchestrator.
- Touch points: `pip_requirements.txt`, `tsconfig.lint.json`,
  `docs/active_plans/wnba_game-plan.md`.
- Depends on: none; bundled into M2 for sequencing.
- Acceptance criteria: `pip_requirements.txt` exists, declaring whatever third-party
  package the pipeline actually imports and staying empty of a fetch dependency if the
  prototype's standard-library path holds; `check_codebase.sh` step 2 completes instead of
  exiting `TS18003`; this plan remains current at its existing path; the hygiene pytest
  modules pass.
- Evidence: the `./check_codebase.sh` summary block and the pytest summary line.

### Work package: WP-2.3 seed the development snapshot

- Owner: orchestrator.
- Touch points: `src/data/roster.json`.
- Depends on: WP-1.1.
- Purpose: unblock every game lane from the data investigation. Enumeration and minutes are
  the plan's main delivery risk and may take a while to resolve; contracts, the interface
  shell, storage, and the pure gameplay logic do not need the real pool to be built, only a
  schema-valid one.
- Acceptance criteria: a hand-built roster file, schema-valid against WP-1.1's validator,
  carrying the three real players already in `wnba_player_samples.json` plus enough
  additional hand-entered players to exercise the interface (distinct teams, both
  conferences, a range of heights and draft years, an undrafted player, a non-US-college
  player, a compound position); its `sourceNote` says plainly that it is development data,
  so it cannot be mistaken for a real roster.
- Evidence: the validator accepts it; the page renders a guess row against it.
- Obvious follow-ons: WS-D overwrites this file with the real roster in WP-3.2. The release
  checklist confirms the shipped file is real data, not the development seed.

### Work package: WP-2.4 write the boot smoke spec

- Owner: orchestrator.
- Touch points: `tests/playwright/smoke.spec.ts`, `playwright.config.ts` if the config
  needs the `testIgnore` entries.
- Depends on: WP-2.1.
- Acceptance criteria: the spec loads the built page over HTTP at the primary viewport,
  asserts the header is visible, and fails on any console error or page error; it uses
  web-first assertions rather than fixed timeouts; `./run_playwright_tests.sh --build`
  passes.
- Evidence: the command and its exit status.
- Obvious follow-ons: WS-Q extends this file in M5 rather than creating the first browser
  test late.

### Work package: WP-3.1 build the candidate fetcher

- Owner: `coder`.
- Touch points: `tools/fetch_wnba_candidates.py`, `.gitignore`.
- Depends on: WP-1.2.
- Starting point: the root prototype `fetch_wnba_player_data.py` becomes
  `tools/fetch_wnba_candidates.py`, keeping its request headers, its polite sleep, and its
  `window.` extraction approach, which are all already correct. Two changes are required:
  replace the hard-coded `PLAYER_IDS` tuple with the enumeration WP-1.2 proved, and replace
  the first-semicolon scan in `extract_json_value` with `json.JSONDecoder().raw_decode`, so
  a value containing a semicolon inside a string cannot truncate the parse.
  `wnba_player_samples.json` moves out of the repo root and is kept as the WP-1.2 sample
  under `docs/active_plans/reports/`.
- Acceptance criteria: fetches every current team roster, per-player biography, and
  per-season minutes for the current and preceding seasons, and writes one gitignored
  candidate JSON; allowlists field names, so the only statistical value carried forward is
  minutes and only into the working file; fails with a clear message naming the field when a
  required field is absent from a fetched record, rather than writing a record with a hole
  in it; paces requests politely using the interval WP-1.2 found
  workable, following the request guidance in `docs/PYTHON_STYLE.md`; reports failures
  clearly and exits non-zero on incomplete data so a partial fetch cannot silently become a
  roster file; follows the repo's Python conventions (tabs, type hints on every `def`, a
  `main()` plus name guard, argparse with paired short and long flags).
- Evidence: the output file's key set and the run's exit status.
- Implementation latitude: the fetch, retry, and error-reporting mechanism is the coder's
  choice within the repo style guide and the pacing WP-1.2 measured.

### Work package: WP-3.2 build the roster generator and validator

- Owner: `coder`.
- Touch points: `tools/build_roster_file.py`, `data_review/country_overrides.csv`,
  `data_review/eligibility_overrides.csv`, `src/data/roster.json`.
- Depends on: WP-3.1, WP-1.1, WP-1.3.
- Acceptance criteria: applies the computed eligibility rule (on a current roster, and
  `max(currentSeasonMinutes, previousSeasonMinutes)` at or above the WP-1.3 threshold),
  records the rule and threshold in the file envelope, drops minutes before writing so no
  performance value reaches the shipped file, and reports every applied override from
  `eligibility_overrides.csv`; overwrites the fixed `src/data/roster.json` path, so no
  TypeScript import changes on a refresh; normalizes country to the ISO
  3166 English short name through a committed override table seeded from the raw values
  WP-1.2 listed, keeping the raw upstream value in the working file so a normalization
  decision stays auditable; normalizes compound positions into a primary plus ordered
  alternates; emits ASCII-safe JSON with the full envelope; exits non-zero with a named
  reason on any validation failure.
- Evidence: a roster file generated from real data, plus included and excluded counts with
  exclusion reasons tallied, the applied-override list, and the unresolved-country list
  (which must be empty).

### Work package: WP-3.3 write the pipeline pytest suite

- Owner: `coder` (same lane; parser and tests are one reviewable unit).
- Touch points: `tests/test_roster_file.py`.
- Depends on: WP-3.2.
- Acceptance criteria: covers durable behavior rather than schema shape: a valid candidate
  set produces a roster file; a player below the minutes threshold in both seasons is
  excluded; a player above it in the preceding season only is included; a player absent
  from every current roster is excluded regardless of minutes; minutes never appear in the
  written roster file; a compound position splits into the right primary and alternates; a
  height string parses to the right inch count; an undrafted player round-trips as
  undrafted; a country needing an override normalizes; non-ASCII output is rejected; a
  candidate record missing a required field fails with a message naming that field.
  Inputs are inline literals or written into `tmp_path`;
  no committed fixture directory is added. The suite finishes well under one second and
  asserts nothing about today's date, collection lengths, or required-key lists.
- Evidence: the pytest command and its summary line.

### Work package: WP-3.4 render the comparison grid

- Owner: `coder`.
- Touch points: `src/ui_grid.ts`, `src/style.css`.
- Depends on: WP-1.1, WP-2.1.
- Acceptance criteria: renders rows from `CellFeedback` fixture data; exact, partial, and
  miss states are each distinguishable without relying on color alone, using badge text
  plus solid versus dashed borders; the eight-column grid is usable at the 800x1280
  primary viewport with row context preserved; where columns overflow, the grid scrolls
  within its own container with a sticky player-name column and a visible scroll hint, and
  the page body never scrolls horizontally; the grid carries an accessible description.
- Evidence: screenshots at 800x1280 in both themes.

### Work package: WP-3.5 build the controls and theme switch

- Owner: `coder`.
- Touch points: `src/ui_controls.ts`, `src/index.html`.
- Depends on: WP-2.1.
- Acceptance criteria: search input, "Pick for me" button, instructions disclosure,
  statistics panel, and a system/light/dark theme control; interactive targets are at least
  44 pixels; focus is always visible; the first visit follows the operating-system theme
  and an explicit choice persists.
- Evidence: a keyboard-only walkthrough at the primary viewport.

### Work package: WP-3.6 implement versioned storage

- Owner: `coder`.
- Touch points: `src/save_load.ts`.
- Depends on: WP-1.1.
- Acceptance criteria: one key, `wnba-20-questions-save-v1`; loading malformed JSON, an
  unknown version, or unavailable storage yields a usable fresh state instead of blocking
  the boot path; the store is injected so tests need no browser; the persisted puzzle
  record carries its puzzle date, its target `playerId`, and its evaluated rows.
- Evidence: unit tests for each recovery path.

### Work package: WP-3.7 implement streak and statistics counters

- Owner: `coder`.
- Touch points: `src/stats_state.ts`.
- Depends on: WP-3.6.
- Acceptance criteria: consecutive UTC-day wins increment; a win after a skipped day starts
  a new streak at one; a loss resets to zero; the maximum streak never decreases; the
  counter update is idempotent for an already-completed puzzle, so a replay or a reload
  changes nothing; the guess distribution is sized from the configured guess count rather
  than a literal.
- Evidence: unit tests covering each transition, asserting the observable counter behavior
  rather than the distribution's length.

### Work package: WP-4.1 implement deterministic daily selection

- Owner: `expert_coder`.
- Touch points: `src/daily_puzzle.ts`.
- Depends on: WP-3.2, WP-1.1.
- Acceptance criteria: `puzzleNumber` derives from the UTC date against a single
  `DAILY_EPOCH_UTC` constant; selection uses a fixed-seed permutation of the eligible
  players indexed by `puzzleNumber`, so every player appears once before any repeat; the
  same date and the same roster file always produce the same player.
- Known and accepted behavior: a refreshed roster produces a new permutation, so a player
  used recently can recur sooner than a full cycle would suggest. Repeat avoidance across
  refreshes is out of scope; the README and the refresh runbook describe this accurately.
- Evidence: a test walking a full cycle against one roster file and asserting no repeat
  before the pool is exhausted.

### Work package: WP-4.2 implement clue evaluation

- Owner: `expert_coder`.
- Touch points: `src/clue_engine.ts`.
- Depends on: WP-1.1, WP-1.4.
- Acceptance criteria: implements the clue table below; arrow behavior follows the WP-1.4
  adaptation rule; age is derived from birthdate against the injected UTC puzzle date
  inside this module, so the clue engine owns the age rule and rendering only displays what
  it returns; the function is pure and reads no global clock.

| Column | Pickle counterpart | Exact | Partial | Arrow |
| --- | --- | --- | --- | --- |
| Team | Team | Same current team | none | none |
| Conference | LG/DIV | Same East or West | none | none |
| Height | (basketball addition) | Same whole inch | Within 2 inches | Per WP-1.4 rule |
| Draft year | (basketball addition) | Same year, or both undrafted | Within 2 years; undrafted never partial | Per WP-1.4 rule |
| Country | (basketball addition) | Same normalized country | none | none |
| College | (basketball addition) | Same normalized school | none | none |
| Age | Age | Same age on the puzzle date | Within 2 years | Per WP-1.4 rule |
| Position | POS | Primary equals primary | The two players' position sets overlap in either direction | none |

The Age and Position tolerances come from Pickle's own rules. Height, Draft year, Country,
and College are the basketball additions; the ordinal ones reuse Pickle's plus-or-minus-two
shape rather than inventing a new tolerance, and the categorical ones are exact-only like
Team. Position partial is symmetric: a guessed forward whose alternates include guard,
against a target guard, is a partial match in both directions, which is what positional
overlap means in basketball.

College is a strong clue in the WNBA, where a large share of players come from a small set
of programs (Connecticut, South Carolina, Stanford, Tennessee, Notre Dame), so it
eliminates efficiently without being a giveaway. It is exact-only: a partial rule based on
NCAA conference would need a conference-membership table that changes with realignment, and
that maintenance is not worth the extra signal. Players with no US college get one
normalized bucket rather than a blank cell, so the column always carries information; the
exact bucket name and how many players fall into it come from WP-1.2, which reports the
league-wide `SCHOOL` values including the international cases.

- Evidence: unit tests at every boundary, including the 2-inch and 3-inch cases, the
  undrafted-versus-drafted case, and overlap in both directions.
- Obvious follow-ons: export the per-column evaluators individually so a future question
  bank can reuse them without touching the grid.

### Work package: WP-4.3 build the search index and autocomplete

- Owner: `coder`.
- Touch points: `src/search_index.ts`.
- Depends on: WP-3.2, WP-1.4.
- Acceptance criteria: activation threshold, dropdown contents, and no-results behavior
  match the WP-1.4 parity report; matching ignores case, punctuation, and diacritics while
  the dropdown shows the proper display name with team and position; arrow keys, Enter,
  and Escape all work; the typed query survives a rejected guess.
- Evidence: a keyboard-only Playwright walkthrough.

### Work package: WP-4.4 implement game state and completion

- Owner: `expert_coder`.
- Touch points: `src/game_state.ts`.
- Depends on: WP-4.1, WP-4.2, WP-3.6, WP-3.7.
- Acceptance criteria: one pure `submit_guess` decides whether a guess is accepted,
  rejects a duplicate without consuming an attempt, and appends the evaluation; one
  `complete_puzzle` performs the single active-to-won-or-lost transition and updates the
  puzzle record and the statistics counters together, so no other module can partially
  complete a game; completion is idempotent under reload and replay; a saved puzzle whose
  date is not today, or whose target is absent from the current roster file, is discarded
  with no loss recorded rather than silently rebound to a new target.
- Evidence: unit tests for duplicate rejection, the final-guess loss, the win, reload
  idempotency, and the stale-puzzle discard.

### Work package: WP-4.5 wire interaction and Pick for me

- Owner: `coder`.
- Touch points: `src/interaction.ts`.
- Depends on: WP-4.3, WP-4.4, WP-3.4.
- Acceptance criteria: keystrokes reach the search index, a selection reaches
  `submit_guess`, and the returned evaluation reaches the grid; a rejected duplicate shows
  a visible message; "Pick for me" draws uniformly from eligible unused players, submits
  once, and takes its randomness from an injected source; every accepted guess persists
  immediately so a refresh resumes mid-game.
- Evidence: Playwright win-path and loss-path specs.

### Work package: WP-4.6 write the gameplay unit tests

- Owner: `tester`.
- Touch points: `tests/test_clue_engine.mjs`, `tests/test_daily_puzzle.mjs`,
  `tests/test_game_state.mjs`, `tests/test_save_load.mjs`.
- Depends on: contracts only for authoring; WP-4.1, WP-4.2, and WP-4.4 for binding and
  running.
- Acceptance criteria: covers the durable invariants -- clue boundaries produce the correct
  feedback; a duplicate guess is rejected; the final incorrect guess loses; the same day
  and roster file yield a stable answer; a saved puzzle from an earlier day is discarded
  with no loss; progress survives a reload; a completed puzzle does not recount; streak
  transitions
  behave. Inputs are inline literals, nothing depends on the real clock, and no test
  asserts a required-key list or a collection length.
- Evidence: the node test command and its pass count.
- Working method: author the cases against the contracts while WS-G implements, then bind
  and run once the exports stabilize. Report a needed production change rather than editing
  `src/`.

### Work package: WP-5.1 measure difficulty and lock the guess count

- Owner: `tester`.
- Touch points: `tools/simulate_difficulty.mjs`, one report under
  `docs/active_plans/reports/`.
- Depends on: WP-4.2, WP-3.2.
- Baseline solver, specified so the run is reproducible: maintain the candidate set of all
  eligible players consistent with every clue received so far. The first guess is fixed
  across runs, chosen as the player whose expected candidate-set reduction is largest under
  the current snapshot, and the report names it. Each later guess is the candidate that
  minimizes the expected size of the remaining candidate set, with ties broken by ascending
  `playerId` so the run is deterministic. Every player in the snapshot is played as the
  answer exactly once.
- Second solver, as sensitivity analysis rather than an equal authority: same consistency
  filter, but each guess is the lowest-`playerId` consistent candidate, with no
  information-gain lookahead. It is a deliberately weak reference that brackets the
  worst-case player, not a second vote.
- Acceptance criteria: the report gives mean, median, full distribution, and loss rate for
  both solvers at 5, 6, and 7 guesses, each with and without arrows. Where the two solvers
  point at different guess counts, the report explains the gap and makes one recommendation
  rather than declaring a stalemate; a wide spread means the game is strategy-sensitive,
  which is information, not a blocker.
- Decision rule: keep 6 unless the baseline solver contradicts it. Move within 5 to 7 only
  when 6 falls outside the provisional targets below. The naive solver informs the call by
  showing what a weak player experiences; it does not veto it. Escalate to the user only
  when no value in 5 to 7 satisfies the baseline targets. Nine is reference information
  about Pickle, not a candidate, and does not re-enter through the parity rule.
- Provisional design targets, and why: loss rate at or under 10 percent, and a mean solve
  between 3.5 and 4.5 for the baseline solver. These are design targets chosen for a daily
  game -- most players should finish, most days should take a few informative guesses, and
  a loss should feel possible but uncommon. They are not measured from Pickle and are not
  user decisions. If the measurement lands outside them, report the numbers and the
  recommendation to the user rather than treating the thresholds as authoritative.
- Evidence: the report tables, plus the constant updated in `src/constants.ts`.
- Obvious follow-ons: if arrows make the game too easy at every guess count, propose
  removing them as a separate one-line change rather than retuning tolerances.

### Work package: WP-5.2 build the result dialog

- Owner: `coder`.
- Touch points: `src/result_dialog.ts`.
- Depends on: WP-4.4, WP-1.4.
- Acceptance criteria: contents match the WP-1.4 parity report; the dialog reads the
  completed state produced by `complete_puzzle` and performs no completion of its own; it
  is keyboard-dismissible; reopening it never changes a counter.
- Evidence: a Playwright spec that completes, reloads, reopens, and asserts unchanged
  counters.

### Work package: WP-5.3 build share output with clipboard fallback

- Owner: `coder`.
- Touch points: `src/share.ts`.
- Depends on: WP-5.2, WP-1.4.
- Acceptance criteria: the format follows the WP-1.4 parity report, adapted to the WNBA
  palette; uses Web Share when available and the clipboard otherwise; the shared grid uses
  square symbols only and reveals neither the player nor any clue value; the text carries
  the puzzle number and the score.
- Evidence: a Playwright spec with the clipboard stubbed through `addInitScript`.

### Work package: WP-5.4 run the browser coverage pass

- Owner: `playwright_operator`.
- Touch points: `tests/playwright/*.spec.ts`.
- Depends on: WP-5.3.
- Acceptance criteria: specs cover first visit, instructions, win, loss, duplicate
  rejection, "Pick for me", reload recovery, share fallback, keyboard-only play, and theme
  switching; every spec fails on a console error or a page error; selectors are `getByRole`
  or `getByLabel` first and `data-*` only where roles cannot reach; no fixed timeout waits.
- Portrait interaction walkthrough: at the 800x1280 primary viewport, a spec drives a full
  guess-and-compare cycle and asserts that all eight columns of feedback are reachable,
  that row context is preserved while the grid scrolls, that the horizontal scroll
  affordance is discoverable, and that the page body itself never scrolls horizontally.
  Screenshots alone do not satisfy this criterion.
- Responsive verification: repeat the boot-and-guess flow at a modern phone width
  (430x932), a tablet portrait (768x1024), and a large desktop (1920x1080), confirming the
  layout scales without loss of function. Narrower widths are checked only for graceful
  degradation and are not a design target.
- Evidence: the `./run_playwright_tests.sh --build` command and its pass count.

### Work package: WP-5.5 audit contrast and accessibility

- Owner: `image_evaluator`, with `color-accessibility-expert` guidance.
- Touch points: `docs/PALETTE_CONTRAST_AUDIT.md`, screenshots under `test-results/`.
- Depends on: WP-5.4.
- Acceptance criteria: measures every text, focus, structural-border, exact-match, and
  partial-match pair against its actually-rendered background at the primary viewport and
  at the three responsive widths, in both themes; text meets at least 5.5:1 and focus and
  essential boundaries meet at least 3:1; no critical or serious automated accessibility
  violation remains.
- Remediation latitude: any fix built from the four brand tokens is available -- opacity
  variants, swapping foreground and background roles, typography weight and size, border
  treatment, or spacing. The constraint is the four-color palette, not a particular
  adjustment mechanism.
- Evidence: the measured table in the audit doc.
- Obvious follow-ons: if a target cannot be met within the four-color constraint, report
  the specific pair and its measured value to the user rather than introducing a hue.

### Work package: WP-5.6 write the release documentation

- Owner: `coder`.
- Touch points: `README.md`, `docs/USAGE.md`, `docs/INSTALL.md`, `docs/DATA_REFRESH.md`,
  `docs/CHANGELOG.md`.
- Depends on: WP-5.1 (the README states the real guess count), WP-1.5 (deployment language
  matches the recorded posture).
- Acceptance criteria: `docs/DATA_REFRESH.md` gives the exact two-stage refresh commands,
  states the eligibility rule and its threshold in player-facing terms, explains what to do
  when the fetcher reports a missing upstream field, and documents the repeat behavior after
  a refresh;
  `docs/CHANGELOG.md` carries dated entries recording the milestone outcomes and the M1 and
  M5 decisions; the README explains the game and links the live URL when WP-1.5 permits
  publication. The README first paragraph satisfies the existing repo check
  (`tests/test_readme_first_paragraph.py`, under 250 characters, pure prose), and local
  Markdown links satisfy `tests/test_markdown_links.py`; both are existing repo gates
  rather than new formatting requirements.
- Evidence: the pytest command and its summary line.

## Acceptance criteria and gates

- Per-work-package evidence: the owning agent reports the command it ran, its exit status,
  and the meaningful summary -- diagnostic count for a typecheck, pass count for a test
  run, step summary for `check_codebase.sh`. Exact output text is quoted only where the
  text itself is the evidence. A completion claim without a command and an exit status is
  treated as unverified and re-dispatched.
- Validation is scaled to the package. Code packages run the typecheck or the test suite
  relevant to what they changed. Report, observation, audit, and documentation packages
  supply their artifact plus whatever repo check their files are subject to; they do not
  re-run unrelated suites already covered at the batch gate.
- Per-batch integration gate: after every agent in a batch reports done, the orchestrator
  runs `./check_codebase.sh` and the Playwright smoke. A failure dispatches a fix agent and
  does not carry into the next batch.
- Calibration gate (M5): the guess-count constant matches the WP-5.1 decision rule and the
  report is committed.
- Data gate (M3 and M5): the shipped snapshot contains no performance field (minutes
  included) and no player who fails the computed eligibility rule. Enforced by WP-3.2's
  validator, covered behaviorally by WP-3.3, and re-checked once against the final bundle
  in the release checklist.
- Independent review gate (M5): a `reviewer` agent that wrote none of the code inspects the
  built `dist/` artifact and confirms the data gate, the non-goals, and the checklist.

## Test and verification strategy

Permanent tests protect observable invariants. One-time inventories, field surveys, and
final-bundle inspections stay reports or release checks rather than becoming tests that
mirror a schema.

- Node unit tests (`tests/test_*.mjs`, run by `check_codebase.sh`) cover the pure logic:
  clue boundaries, daily selection stability and snapshot activation, duplicate rejection,
  completion idempotency, storage recovery, streak transitions. Inputs are inline literals.
- Pytest (`pytest tests/`) covers the Python pipeline behavior plus the existing hygiene
  modules. Inputs are inline or written into `tmp_path`; no committed fixture directory is
  added without explicit sign-off, per `docs/PYTEST_STYLE.md`.
- Playwright (`tests/playwright/`) covers the browser journeys, the portrait interaction
  walkthrough, and the responsive sweep. It is never collected by pytest.
- The difficulty simulation is a tool, not a test: it runs on demand and writes a report,
  because its runtime and its dependence on the current snapshot would make it fragile as a
  pytest.
- Failure semantics: a red gate stops the batch. A failing hygiene test is treated as
  introduced by the current work until `git diff` shows otherwise; `git stash` is never
  used as a diagnostic step.
- Required final commands:

```bash
./check_codebase.sh
./build_github_pages.sh
./run_playwright_tests.sh --build
source source_me.sh && python3 -m pytest tests/
```

## Risk register

| Risk | Impact | Trigger | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| The undocumented route changes shape | Blocks the data lane | A refresh fails on a missing field | WS-D owner | The fetcher fails loudly naming the absent field rather than writing an incomplete record; the game keeps playing the committed roster file until the fetcher is fixed |
| `/stats/` REST paths are throttled | A pipeline built on REST cannot complete a full-league run | Already observed: `commonplayerinfo` throttles while the player page loads immediately | WS-Q, then WS-D | Prefer HTML pages with embedded JSON everywhere; if any step must use REST, WP-1.2 proves a pacing that survives a full run before the pipeline depends on it |
| A full-league page crawl is slow at polite pacing | A refresh takes impractically long | WP-1.2 request-volume estimate at roughly 180 players plus team pages | WS-D owner | Refresh is an offline maintenance action, not a user-facing one, so a slow run is acceptable; if it is not, cache unchanged player pages between refreshes keyed on player id |
| The minutes distribution has no clean separation | The threshold becomes arbitrary and the pool wrong | WP-1.3 histogram shows no gap between hardship and bench players | WS-Q owner | WP-1.3 reports the distribution and named example players at each candidate threshold and recommends a value to the user rather than manufacturing one |
| The threshold excludes too many players | The pool is too small for a daily game | WP-1.3 pool size falls below roughly 120 | WS-Q owner | Pool size is an explicit output of WP-1.3 and feeds WP-5.1; lower the threshold or bring the user the trade-off before M3 |
| Eligibility goes stale during the season | A traded or waived player stays in the pool | An in-season transaction between refreshes | WS-D owner | Eligibility is recomputed on every refresh with no manual step, so refreshing is cheap; the snapshot `asOfDateUtc` is displayed in the interface and the runbook is part of WP-5.6 |
| The override file grows into a shadow review process | The reproducible rule quietly becomes manual again | Overrides accumulate across refreshes | WS-D owner | The generator reports every applied override on every run, so growth is visible; overrides are for data errors, not roster judgment |
| Six guesses proves wrong for the real pool | The game is trivial or unfair | WP-5.1 lands outside the provisional targets | WS-Q owner | Guess count is one constant; the calibration gate adjusts it within 5 to 7 before release |
| Answers recur soon after a roster refresh | Mild repetition | Any data refresh | Orchestrator | Accepted behavior; the permutation guarantees no repeat within one roster file, and the README states the limit accurately |
| A roster refresh lands mid-puzzle | A player's in-progress game rebinds to a different answer | Refresh deployed while a puzzle is open | WS-G owner | The save records the puzzle date, the target, and the evaluated rows; a puzzle whose target is gone is discarded with no loss, and puzzles expire daily anyway |
| Eight columns crowd the portrait viewport | Core comparison becomes hard to use | Real content at 800x1280, with College adding a wide text cell | WS-U, verified by WS-Q | WP-3.4 designs portrait-first and abbreviates long school names with the full value available on focus; WP-5.4 drives a real interaction walkthrough rather than accepting screenshots |
| Per-season minutes are unavailable without an account | The eligibility rule loses its quantity | WP-1.2 finds no reachable minutes endpoint | WS-Q owner | The documented fallback is a games-played threshold selected by the same distribution method; the rule's shape is unchanged |
| College is thin or inconsistent for international players | A clue column carries little information for part of the pool | WP-1.2 reports many empty or club-name `SCHOOL` values | WS-D owner | Non-US-college players get one normalized bucket rather than a blank; if that bucket is very large, report the share to the user and reconsider the column before M3 |
| The four-color palette cannot meet contrast targets | The accessibility gate fails at M5 | WP-5.5 measures a failing pair | WS-Q owner | Any remediation built from the four tokens is permitted; if still failing, report the pair to the user rather than adding a hue |
| Parallel agents redeclare a shared type | Integration debt at the batch boundary | An agent needs a shape absent from `src/types/` | Orchestrator | Pause and invoke `typescript-engineer`; the batch gate re-runs the typecheck across lanes |
| Agents drift from Pickle by improving it | The game stops being what the user asked for | An agent proposes a nicer interaction | Orchestrator | The parity rule is quoted in every coding-agent prompt; WP-1.4 supplies the factual baseline |
| Scope creep toward a yes/no question mode | M4 slips | An agent proposes a question bank | Orchestrator | Named non-goal; the exported per-column evaluators keep the seam without the feature |

## Rollout and release checklist

- [ ] All four required final commands pass, with command and exit status recorded.
- [ ] `dist/` contains `main.js`, `index.html`, `.nojekyll`, and the snapshot data inlined
      by the bundle.
- [ ] The shipped snapshot contains no performance field (minutes included) and every
      player satisfies the recorded eligibility rule.
- [ ] The guess count in `src/constants.ts` matches the WP-5.1 decision.
- [ ] `docs/PALETTE_CONTRAST_AUDIT.md` records measured values for both themes at the
      primary and responsive viewports.
- [ ] The portrait interaction walkthrough passes at 800x1280.
- [ ] `docs/CHANGELOG.md` and `docs/DATA_REFRESH.md` are current.
- [ ] The WP-1.5 record permits publication, and the documentation's deployment language
      matches it.
- [ ] An independent `reviewer` agent has signed off on the built artifact.

Publishing to GitHub Pages is an operator action outside this deliverable: a human moves
`deploy-pages.yml` into the workflows directory and enables Pages for the repository, per
the repo convention that agents edit only root-level files. The software is complete when
the checklist above is complete; the plan does not claim the site is live.

## Documentation close-out requirements

- Active plan tracker: WP-2.2 moves this plan into
  `docs/active_plans/active/wnba_pickle_game.md` (a move, not a copy, so one plan is live)
  and milestone status is kept current there; `git mv` it to `docs/archive/` at close.
- `docs/CHANGELOG.md`: one dated block per milestone under the canonical subsection
  headings, recording additions, behavior changes, and the M1 and M5 decisions and any
  failures encountered.
- Reports and decisions: the WP-1.2 endpoint report, the WP-1.3 minutes-threshold report,
  the WP-1.4 parity report, and the WP-5.1 calibration report under
  `docs/active_plans/reports/`; the WP-1.5 data-use record under
  `docs/active_plans/decisions/`.
- `plan_draft.md` is retired in M2.

## Open questions and decisions needed

None block dispatch. Each is scheduled inside the plan.

- Minutes threshold:
  - Decision owner: `tester` (WP-1.3).
  - Evidence and decision rule: inspect the real league-wide distribution and pick the
    lowest cutoff that keeps ordinary rotation and bench players while removing extremely
    low-participation roster entries. Report the resulting pool size rather than gating on
    it. 100 minutes is the starting hypothesis. Claim nothing about contract class, which
    the data does not label. If no natural break exists, recommend a value to the user
    rather than manufacturing one.
- Directional arrows:
  - Decision owner: `playwright_operator` (WP-1.4), measured by `tester` (WP-5.1).
  - Evidence and decision rule: if Pickle uses arrows on its ordinal columns, this game
    uses them on all three of its ordinal columns; if not, none ship. WP-5.1 measures both
    variants so the decision can be revisited with data.
- Guess count:
  - Decision owner: `tester` (WP-5.1).
  - Evidence and decision rule: keep 6 unless the measurement contradicts it; move only
    within 5 to 7 and only when both solvers agree. Escalate rather than exceeding that
    range.
- Non-blocking follow-up: a v2 yes/no question mode that would earn the repo name. The clue
  engine exports per-column evaluators so a question bank can be built on them later. Not
  scoped here; raise after v1 ships.
