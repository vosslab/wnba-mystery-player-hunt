# Install and usage review

**Verdict: NEEDS_FIX**

## High-impact finding

`docs/USAGE.md` line 23 says the light, dark, or system theme choice persists
locally. It does not. `SaveDataV1` contains only a puzzle and statistics, and
`bootPlayableGame()` neither supplies an `onThemePreferenceChange` callback nor
restores a saved preference. A reload returns the controls to the HTML default
(`System`).

Either persist the theme in the existing versioned save record as the plan
requires, or correct the sentence to say that only progress, statistics, and
streaks persist. The former is the better delivery fix because the active plan
explicitly requires theme persistence under the one localStorage key.

## Confirmed

- Setup and browser-test commands match the executable scripts.
- The initial game path is clear, names the two-character search threshold, and
  explains both keyboard/mouse selection and `Pick for me`.
- Both documents clearly label the bundled roster as development-only rather
  than an official current roster.
- Usage correctly states that the browser makes no runtime roster/statistics
  request, and keeps future roster refresh in a Python-only, offline workflow.
- Markdown-link validation passed: `34 passed` via
  `source source_me.sh && python3 -m pytest tests/test_markdown_links.py`.

