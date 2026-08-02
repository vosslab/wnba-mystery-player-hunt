# Usage

WNBA Pickle is a daily WNBA player-guessing game. The browser build currently uses an incomplete
development player pool, clearly labelled in the interface, rather than a current official roster.

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

The site makes no runtime request for roster or statistics data. The visible development notice
means the game loop is ready to evaluate, while the player selection is not release data.

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
Until an official refresh produces a verified snapshot, do not present the bundled development pool
as an official current roster.

## Known gaps

- TODO: Add a hosted URL after GitHub Pages deployment is confirmed.
