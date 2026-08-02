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

- Type at least two characters of a player's name and choose a match with the keyboard or mouse.
- Submit the selected player, or use `Pick for me` for an unused development-pool player.
- Read the nine clue columns in the comparison grid to choose the next guess.
- Use the light, dark, or system theme choice; progress, statistics, and streaks persist locally.
- At the end of six guesses, read the result and use Share result for a non-spoiling summary.

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
