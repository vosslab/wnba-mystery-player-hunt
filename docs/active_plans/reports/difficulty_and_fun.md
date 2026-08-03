# Difficulty and fun probe

## Scope and status

This is a deterministic offline measurement of the checked-in derived roster. It reads
`src/data/roster.json` through the same snapshot validator and clue engine as the game. It makes
no network requests, opens no browser, and does not invoke the Python acquisition pipeline.

The roster has 136 validated players selected from current rosters at the approved 300-point
maximum-two-season recognizability cutoff. The probe measures the deterministic solver, not human
WNBA knowledge, so human play remains the authority for the score curve.

## Method

Run the probe with:

```sh
node --import tsx tools/simulate_difficulty.mjs
```

Every roster player is used once as the answer. After every non-winning guess, both solvers
remove that exact `playerId` and retain only candidates consistent with the complete feedback
from prior guesses. This identity removal matters when two players have an identical nine-clue
profile: feedback alone cannot distinguish them, but a player cannot be guessed twice. A
deterministic in-tool self-check creates such a pair and confirms the unguessed identity remains.
Its first guess is fixed for the roster: the player with the lowest expected remaining candidate
set across all targets. Each later guess is the consistent candidate that minimizes the same
expected remaining set; equal scores use ascending `playerId`.

The weak sensitivity solver uses the lowest-`playerId` consistent candidate without a lookahead.
It is context for the baseline, not a decision rule. A solved-game mean and median use solved
games only; losses remain separate so a capped run does not pretend a loss was an extra solve.

## Derived-roster results

Snapshot as of `2026-08-03`, 136 players, evaluated at `2026-08-03`:

- Fixed baseline first guess: Michaela Onyenwere (`8338024539083250`).

| Guesses | Solved | Losses | Loss rate | Mean solved guesses | Median solved guesses | Distribution                |
| ------- | -----: | -----: | --------: | ------------------: | --------------------: | --------------------------- |
| 5       |    136 |      0 |      0.0% |                2.24 |                  2.00 | 1: 1, 2: 101, 3: 34, 4-5: 0 |
| 6       |    136 |      0 |      0.0% |                2.24 |                  2.00 | 1: 1, 2: 101, 3: 34, 4-6: 0 |
| 7       |    136 |      0 |      0.0% |                2.24 |                  2.00 | 1: 1, 2: 101, 3: 34, 4-7: 0 |
| 9       |    136 |      0 |      0.0% |                2.24 |                  2.00 | 1: 1, 2: 101, 3: 34, 4-9: 0 |

The lowest-ID sensitivity solver also solves all 136 answers within 5, 6, 7, and 9 guesses. This is
evidence that the clue system is mechanically informative, not that a person will solve every game
in two guesses.

## Clue discrimination

For each clue independently, the tool averages the remaining consistent candidates after one
guess-target feedback cell across every ordered guess/target pair. Lower expected remaining and
higher reduction indicate stronger early discrimination in this roster.

| Clue       | Expected remaining | Reduction |
| ---------- | -----------------: | --------: |
| Team       |             118.57 |     12.8% |
| Conference |              68.13 |     49.9% |
| Height     |              65.90 |     51.5% |
| Draft year |              84.29 |     38.0% |
| Draft pick |              86.44 |     36.4% |
| Country    |              94.53 |     30.5% |
| College    |             123.48 |      9.2% |
| Age        |              74.09 |     45.5% |
| Position   |              65.95 |     51.5% |

The nine clues are not redundant: position, height, conference, age, and the draft fields
distinguish candidates early, while team, country, and college add recognizable fan-facing
context. The complete nine-cell feedback separates the solver's remaining candidates quickly,
but human recall and search choices make browser play meaningfully harder than this ideal strategy.

## Decision

This provisional six-guess recommendation is superseded by the human playtest decision on
2026-08-02. The game now allows nine guesses and makes efficiency visible through a score that
starts at 100 points and falls by 10 for each extra guess. The larger limit prioritizes continued
play; the score preserves the incentive to solve efficiently. This approved-roster run supports
calibrating the score through human play rather than silently reducing the number of attempts.

## Refined UI audit

### User goal

Find a mystery WNBA player by turning each guess into useful clue feedback. Daily is the scored
challenge; Practice supplies fresh rounds without changing daily progress or statistics.

### Design changes

- Center the game in a 48rem maximum-width canvas so wider viewports do not stretch the clue grid
  beyond its useful scanning width.
- Treat 800x1280 as the minimum supported viewport; larger layouts preserve the compact game width.
- Show the full clue header grid before the first guess instead of replacing it with explanatory
  empty-state text.
- Weight clue-column widths by their content instead of distributing the nine clue fields evenly.
- Abbreviate dense visible headers while preserving full accessible names so the compact table
  remains easy to scan without collisions.
- Order the clue fields by elimination value: Conference, Team, Position, Country, Draft year,
  Draft pick, College, Height, and Age.
- Keep How to play, Statistics, and Theme visible because their columns are always reserved.
- Normalize multi-position sets to conventional display order so `C/F` and `F/C` are both `F/C`
  and compare as exact.
- Report the 136-player pool in the interface and name that pool when a search has no match.
- Let a team code such as `GSV` turn the existing autocomplete into a browsable team roster.
- Reduce title, spacing, cell padding, and secondary-control weight while retaining 44-pixel
  interactive targets.
- Keep How to play, Statistics, and Theme in one compact secondary row on desktop.
- Introduce the feedback language in a concise first-run dialog only before an untouched round,
  remember dismissal, and keep an `Open guide` action available for later review.
- Turn the completed-round dialog into a result card that prioritizes the answer, points, guesses,
  current streak, and a spoiler-free feedback preview before the share action.
- Make Daily and Practice explicit modes, with a fresh-player action visible only in Practice.
- Show the next available score beside the remaining guesses. The score starts at 100 and drops
  by 10 for each extra guess.
- Keep System as the default theme; Light and Dark are explicit overrides.

### Heuristic delta

Scores use 0 for a critical problem and 4 for no observed issue.

| Nielsen heuristic               | Before | After | Evidence                                                                                      |
| ------------------------------- | -----: | ----: | --------------------------------------------------------------------------------------------- |
| Visibility of system status     |      3 |     4 | Mode, guesses, and points are visible together; the result card summarizes the finished round |
| Match with the real world       |      3 |     4 | Daily and Practice use familiar labels and scoring language                                   |
| User control and freedom        |      2 |     4 | Players can switch modes or start a fresh practice player                                     |
| Consistency and standards       |      3 |     4 | Buttons, pressed states, dialogs, and always-visible Theme controls reuse native patterns     |
| Error prevention                |      4 |     4 | Autocomplete and duplicate-guess protection remain intact                                     |
| Recognition over recall         |      3 |     4 | The full clue grid is visible early, with a reopenable first-run feedback guide                |
| Flexibility and efficiency      |      2 |     4 | Practice supports repeat play without waiting for another UTC day                             |
| Aesthetic and minimalist design |      2 |     4 | Weighted columns and a result hierarchy avoid equal-width and text-heavy presentation          |
| Error recognition and recovery  |      4 |     4 | Invalid and duplicate searches preserve context and name the next step                        |
| Help and documentation          |      3 |     4 | First-run help explains feedback once and remains available without interrupting later rounds  |

### Accessibility evidence

- Browser coverage exercises keyboard autocomplete, first-run and result-dialog focus, persisted
  guide dismissal, theme controls, and visible primary actions.
- All buttons and search controls retain a minimum 44-pixel height.
- Every feedback cell exposes its clue, value, and match in an accessible label, and the clue
  headers remain visible at the 800x1280 minimum viewport.
- Native dialogs support Escape and deliberate focus placement. The result preview is exposed as
  one described image while its individual decorative color cells stay hidden from screen readers.
- Measured text pairs remain above WCAG AA: dark gray on Balm is 6.73:1, Ultra Black on Balm is
  15.84:1, and Ultra Black on Orange Passion is approximately 7.43:1.
- Manual critical and serious WCAG findings remain 0 before and after. The existing raw-token
  palette report lists Orange Passion and Balm as failing when treated as text on Balm; the UI
  uses them as surfaces with contrasting text, not as those failing foreground pairs.

### Responsive acceptance

Playwright uses 800x1280 as the minimum acceptance viewport and 1920x1080 as the wide-desktop
check. The centered game canvas remains at or below 768 pixels wide, the empty board exposes all
nine clue headers before play, and both supported widths keep the search, submit controls, real
feedback, and theme controls usable without horizontal page overflow. Sub-800 layouts are not a
release gate. Both dialogs constrain their height and scroll internally at the portrait viewport.

The refreshed 1000x900 README capture is
[../../screenshots/wnba_pickle_feedback.png](../../screenshots/wnba_pickle_feedback.png).
