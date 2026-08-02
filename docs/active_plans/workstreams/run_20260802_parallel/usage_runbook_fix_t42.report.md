# Usage runbook link fix

## Change

`docs/USAGE.md` now links directly to [DATA_REFRESH.md](../../../DATA_REFRESH.md). It retains the
offline Python-only workflow, browser separation, and official-snapshot warning.

## Validation

- Confirmed the local `DATA_REFRESH.md` target exists.
- Checked `docs/USAGE.md` and this report for ASCII-only content, trailing whitespace, and Markdown
  structure.
- Resolved the relative link from this report to `docs/DATA_REFRESH.md`.
- `source source_me.sh && python3 -m pytest tests/test_markdown_links.py` passed: 122 tests.
