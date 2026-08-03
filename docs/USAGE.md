# Usage

WNBA Mystery Player Hunt is a daily WNBA player-guessing game that uses the roster bundled with
the repository.

[Play the hosted game](https://vosslab.github.io/wnba-mystery-player-hunt/).

## Play locally

Build the static site, then serve the generated artifact:

```sh
./run_web_server.sh
```

`./run_web_server.sh` rebuilds `dist/`, chooses a local port, and serves that directory. Leave
the command running while playing; stop it with `Ctrl-C` when finished.

## Play a round

- Type at least two characters of a player's name, or enter a team code such as `GSV` to list that
  team's available players, then choose a match with the keyboard or mouse.
- Select a player, or use `Pick for me` to fill an unused bundled-pool player, then submit.
- Check the pool count beside the introduction. A no-match message reports that same pool size so
  an absent player is not mistaken for a spelling error.
- Use the nine visible guess slots to track the round, then read each filled row to choose the
  next guess. Exact clues are orange, close clues are blue, and no-match clues stay neutral.
- Turn on `Match labels` beside Clues to show the status words in every filled cell. The words are
  hidden by default to reduce repetition, while screen readers always announce each status.
- Solve within nine guesses. A first-guess win scores 100 points, and each extra guess costs 10
  points; a ninth-guess win scores 20 points and an unsolved round scores zero.
- Switch to Practice for fresh replayable rounds that do not change daily progress or statistics.
- Leave the theme on its System default, or choose an explicit light or dark override; daily
  progress, statistics, and streaks persist locally.
- At the end of the daily round, read the result and use Share result for a non-spoiling summary.

The site makes no runtime request for roster or statistics data. Updating the bundled roster is a
separate Python maintenance task and does not affect the game architecture.

## Developer checks

Run the usual source checks before handing off a change:

```sh
./check_codebase.sh
./run_playwright_tests.sh --build
```

The first command runs TypeScript, lint, formatting, and Node behavior tests. The second rebuilds
the static site and exercises the browser gameplay tests; install Playwright browsers first when
they are absent (see [INSTALL.md](INSTALL.md)).

## Data maintenance

Roster refresh is an offline Python workflow, separate from browser play and browser tests. Follow
[DATA_REFRESH.md](DATA_REFRESH.md) for the exact Python commands, validation, and recovery steps.
