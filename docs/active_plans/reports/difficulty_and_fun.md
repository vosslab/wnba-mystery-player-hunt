# Difficulty and fun probe

## Scope and status

This is a deterministic offline measurement of the checked-in development fixture. It reads
`src/data/roster.json` through the same snapshot validator and clue engine as the game. It makes
no network requests, opens no browser, and does not invoke the Python acquisition pipeline.

The fixture has 16 hand-picked recognizable players and is explicitly incomplete. These numbers
are therefore provisional development evidence, not release calibration and not a basis for
choosing the 200 or 300 fantasy-point cutoff. Re-run this tool against the official
Python-generated roster after the cutoff is approved.

## Method

Run the probe with:

```sh
node --import tsx tools/simulate_difficulty.mjs
```

Every fixture player is used once as the answer. After every non-winning guess, both solvers
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

## Development-fixture results

Snapshot `2026-08-02-development-1`, 16 players, evaluated at `2026-08-02`:

- Fixed baseline first guess: Breanna Stewart (`1627668`).

| Guesses | Solved | Losses | Loss rate | Mean solved guesses | Median solved guesses | Distribution        |
| ------- | -----: | -----: | --------: | ------------------: | --------------------: | ------------------- |
| 5       |     16 |      0 |      0.0% |                1.94 |                  2.00 | 1: 1, 2: 15, 3-5: 0 |
| 6       |     16 |      0 |      0.0% |                1.94 |                  2.00 | 1: 1, 2: 15, 3-6: 0 |
| 7       |     16 |      0 |      0.0% |                1.94 |                  2.00 | 1: 1, 2: 15, 3-7: 0 |
| 9       |     16 |      0 |      0.0% |                1.94 |                  2.00 | 1: 1, 2: 15, 3-9: 0 |

The lowest-ID sensitivity solver also solves all 16 fixture answers within 5, 6, 7, and 9 guesses.
That result confirms the fixture is too small and deliberately curated to calibrate real
difficulty. It is not evidence that a player using the search UI will solve every game in two
guesses.

## Clue discrimination

For each clue independently, the tool averages the remaining consistent candidates after one
guess-target feedback cell across every ordered guess/target pair. Lower expected remaining and
higher reduction indicate stronger early discrimination in this fixture.

| Clue       | Expected remaining | Reduction |
| ---------- | -----------------: | --------: |
| Team       |              12.59 |     21.3% |
| Conference |               8.13 |     49.2% |
| Height     |               7.39 |     53.8% |
| Draft year |               8.73 |     45.4% |
| Draft pick |               8.48 |     47.0% |
| Country    |              12.70 |     20.6% |
| College    |              13.16 |     17.8% |
| Age        |               7.95 |     50.3% |
| Position   |               6.53 |     59.2% |

The nine clues are not redundant in the fixture: position, height, age, conference, and both
draft fields distinguish candidates early, while team, country, and college add recognizable
fan-facing context. The complete nine-cell feedback uniquely separates nearly every fixture
target after the fixed first guess, which is useful as a smoke signal for the clue engine but is
far too easy to judge release fun.

## Decision

This provisional six-guess recommendation is superseded by the human playtest decision on
2026-08-02. The game now allows nine guesses and makes efficiency visible through a score that
starts at 100 points and falls by 10 for each extra guess. The larger limit prioritizes continued
play; the score preserves the incentive to solve efficiently. Before release, re-run this probe on
the approved roster and use the results to calibrate the scoring curve rather than silently
reducing the number of attempts.

## Refined UI audit

### User goal

Find a mystery WNBA player by turning each guess into useful clue feedback. Daily is the scored
challenge; Practice supplies fresh rounds without changing daily progress or statistics.

### Design changes

- Let the desktop clue grid use the available viewport instead of a narrow centered column.
- Treat 800x1280 as the minimum supported viewport and let wider layouts use available space.
- Show the full clue header grid before the first guess instead of replacing it with explanatory
  empty-state text.
- Keep How it works and Statistics visible because their columns are always reserved; only Theme
  remains collapsible.
- Normalize multi-position sets to conventional display order so `C/F` and `F/C` are both `F/C`
  and compare as exact.
- Reduce title, spacing, cell padding, and secondary-control weight while retaining 44-pixel
  interactive targets.
- Collapse How it works, Statistics, and Theme into one compact secondary row on desktop.
- Make Daily and Practice explicit modes, with a fresh-player action visible only in Practice.
- Show the next available score beside the remaining guesses. The score starts at 100 and drops
  by 10 for each extra guess.
- Keep System as the default theme; Light and Dark are explicit overrides.

### Heuristic delta

Scores use 0 for a critical problem and 4 for no observed issue.

| Nielsen heuristic | Before | After | Evidence |
| --- | ---: | ---: | --- |
| Visibility of system status | 3 | 4 | Mode, guesses, and points are visible together |
| Match with the real world | 3 | 4 | Daily and Practice use familiar labels and scoring language |
| User control and freedom | 2 | 4 | Players can switch modes or start a fresh practice player |
| Consistency and standards | 3 | 4 | Buttons, pressed states, dialogs, and the Theme disclosure reuse native patterns |
| Error prevention | 4 | 4 | Autocomplete and duplicate-guess protection remain intact |
| Recognition over recall | 3 | 4 | The full clue header grid is visible before the first guess |
| Flexibility and efficiency | 2 | 4 | Practice supports repeat play without waiting for another UTC day |
| Aesthetic and minimalist design | 2 | 4 | Useful help and statistics remain visible; only Theme collapses |
| Error recognition and recovery | 4 | 4 | Invalid and duplicate searches preserve context and name the next step |
| Help and documentation | 3 | 4 | Compact help explains nine guesses, scoring, and Practice isolation |

### Accessibility evidence

- Browser coverage exercises keyboard autocomplete, result-dialog focus, theme controls, and
  visible primary actions.
- All buttons and search controls retain a minimum 44-pixel height.
- Every feedback cell exposes its clue, value, and match in an accessible label, and the clue
  headers remain visible at the 800x1280 minimum viewport.
- Measured text pairs remain above WCAG AA: dark gray on Balm is 6.73:1, Ultra Black on Balm is
  15.84:1, and Ultra Black on Orange Passion is approximately 7.43:1.
- Manual critical and serious WCAG findings remain 0 before and after. The existing raw-token
  palette report lists Orange Passion and Balm as failing when treated as text on Balm; the UI
  uses them as surfaces with contrasting text, not as those failing foreground pairs.

### Responsive acceptance

Playwright uses 800x1280 as the minimum acceptance viewport and 1920x1080 as the wide-desktop
check. The empty board exposes all nine clue headers before play, and both supported widths keep
the search, submit controls, real feedback, and theme controls usable without horizontal page
overflow. Sub-800 layouts are not a release gate.

The refreshed 1600x1000 README capture is
[../../screenshots/wnba_pickle_feedback.png](../../screenshots/wnba_pickle_feedback.png).
