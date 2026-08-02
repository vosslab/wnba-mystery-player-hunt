# Fun-first priority amendment

## Decision

The game must first be fun and comprehensible: players can make a guess, understand feedback,
and complete either a win or loss path. Reference parity is evidence, not a pixel, byte, or
full behavior-equivalence requirement.

## Changed gates

- Freeze contracts from the observed core: the reference's nine-guess observation (not the WNBA
  guess limit), green exact and gold partial feedback, autocomplete, nine WNBA clues, and no
  arrows. The WNBA game defaults to six guesses and may tune only within five to seven.
- Treat duplicate, dialog, statistics, and share-reference details as non-blocking. The WNBA
  game supplies a sensible usable design, including non-spoiling sharing with a fallback.
- Build and playtest M2/M4 with plainly labeled schema-valid development data before the
  official data lane finishes.
- Require an early browser walkthrough with a real guess-feedback cycle plus development-data
  win and loss paths. Use M5 playtesting and solver evidence to tune guess count and clues.
- Use 800x1280 as the main design target while accepting readable/reachable responsive layouts,
  including reasonable grid scrolling or stacking, rather than fixed widths or pixel parity.
- Focus permanent tests on game rules, duplicate rejection, deterministic selection, save
  recovery, win/loss, accessibility, and release-data schema behavior.
- Keep all future roster and statistics gathering in Python. Browser discovery is complete;
  browser runtime and Playwright never collect roster or statistics data.

## Retained gates

- Current-roster membership remains the sole eligibility gate.
- Recognizability remains `max(2026, 2025) NBA_FANTASY_PTS` at the user-approved 200 or 300
  cutoff, after current-roster intersection. Fantasy points stay out of the shipped snapshot.
- Official roster and two-season fantasy-point evidence remain required before release and
  calibration of the real pool.
- Deterministic daily selection, correct saved state, durable behavioral validation, no runtime
  data fetches, accessibility, and static GitHub Pages delivery remain release requirements.

## Stale-plan corrections

- The grid has nine clues, including Draft pick.
- The ordinal clues are Height, Draft year, Draft pick, and Age.
- The active plan stays at `docs/active_plans/wnba_game-plan.md` until close-out.

## Rationale

These changes apply the repository principles **Focus on important issues** and **Perfect is
the enemy of good**. They remove low-value timing, exact-reference, and layout-equivalence
blockers while preserving the correctness boundaries that affect the shipped game.
