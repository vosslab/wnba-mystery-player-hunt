# Install and usage re-review (R40)

## Verdict: NEEDS_FIX

## Required correction

`docs/USAGE.md` still says that the data-refresh runbook is "forthcoming" and
lists publishing it as a known gap. `docs/DATA_REFRESH.md` now exists and
contains the two-stage Python-only workflow. Replace those stale statements
with a link to `DATA_REFRESH.md`; otherwise a newcomer is told the documented
recovery path is unavailable when it is already present.

## Confirmed

- Install commands match the executable project front doors:
  `./devel/setup_typescript.sh`, `./devel/setup_playwright.sh`,
  `./check_codebase.sh`, and `npm run build`. `npm run serve` invokes the
  static-artifact server described in the document.
- The first-play path is practical: build/serve, enter at least two name
  characters, select with keyboard or mouse, submit, read the nine clues, and
  use `Pick for me` when wanted.
- Both documents correctly and prominently identify the bundled roster as an
  incomplete development fixture rather than a verified current official
  roster.
- The browser boundary is correct: the game imports bundled JSON and makes no
  runtime roster/statistics request. Current roster/statistics gathering is
  separate, Python-only work; both Python tool help commands succeeded.
- Theme persistence is now implemented through the existing
  `wnba-20-questions-save-v1` save record. A theme change updates
  `themePreference` and saves it through the same storage path; load restores
  it, with legacy/malformed preferences safely defaulting to `system`.
- `source source_me.sh && python3 -m pytest tests/test_markdown_links.py
  tests/test_readme_first_paragraph.py` produced 39 passes. The single link
  failure is not document-content failure: this checkout's link validator
  deliberately requires targets to be Git-index tracked, while the new
  `INSTALL.md`, `USAGE.md`, and README screenshot are currently untracked.
- `./check_codebase.sh` passed typecheck and lint but currently fails only
  Prettier on the unrelated `tests/playwright/gameplay.spec.ts`.
