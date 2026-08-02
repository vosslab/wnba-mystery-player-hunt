# Playable interaction handoff

## Outcome

The development build now boots a complete daily WNBA Pickle round from bundled
`src/data/roster.json`. It has no runtime roster request and clearly labels the pool as
incomplete development data rather than a current official roster.

## Player-facing behavior

- The browser adapter injects the UTC date into the daily-puzzle module, reconciles the one
  versioned local save record, and remains playable if storage reads or writes fail.
- Search starts at two normalized characters and supports click, Arrow Up/Down, Enter, and
  Escape. Suggestions show player, team, and position with combobox/listbox ARIA state.
- A valid guess updates the grid, remaining-attempt indicator, and statistics immediately.
  Duplicate submissions retain the typed name and explain what to do next.
- Pick for me uniformly selects one unused bundled player using an injected random source.
- Completed games persist before displaying the existing answer and spoiler-safe share dialog;
  a completed reload opens that dialog without recounting statistics.
- Theme changes remain session-only. The save schema deliberately remains the one localStorage
  record; persisting theme needs an explicit schema decision later.

## UI repairs

- `How it works` and `Statistics` keep native disclosure behavior with 44px touch targets.
- The active autocomplete option is visibly marked and exposed through
  `aria-activedescendant` and `aria-selected`.

## Files owned

- `src/interaction.ts` - browser composition, dependencies, and playable controller.
- `src/main.ts` - bundled JSON validation and production boot/error state.
- `src/ui_controls.ts` - autocomplete keyboard/click behavior and UI update hooks.
- `src/index.html` and `src/style.css` - development disclosure and accessible interaction cues.
- `tsconfig.json` - JSON module support for the build-time snapshot import.

## Validation

- `npx tsc --noEmit -p tsconfig.json` exited 0 with no diagnostics.
- `./build_github_pages.sh` exited 0 and printed `Built dist/ (GitHub Pages-ready).`
- `./check_codebase.sh` exited 0: 5 checks passed, including 17 deterministic Node tests.
- `npx prettier --write src/interaction.ts src/main.ts src/ui_controls.ts src/index.html src/style.css tsconfig.json` completed; the later fast gate reported all matched files use Prettier style.
- `git diff --check` exited 0.

## Follow-up

No browser test fixture exists yet for the newly wired flow, so this handoff does not claim a
Playwright walkthrough. The next high-value check is one short player walkthrough (search,
guess, reload, result/share), not pixel comparison or a broad visual audit.
