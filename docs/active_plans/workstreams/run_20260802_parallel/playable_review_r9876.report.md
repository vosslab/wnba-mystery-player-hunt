# Playable interaction review

**ACCEPT.** The assembled slice has a complete, usable daily-guess loop. This
review intentionally does not impose browser visual, pixel, or reference-site
parity requirements; a separate browser stream owns that evidence.

## Type Safety

- The roster is bundled as a JSON import and is passed as `unknown` through
  `parseRosterSnapshot` before boot. There is no runtime `fetch`, XHR, or data
  API dependency in the game source. The development-pool notice is visible in
  the shell, so a small fixture cannot be mistaken for an official roster.
- The runtime validators use `unknown` at the snapshot and storage boundaries;
  the only `as` casts are the documented brand constructors. The source passes
  strict TypeScript without diagnostics.

## Module Boundaries

- `interaction.ts` is the only browser adapter for the wall clock, randomness,
  and storage. Game selection receives `todayUtc`; the domain modules do not
  consult local time. A thrown local-storage read recovers to a fresh save and a
  thrown write does not interrupt play.
- Search supports the intended practical flow: at least two normalized
  characters, an ARIA combobox/listbox, active-descendant and selected-option
  state, Arrow Up/Down wrapping, Enter selection/submission, Escape dismissal,
  and clickable suggestions. A rejected duplicate keeps the typed name and
  returns an actionable message.
- Pick for me filters already-used player IDs, chooses only from remaining
  bundled players, and accepts its random value through the injected random
  adapter. It does not affect daily-player selection.
- Accepted guesses redraw the configured grid, remaining attempts, and
  statistics; rejected guesses leave persisted state unchanged. The one
  completion transition updates statistics idempotently. A completed reload
  reads the existing result and opens the dialog without another counter
  update.
- Theme changes are session-only and do not introduce a second local-storage
  key. The earlier disclosure-control touch-target repair remains present.

`save_load.ts` repeats the nine clue IDs for runtime validation while
`CLUE_DEFINITIONS` is the grid and engine source of truth. This is not a
playability or correctness blocker for the shipped clue set, so it should not
delay delivery. When a future clue is added, derive the save-load membership
guard from `CLUE_DEFINITIONS` in the same change to prevent schema drift.

## Compile-Time Errors

```text
npx tsc --noEmit -p tsconfig.json
exit 0, no diagnostics

./build_github_pages.sh
exit 0
Built dist/ (GitHub Pages-ready).

./check_codebase.sh
exit 0
PASS: 5 checks passed.

git diff --check
exit 0, no output
```

Browser interaction and accessibility execution were deliberately not run in
this source-level review; that evidence belongs to the concurrent browser
test stream.

## Type-Level Tests

No additional type-level assertion is needed for this integration review. The
existing strict compile gate and 17 deterministic Node behavior tests passed;
the latter cover accepted and duplicate guesses, completion idempotency,
storage recovery, daily selection, search, and clue evaluation.
