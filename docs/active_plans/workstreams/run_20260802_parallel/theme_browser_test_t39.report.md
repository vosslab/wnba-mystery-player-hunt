# Theme browser persistence test

## Scope

Added one desktop Playwright integration test in `tests/playwright/gameplay.spec.ts`.
It selects Dark, confirms the applied document theme, reloads, and confirms that
both the document and checked control restore Dark.

The test also asserts that local storage contains only
`wnba-20-questions-save-v1`; it therefore catches a second theme-only storage
key. Its existing diagnostics listener fails the test if a `wnba.com` request,
console error, or page error occurs.

## Validation

- `npx tsc --noEmit -p tsconfig.json` - passed.
- `./run_playwright_tests.sh --build tests/playwright/gameplay.spec.ts --workers=1 --grep 'selected dark theme persists'` - passed (1 test).
- `./run_playwright_tests.sh tests/playwright/gameplay.spec.ts --workers=1` - passed (8 tests).
- `git diff --check` - passed.
