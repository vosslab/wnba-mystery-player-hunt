# Game shell report

## Outcome

- Added a portrait-first WNBA game shell with the play path visible immediately: purpose, player search, guess count, comparison grid, and result-dialog surface.
- Kept incomplete controls disabled and explicitly described rather than simulating a guess before the game module exists.
- Added light and dark token sets using only the four approved brand colors and opacity variants.

## UX decisions

- The search form is the visual primary action; the attempt counter and grid make progress and feedback location obvious.
- Semantic landmarks, a skip link, labels, live status regions, visible focus, 44px controls, responsive stacking, horizontal grid overflow, and reduced-motion support establish the integration baseline.
- The grid has no fixed clue-column count so the configured nine-clue consumer can own that decision.

## Files

- `src/main.ts`
- `src/index.html`
- `src/style.css`
- `src/constants.ts`

## Validation

```text
npx tsc --noEmit -p tsconfig.json
exit 0, zero diagnostics

./build_github_pages.sh
exit 0, built dist/ successfully

npx prettier --check 'src/**/*.{ts,tsx,mts,cts,js,mjs,cjs}'
exit 0, all matched files use Prettier code style

git diff --check
exit 0
```

## Handoff

- The game module can enable the search and Pick for me controls, replace the grid empty state with configured clues, and open the existing result dialog on completion.
