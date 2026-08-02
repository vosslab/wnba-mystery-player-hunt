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

The lowest-ID sensitivity solver also solves all 16 fixture answers within 5, 6, and 7 guesses.
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

Keep six guesses for development. Browser playthrough already establishes that the interaction is
clear and reachable; this small offline fixture neither identifies a material fun problem nor
supports a change to five or seven. Before release, re-run the same deterministic tool on the
official Python-generated roster after the recognizability cutoff is selected, then use that
result plus lightweight human playtesting to decide whether six remains appropriate.
