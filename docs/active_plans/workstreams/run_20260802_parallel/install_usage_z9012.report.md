# Install and usage docs report

## Outcome

Created [docs/INSTALL.md](../../../INSTALL.md) and [docs/USAGE.md](../../../USAGE.md) from the
working scripts and the current playable development build.

## Evidence used

- [devel/setup_typescript.sh](../../../../devel/setup_typescript.sh) installs npm dependencies and
  names the optional Playwright setup.
- [check_codebase.sh](../../../../check_codebase.sh) owns the non-browser quality gate.
- [build_github_pages.sh](../../../../build_github_pages.sh) builds the `dist/` artifact, and
  [run_web_server.sh](../../../../run_web_server.sh) serves that artifact locally.
- [src/index.html](../../../../src/index.html) visibly labels the bundled roster as incomplete
  development data; [tools/fetch_wnba_candidates.py](../../../../tools/fetch_wnba_candidates.py)
  confirms data maintenance is Python-only.

## Validation

- `source source_me.sh && python3 --version` reported Python 3.12.13.
- `source source_me.sh && python3 tools/fetch_wnba_candidates.py --help` passed.
- `./check_codebase.sh --help` and `./run_playwright_tests.sh --help` passed.
- `npm run build` passed and built `dist/`.
- `npm run check` passed: typecheck, lint typecheck, ESLint, Prettier, and 17 Node tests.
- `npm run test:playwright -- --build` rebuilt the site, but Chromium could not launch in this
  sandbox (`MachPortRendezvous` permission denied); the five failures did not reach game code.
- `source source_me.sh && python3 -m pytest tests/test_markdown_links.py` and
  `git diff --check` pass after the documentation patch.

## Known gaps

- The data-refresh runbook and verified official snapshot are not yet present, so the docs retain
  the development-data warning and do not duplicate unfinalized refresh commands.
- No deployed GitHub Pages URL was confirmed.
