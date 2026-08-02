# Prebuilt command documentation alignment

## Scope

Aligned the newcomer-facing command examples in `README.md`, `docs/INSTALL.md`, and
`docs/USAGE.md` with the repository's canonical shell-script entry points. Game behavior,
data-boundary statements, and the managed screenshot block were not changed.

## Canonical commands now shown

- `./devel/setup_typescript.sh`
- `./devel/setup_playwright.sh`
- `./build_github_pages.sh`
- `./run_web_server.sh`
- `./check_codebase.sh`
- `./run_playwright_tests.sh --build`

## Validation

```sh
./check_codebase.sh
./build_github_pages.sh
./run_playwright_tests.sh --build
```

All three canonical wrappers passed on 2026-08-02: the codebase gate completed five checks, the
GitHub Pages build produced `dist/`, and all nine Playwright gameplay tests passed.

The repository Python documentation suite was also run with the required environment command:

```sh
source source_me.sh && python3 -m pytest tests/
```

It collected 966 tests and had six unrelated failures in concurrent data/test additions: missing
fixture annotations in the two new Python tool test modules, and shebang/executable-mode alignment
for four new utility files. None are caused by these documentation edits.
