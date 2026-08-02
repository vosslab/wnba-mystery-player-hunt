# Results and share high-impact review

## Outcome: NEEDS_FIX

The completion boundary, focus behavior, and spoiler-safe share projection are
appropriately small and maintainable. One user-facing completion issue remains:
the loss heading says only `Round complete`. A player who used fewer than the
limit because of a future configuration change, or who scans the dialog rather
than its detail sentence, is not told plainly that they lost. The result dialog
acceptance criterion is to communicate win or loss clearly, so use an explicit
loss heading or sentence (for example, `You ran out of guesses.`). This is a
small wording change with real game-loop value; no reference-site or
pixel-equivalence work is warranted.

## Reviewed behavior

| Concern | Result | Evidence |
| --- | --- | --- |
| Completion ownership | ACCEPT | `renderResultDialog` rejects active puzzles and only reads the completed state; it does not call game-state or statistics code. |
| Win, answer, attempts | ACCEPT | The win heading, target name inside the dialog, and `Solved in n of limit guesses.` communicate the successful outcome. |
| Loss clarity | NEEDS_FIX | `Round complete` plus `Used n of limit guesses.` does not plainly state a loss. |
| Keyboard/focus | ACCEPT | Native modal dialog supports Escape; its Share button is focused on open, and the `close` event restores the launching element when still connected. |
| Share privacy and score | ACCEPT | `formatShareText` derives only a date-like puzzle identity, win/loss score, and exact/partial/miss squares. The spoiler smoke confirmed it excludes player name, player IDs, and displayed clue values. |
| Clipboard recovery | ACCEPT | The injectable writer is used when supplied. Missing or rejected clipboard access exposes a selected, labelled read-only field and tells the player how to copy it. |

The result/share modules are not yet instantiated from `main.ts`; that is an
integration dependency, not a defect in this lane. It must be covered by the
later real win/loss walkthrough before release.

## Validation

```text
npx tsc --noEmit -p tsconfig.json
exit 0, zero diagnostics

./build_github_pages.sh
exit 0, built dist/ successfully

npx tsx --eval '<spoiler-safe win/loss share smoke>'
exit 0, passed: win and loss scores, feedback symbols, and no player name, ID, or clue value

git diff --check
exit 0, no output
```

## Scope

This review intentionally did not require exact Pickle wording, clipboard
formatting, storage behavior, network behavior, wall-clock behavior, or visual
equivalence. Those do not decide whether a player understands the result or can
safely share it.
