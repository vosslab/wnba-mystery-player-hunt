# Result and share handoff

## Outcome

- Added `src/result_dialog.ts`, a small native-dialog controller that reads an already-completed
  puzzle, communicates a clear win or loss, reveals the answer only in the dialog, and states
  attempts used against the supplied limit. It never calls game-state completion or statistics
  code.
- The dialog gives keyboard users native Escape/close behavior, focuses the Share action when
  opened, and restores the element that launched it when closed.
- Added `src/share.ts`, which emits a compact WNBA Pickle header, a `n/limit` or `X/limit`
  score, and feedback-only square rows. It intentionally ignores player IDs, names, and every
  clue display value.
- Clipboard writing is supplied through an injectable `writeText` port. A missing or rejected
  clipboard exposes selected, labelled text in the dialog and tells the player exactly how to
  copy it manually.

## UX choices

The completion message and answer precede actions, so the outcome is understood before sharing.
`Share result` is the initial meaningful action; `Close` is an explicit native-dialog exit. The
fallback is visible and actionable rather than an invisible failed copy attempt.

## Validation

```text
npx prettier --check src/share.ts src/result_dialog.ts
exit 0, all matched files use Prettier code style

npx tsx --eval '<share win/loss spoiler smoke>'
exit 0, passed: exact/partial/miss symbols, win score, loss score, and no names, IDs, or clue values

npx tsc --ignoreConfig --noEmit ... src/share.ts src/result_dialog.ts
exit 0, zero diagnostics

npx tsc --noEmit -p tsconfig.json
exit 0, zero diagnostics

./build_github_pages.sh
exit 0, built dist/ successfully

git diff --check
exit 0, no output
```

## Integration request

The interaction owner should instantiate `renderResultDialog`, call `open` only after an accepted
completion result, and supply the resolved target display name. It can pass a clipboard writer if
it already owns one; otherwise the controller uses the browser clipboard when available.
