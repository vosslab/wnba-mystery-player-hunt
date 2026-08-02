# Responsive browser coverage

## Outcome

Added one small parameterized Playwright path for each requested viewport:
430x932, 768x1024, and 1920x1080. It complements the existing 800x1280 and
390x844 routes without adding timing, screenshot-comparison, or network gates.

Each path starts with a clean local save, opens the **How it works** disclosure,
switches dark then light themes, and submits a visible non-target player. It then
confirms the resulting clue row appears and that the search input and Guess
control remain reachable and enabled for the next decision.

The existing per-page diagnostic hook remains active: a page error, console
error, or any `wnba.com` request fails the test. The browser only reads the
bundled development JSON through the built local application; it does not gather
or refresh WNBA data.

## Scope decision

No production change was needed. The responsive paths passed at all three
requested sizes, so there is no demonstrated high-impact usability failure to
fix in this workstream.

## Validation

```text
npx tsc --noEmit -p tsconfig.lint.json
exit 0

./run_playwright_tests.sh --build tests/playwright/gameplay.spec.ts
exit 0; 7 passed
```

`./check_codebase.sh` reached its lint step after both TypeScript checks passed,
but the shared worktree currently has an unrelated lint failure in
`tools/simulate_difficulty.mjs` (`fileURLToPath` is unused). This workstream
does not own that tool. The final shared gate should be rerun after its owner
resolves the concurrent change.
