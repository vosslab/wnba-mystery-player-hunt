# Grid controls UI handoff

## Outcome

Implemented the presentation-only comparison grid and controls surface. The game layer can
render saved `GuessEvaluation` rows with `renderGrid()` and attach behavior with
`renderControls()` without the presentation layer choosing guesses, searching players, saving
data, or fetching data.

## User-impact decisions

- The grid headers are generated only from `CLUE_DEFINITIONS`, so the nine-clue game has one
  visible ordering contract.
- Each feedback cell includes an explicit `Exact`, `Close`, or `No match` badge as well as a
  solid, dashed, or neutral border. Understanding a row does not depend on color.
- The narrow layout permits horizontal grid scrolling rather than squeezing the clue values.
  The next action remains above it at the intended portrait viewport.
- Search, Pick for me, instructions, statistics, and theme controls are all visible and have
  stable element IDs. Search and guess controls are honestly disabled until the integration
  layer calls `setReady(true)`.
- Theme selection only calls an integration callback and applies a document attribute. It
  never creates a separate storage key; the save layer remains the owner of persistence.

## Integration contract

- `renderGrid(container, evaluations)` redraws `#comparison-grid` safely with DOM APIs.
- `renderControls(document, callbacks)` returns `setReady`, `setStatus`,
  `setSuggestions`, and `setThemePreference`.
- `ThemePreference` is `system | light | dark`; `applyThemePreference()` removes the document
  attribute for the system setting.

## Validation

- `npx tsc --noEmit -p tsconfig.json` exited 0 with no diagnostics.
- `npx prettier --check src/ui_grid.ts src/ui_controls.ts src/index.html src/style.css` passed.
- `npm run build` passed and generated the GitHub Pages bundle.
- `git diff --check` passed.

No commit was made.
