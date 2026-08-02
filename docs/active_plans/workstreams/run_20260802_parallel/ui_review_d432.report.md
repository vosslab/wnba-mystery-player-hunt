# Grid controls UI review

## Outcome

NEEDS_FIX

The grid and shell establish a good, appropriately responsive baseline without trying to
reproduce MLB Pickle pixel-for-pixel. The remaining issues are narrow but directly affect the
primary guess flow for keyboard and touch users. They should be repaired before the search
and game-state integration claims the page is playable.

## High-impact findings

| Area                           | Result    | Evidence                                                                                                                                                                                                                                                                                                                            | Required repair                                                                                                                                                                                                                                       |
| ------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configured grid structure      | ACCEPT    | `ui_grid.ts` creates every clue header from `CLUE_DEFINITIONS`; it has no independent column list or fixed clue count. DOM construction uses `createElement` and `textContent`, so player values are not inserted as HTML.                                                                                                          | None.                                                                                                                                                                                                                                                 |
| Feedback comprehension         | ACCEPT    | Every feedback cell supplies a text badge (`Exact`, `Close`, or `No match`) in addition to the solid, dashed, or neutral border. The caption and cell accessible name communicate the same meaning without relying on color.                                                                                                        | None.                                                                                                                                                                                                                                                 |
| Palette and responsive posture | ACCEPT    | `style.css` uses the four approved WNBA palette tokens and derived opacity mixes only. The table scrolls horizontally instead of compressing clue content, and the narrow layout stacks the search controls. This is a sensible usability gate, not an exact-layout requirement.                                                    | None.                                                                                                                                                                                                                                                 |
| Keyboard autocomplete          | NEEDS_FIX | `setSuggestions()` creates `role=option` list items, but neither the input nor the options has an active-descendant, focus movement, Enter/Space selection behavior, or callback for selecting a suggestion. `aria-expanded` is hard-coded to `false`. A keyboard player cannot use the visible suggestion choices to make a guess. | Give the input a complete combobox/listbox interaction: reflect whether results are open, support Arrow Up/Down and Enter selection, and expose a callback or selected value to the game integration. Keep the pure search rules outside this module. |
| Reachable touch targets        | NEEDS_FIX | Buttons and input controls have a 44px minimum; theme labels also have 44px height. The interactive `How it works` and `Statistics` summaries have no 44px minimum, however. They are primary information controls on a touch device.                                                                                               | Give the two `summary` controls a 44px minimum hit area while preserving their native keyboard disclosure behavior.                                                                                                                                   |
| State and ownership boundaries | ACCEPT    | Search/guess/Pick-for-me controls start disabled until `setReady(true)`. Theme change applies the document attribute and invokes a callback; it has no separate `localStorage` key. Instructions, statistics, and result dialog remain integration hooks rather than inventing gameplay/search/data behavior.                       | None.                                                                                                                                                                                                                                                 |

## Validation

| Command                                                                               | Result                         |
| ------------------------------------------------------------------------------------- | ------------------------------ |
| `npx tsc --noEmit -p tsconfig.json`                                                   | PASS - exit 0, no diagnostics. |
| `npm run build`                                                                       | PASS - exit 0.                 |
| `npx prettier --check src/ui_grid.ts src/ui_controls.ts src/index.html src/style.css` | PASS.                          |
| `git diff --check`                                                                    | PASS.                          |

## Scope note

A visual browser walkthrough is intentionally deferred until the interaction layer makes a
real guess possible. This review does not require a Pickle comparison, fixed widths, or
pixel equivalence; it identifies only the two usability gaps that block an accessible primary
flow.
