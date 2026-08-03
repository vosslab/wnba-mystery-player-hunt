# Final built-artifact review

Status: **DEVELOPMENT BUILD ACCEPTED; RELEASE/PUBLICATION BLOCKED**

Reviewed on 2026-08-02 after a fresh production build. This review prioritized a working
guess-feedback loop, persistence, static delivery, and the real release prerequisites. It did
not apply pixel, timing, or reference-parity gates.

## Verified development artifact

- `./check_codebase.sh` exited 0: strict TypeScript checks, lint, formatting, and all 19 Node
  behavior tests passed.
- `./build_github_pages.sh` exited 0 and rebuilt `dist/` from scratch.
- `./run_playwright_tests.sh --build` exited 0: all 9 browser tests passed, including keyboard
  search, feedback, duplicate recovery, Pick for me, win/share/reload persistence, a clear loss,
  and phone/tablet/desktop reachability.
- `source source_me.sh && python3 -m pytest tests/` exited 0: 966 tests passed under Python
  3.12.13.
- The rebuilt `dist/` contains `index.html`, `main.js`, `style.css`, `main.js.map`, and
  `.nojekyll`. The HTML loads only local `style.css` and `main.js`; the roster is inlined in the
  JavaScript bundle.
- Direct built-artifact inspection found no runtime `fetch`, `XMLHttpRequest`, WNBA/NBA URL, or
  performance field (`WNBA_FANTASY_PTS`, minutes, points, rebounds, assists, PIE, or
  `ROSTERSTATUS`) in the shipped snapshot. The browser suite likewise exercises only bundled
  data and records no WNBA network request.
- The visible page states: "Development build: this bundled player pool is incomplete and is not
  a current official WNBA roster." The bundled provenance was the retired prototype form.
- Direct source and artifact inspection found no logos, headshots, image assets, SVG branding, or
  runtime backend/data-acquisition path. The Python-only acquisition boundary is documented in
  `docs/DATA_REFRESH.md`.

## Release blockers (intentional and correctly disclosed)

This is not a public-release sign-off. The following remain unresolved:

1. Complete official current-roster evidence plus complete 2025 and 2026 fantasy-point inputs
   have not been acquired through the Python pipeline.
2. The user has not selected the deterministic 200 or 300 fantasy-point cutoff after the
   roster-intersected comparison and calibration.
3. Official-pool calibration remains unavailable until those inputs exist; six guesses is only
   the development default.
4. `docs/active_plans/decisions/wnba_data_use.md` expressly requires a human review of current
   terms/permission and says public deployment is conditional. It therefore does not permit
   publication today.

## Decision

The built game is suitable for continued local development and playtesting: its core loop is
playable, durable, and statically delivered without browser-side data gathering. Do not deploy
or describe it as an official/public WNBA release until the four blockers above are resolved and
the release checklist is updated with fresh evidence.
