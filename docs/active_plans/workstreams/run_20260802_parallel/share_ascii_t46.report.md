# Share-text ASCII source fix

## Change

Replaced the three literal share-grid square glyphs in `src/share.ts` with JavaScript Unicode
escapes. The runtime output remains the same green, yellow, and black squares, while the
TypeScript source is ASCII-only.

## Validation

- `./check_codebase.sh`
- `source source_me.sh && python3 -m pytest tests/test_ascii_compliance.py`
