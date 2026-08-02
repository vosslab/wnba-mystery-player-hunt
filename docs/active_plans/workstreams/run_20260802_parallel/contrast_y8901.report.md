# Contextual contrast and accessibility audit

## Outcome

Improved the existing four-token palette without changing a token value, layout, or game
logic. The only genuine source failures were contextual: orange used as a light-theme focus
or boundary color (2.13:1 on Balm), dark controls whose neutral-gray edges blended into
their neutral-gray surface, and the browser's dimmed placeholder treatment.

`src/style.css` now uses existing high-contrast tokens by role:

- Light focus and essential outlines use Ultra Black; dark focus and essential outlines use
  Balm.
- Inputs, secondary actions, miss cells, panels, and theme controls use a theme-aware
  `--control-border`, rather than a gray-on-gray dark-mode edge.
- Exact feedback is an Orange fill with Ultra Black text and an Ink outline; partial feedback
  is an Ink dashed outline. This preserves the game's semantic solid/dashed distinction
  without treating Orange-on-Balm as the essential boundary.
- Placeholders have explicit full-opacity muted text, avoiding user-agent opacity loss.

## Contextual measurements

All ratios are WCAG ratios from `check_contrast.py`; each text value meets the repo's 5.5:1
target, while focus and essential boundaries exceed 3:1.

| Rendered role | Light context | Ratio | Dark context | Ratio |
| --- | --- | ---: | --- | ---: |
| Normal text and focus | Ultra Black on Balm | 15.84:1 | Balm on Neutral Dark Gray | 6.73:1 |
| Secondary/helper/placeholder text | Neutral Dark Gray on Balm | 6.73:1 | Balm on Neutral Dark Gray | 6.73:1 |
| Panel/control/miss border | Neutral Dark Gray on Balm | 6.73:1 | Balm on Neutral Dark Gray | 6.73:1 |
| Primary button and exact-cell text | Ultra Black on Orange | 7.44:1 | Ultra Black on Orange | 7.44:1 |
| Exact-cell essential edge | Ultra Black on Balm | 15.84:1 | Balm on Neutral Dark Gray | 6.73:1 |
| Partial-cell essential dashed edge | Ultra Black on Balm | 15.84:1 | Balm on Neutral Dark Gray | 6.73:1 |
| Page-header contrast | Ultra Black on Balm | 15.84:1 | Balm on Ultra Black | 15.84:1 |

Orange on Balm remains 2.13:1, and Orange on Neutral Dark Gray is 3.16:1. Orange is therefore
kept as a filled accent with black text and a high-contrast outline, not used by itself as a
light-theme focus or required boundary. This is the smallest four-token remediation and keeps
the orange game energy where it helps play.

## Rendered review

The refreshed Playwright walkthrough was inspected at its light desktop and dark phone
states. `image_contrast.py` spot checks found:

- Light page Balm versus the Ultra Black header stripe: 15.84:1.
- Dark page Ultra Black versus the Balm header stripe: 15.84:1.
- An Orange exact cell versus its Ultra Black text/edge: 7.44:1.

The dark phone view now has visibly bounded input, secondary action, panel, grid, and theme
controls; its placeholder is readable rather than browser-dimmed. The light feedback view
keeps orange exact fills, black text, solid exact edges, and dashed close edges legible.

## Palette-audit artifact

`docs/PALETTE_CONTRAST_AUDIT.md` was generated, not hand edited, by
`generate_palette_audit.py` with the current `src/` extraction evidence. Its manifest reports
four colors found and four documented. The generator is intentionally a one-background token
inventory (`#efe3c6` here), so it correctly reports Balm and Orange as failures *when each is
treated as foreground on Balm*. It cannot express the multi-surface, role-aware matrix above;
that limitation is why the contextual table is recorded here rather than falsifying the
generated audit.

## Validation

- `source source_me.sh && python3 .../extract_colors.py -i src/style.css` - four brand hex
  tokens observed.
- `check_contrast.py` measurements recorded under `test-results/contrast_audit/`.
- `generate_palette_audit.py -i src -o docs/PALETTE_CONTRAST_AUDIT.md -b '#efe3c6' -r 5.5` -
  evidence manifest: `colors_found=4`, `colors_documented=4`.
- `npx playwright test --workers=1` - 5 passed. The normal parallel launch transiently hit a
  macOS Mach-port permission failure; the serial rerun passed, so this is not a game failure.
- `npx tsc --noEmit -p tsconfig.json` and `git diff --check` - passed.
- No axe package is installed, and no dependency was added solely for this audit.

## Changed files

- `src/style.css`
- `docs/PALETTE_CONTRAST_AUDIT.md`
- `docs/CHANGELOG.md`
- `docs/active_plans/workstreams/run_20260802_parallel/contrast_y8901.report.md`

No commit or index operation was made.
