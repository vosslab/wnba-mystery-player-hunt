# Python cache ignore

## Change

- Added `__pycache__/` and `*.py[cod]` to `.gitignore`.
- Retained the existing `data/private/` boundary unchanged.

## Verification

- `git check-ignore -v tools/__pycache__/fetch_wnba_candidates.cpython-312.pyc`
  resolves through the new cache rule.
- `git diff --check` passes for this change.
