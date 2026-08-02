# README first-success report

## Outcome

Created the root [README.md](../../../../README.md) as a newcomer landing page for the current
playable development build.

## Evidence used

- [src/index.html](../../../../src/index.html) confirms the game name, six-guess loop, visible
  development-data notice, search control, comparison grid, and local controls.
- [package.json](../../../../package.json), [run_web_server.sh](../../../../run_web_server.sh), and
  [build_github_pages.sh](../../../../build_github_pages.sh) confirm the install, local-run, and
  static-build commands.
- [check_codebase.sh](../../../../check_codebase.sh) and
  [run_playwright_tests.sh](../../../../run_playwright_tests.sh) confirm the documented test
  routes.
- [docs/INSTALL.md](../../../INSTALL.md) and [docs/USAGE.md](../../../USAGE.md) provide the
  deeper newcomer guides.
- [docs/active_plans/wnba_game-plan.md](../../wnba_game-plan.md) establishes the development
  fixture, two-season official-data requirement, approved-cutoff dependency, and Python-only
  future data gathering boundary.

## Content decisions

- The opening is plain prose, 158 characters, and does not repeat the repository directory name.
- The README has one H1 and an empty `screenshot-docs` managed sentinel block. A later visual
  documentation pass can add an inspected screenshot without changing the surrounding copy.
- It documents actual `npm run serve`, `npm run build`, `npm run check`, and
  `npm run test:playwright -- --build` routes. It does not claim a deployed URL, official roster,
  or completed data refresh.
- The unavailable data-refresh runbook is described without a broken local link. The two existing
  setup and usage routes are linked directly.

## Validation

- `source source_me.sh && python3 -m pytest tests/test_readme_first_paragraph.py` passed.
- `source source_me.sh && python3 -m pytest tests/test_markdown_links.py` found three README
  link failures only because `docs/INSTALL.md` and `docs/USAGE.md` are present in the working tree
  but are not tracked by Git. The links resolve to the correct repository paths and will pass once
  those documentation files enter the tracked change set; no README workaround would produce a
  GitHub-browsable link before then.
- `git diff --check -- README.md docs/active_plans/workstreams/run_20260802_parallel/readme_t18.report.md`
  passed.
