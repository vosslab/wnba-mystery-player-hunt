# Pickle parity and WNBA clues

## Methods

On 2026-08-02, standalone Playwright Chromium (the in-app browser surface was unavailable)
opened `https://www.mlbpickle.com/` in a fresh browser context. The run used visible clicks and
the labelled search input, and captured console and page errors. The clipboard was stubbed with
`page.addInitScript` before navigation. This is an observation report, not a source-code reading.

The site showed a guest-instance `404` and a `getStartupDeviceTypeString` page error in this
context. Its `Pick for me` control then remained on a spinner. A second fresh-context run made
two real, visible autocomplete guesses and recorded their feedback. A later, bounded live
follow-up repeatedly stalled before a usable page artifact, so the unobserved items below are
deliberately marked as such rather than inferred. Screenshot numbering is local to
`test-results/pickle_observation/`.

## Observed Pickle behavior

- `test-results/pickle_observation/01_instructions.png` (01) shows the initial
  instruction dialog. It says: "Guess today's mystery MLB player within nine guesses" and
  requires at least two letters to search.
- The exact visible grid headers are `TEAM`, `LG./DIV.`, `B`, `T`, `BORN`, `AGE`, and `POS.`;
  the column set has seven fields. `test-results/pickle_observation/02_board.png` (02) records
  the empty board.
- `test-results/pickle_observation/03_autocomplete.png` (03) shows no results after one
  character and the results after `an`. Each result row presents the player name, team,
  league/division, bats, throws, country of birth, age, and position. For example, Anthony
  Rendon appears as `LAA / AL West / R / R / USA / 36 / 3B`.
- Two real feedback rows are visible in
  `test-results/pickle_observation/06_guess_3.png` (06). A green solid fill with a
  white outline means an exact match. A gold fill with a dashed white outline means a partial
  match. The instruction dialog defines the partial state only for `LG./DIV.` (same revealed
  league or division), `AGE` (within two years), and `POS.` (the alternate position).
- Dark charcoal cells have neither green nor gold feedback. The instructions do not give that
  state a name, so this report records it as a visible non-match rather than assigning a label.
- No directional arrows appear in the headers, instructions, or recorded feedback rows. The
  observed Pickle adaptation is therefore no arrows.
- The visible counter reads `4 of 9` during the second recorded row, and the instructions state
  nine guesses. The observed game limit is nine.
- `Pick for me` is a visible button, but it triggered a spinner after the guest-instance 404;
  successful random-selection behavior was not observed.
- Duplicate rejection and counter effect, a complete loss, end dialog, revealed answer,
  statistics contents, share controls, exact clipboard/share text, answer/clue leakage, and
  clipboard write remain unobserved. No authoritative published rule or archived completed
  capture was found for these exact details, so each is low-confidence and unresolved rather
  than fallback implementation permission.

## WNBA clue matrix

Official-surface evidence means the current WNBA Stats player profile and the public traditional
stats surface used by this plan; the player-profile prototype already extracts biography values
from its embedded JSON. Team pages are the expected independent roster enumeration surface.
The official [WNBA player surface](https://www.wnba.com/webview/player/203014) visibly carries
position, height, birthdate, college/country, and draft year/round/pick. The official
[Sami Whitcomb profile](https://www.wnba.com/player/1628244/sami-whitcomb/bio) demonstrates
an undrafted player and a college biography. The official [traditional player statistics
surface](https://stats.wnba.com/players/traditional/) supplies the separate, working-file-only
`NBA_FANTASY_PTS` ranking input. These are availability evidence; roster/team fields require
refresh-time validation. Fan salience below means visible official presentation, not a survey
claim about what fans know.

| Clue | Fan-salience evidence | Learning | Upstream stability | Maintenance | Width | Deduction | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Team | Official player surface presents current team. | Current fandom context. | Roster-sensitive. | Refresh roster pull. | Short | High | Keep. |
| Conference | Team identity supports lookup. | Explains league structure. | Static table. | Expansion/realignment update. | Short | Medium | Keep. |
| Height | Official surface displays height. | Basketball comparison. | Biography-stable. | Low. | Short | Medium-high | Keep. |
| Draft year | Official surface displays draft year. | Locates league era. | Biography-stable. | Low. | Short | Medium | Keep. |
| Draft pick | Official surface displays overall pick. | Entry expectation. | Stable when drafted. | Normalize undrafted. | Short | Medium | Keep. |
| Country | Official surface displays college/country. | International literacy. | Biography-stable. | Normalize names. | Short | Medium | Keep. |
| College | Official profiles display college. | Connects WNBA and NCAA paths. | Stable; sparse for some. | Normalize no-college cases. | Wide | High where populated | Keep. |
| Age | Official surface displays birthdate. | Familiar Pickle comparison. | Birthdate-stable. | Clue engine derives puzzle-day age. | Short | Medium | Keep. |
| Position | Official surface displays position. | Core role recognition. | Usually stable. | Refresh validation. | Short | Medium-high | Keep. |
| Jersey number | Official surface presents number. | Broadcast context. | Roster-sensitive. | Refresh roster pull. | Short | Low-medium | Do not add. |
| Years experience | Official surface presents experience. | Career context. | Changes yearly. | Yearly refresh. | Short | Redundant | Do not add. |
| Draft team | Official biographies may name team. | Trivia. | Stable. | Low. | Medium | Low-medium | Do not add. |
| Birthplace | Official profiles may carry it. | Human-interest. | Inconsistent. | Normalize. | Wide | Low | Do not add. |

## Locked recommendation

Freeze this ordered clue-definition list: `Team`, `Conference`, `Height`, `Draft year`, `Draft
pick`, `Country`, `College`, `Age`, `Position`. The evidence does not justify an extra compact
column before type freeze. Current-roster membership is the sole eligibility gate. Fantasy
points are only a post-eligibility, build-time recognizability ranking cutoff, never a display
clue or shipped statistic.

Pickle exposes no ordinal arrows in the observed UI, so the WNBA game ships no arrows. If later
targeted evidence reverses that observation, the plan requires arrows on all four WNBA ordinal
clues: Height, Draft year, Draft pick, and Age. Draft pick means overall pick: exact for equal
overall pick or both undrafted, partial for drafted players within three overall picks, then a
non-arrow directional comparison only if the arrow decision is reversed. Draft round stays out.

M2 must render nine configured columns with these exact labels and no column-count constant.
M4 must evaluate every field from the same ordered definitions, derive Age from `birthDateUtc`
against its injected UTC puzzle date, retain exact and partial state, reject duplicate players
before creating a new row, and expose a keyboard-reachable, two-letter minimum autocomplete.
The unobserved end-state details are non-blocking reference gaps, not implementation gates;
later evidence may refine dialog/share/statistics parity. Share must never reveal a player or
clue value.

## Plan discrepancies

The plan's locked decision is nine baseline clues, and its architecture says the configured list
owns the grid. The later references to "eight columns" in the portrait walkthrough and risk
register are stale wording. They do not authorize removing a clue: M2/M4/M5 must implement and
test all nine, including the wide College value with an accessible full-value treatment.

## Risks

- The browser-observed guest-instance 404 and repeatable live-follow-up stall leave Pickle
  end-state parity incomplete. A healthy guest instance or human-provided completed-game
  capture can refine duplicate/dialog/share/statistics reference details later.
- `College` needs a normalized non-US/no-college bucket rather than blanks; the data lane must
  report its share before the snapshot is accepted.
- Team and jersey values are roster-sensitive; the configured snapshot must carry a visible
  refresh date rather than silently imply current transactions.

## Validation

- Screenshots: `01_instructions.png`, `02_board.png`, `03_autocomplete.png`, and
  `06_guess_3.png` under `test-results/pickle_observation/`.
- Browser diagnostics: guest-instance `404`, one failed resource load, and
  `TypeError: e.getStartupDeviceTypeString is not a function`; preserved in the local
  observation JSON artifacts.
- The focused Markdown-link pytest and `git diff --check` are run after the report is written.
