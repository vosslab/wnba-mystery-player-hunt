# Python Fixture Annotation Repair

## Scope

Added concrete annotations only to pytest fixture parameters in the two Python
data-pipeline test modules. Runtime behavior and test coverage are unchanged.

## Changes

- Annotated `monkeypatch` as `pytest.MonkeyPatch`.
- Annotated `tmp_path` as `pathlib.Path`.
- Added the necessary standard-library `pathlib` import to the roster-builder
  test module.

## Validation

Run the repository's Python environment command:

```sh
source source_me.sh && python3 -m pytest tests/test_function_typing.py tests/test_build_roster_file.py tests/test_fetch_wnba_candidates.py
```
