# Install

Installing this repository prepares its TypeScript browser-game tooling. The playable site is a
static build in `dist/` that uses the committed bundled player roster.

## Requirements

- Node.js and npm on your `PATH`; the setup script checks for npm before it installs packages.
- Python 3.12 for the offline roster-maintenance tools. Run Python commands through
  `source source_me.sh && python3`.
- This repository's Python tools currently use only the standard library at runtime.

## Install steps

1. Obtain a checkout of the repository and enter its root.
2. Install the JavaScript development dependencies:

   ```sh
   ./devel/setup_typescript.sh
   ```

3. Install Playwright browsers only when you plan to run browser tests:

   ```sh
   ./devel/setup_playwright.sh
   ```

`./devel/setup_typescript.sh` runs `npm install` from the repository root and creates or updates
`node_modules/`. It is safe to run again after changing `package.json`.

## Verify install

Run the project's complete non-browser gate:

```sh
./check_codebase.sh
```

It type-checks, lints, checks formatting, and runs the Node test suite. A successful run prints
`PASS: 5 checks passed.`

## Build check

Build the exact static artifact that local preview and GitHub Pages use:

```sh
./build_github_pages.sh
```

The command writes `dist/index.html`, `dist/main.js`, its source map, and `dist/.nojekyll`.

## Optional data maintenance

The build uses the committed bundled roster and does not fetch WNBA data. For the separate,
manual Python maintenance workflow, see [Data refresh](DATA_REFRESH.md).
