# Result loss-copy re-review

## Outcome: ACCEPT

The loss outcome is now explicit: the dialog heading says `You didn't solve
it.` This directly fixes the only user-facing concern from the preceding
review, without imposing any reference-site wording or visual equivalence.

## Rechecked behavior

| Concern | Result | Evidence |
| --- | --- | --- |
| Clear loss result | ACCEPT | `src/result_dialog.ts` selects `You didn't solve it.` whenever the completed puzzle status is `lost`. |
| Win, answer, and attempts | ACCEPT | The win path remains `You got it!`; the dialog still reveals the target name and its summary retains `Solved in n of limit guesses.` or `Used n of limit guesses.`. |
| Spoiler-safe share | ACCEPT | `src/share.ts` emits only puzzle identity, score, and feedback squares. A direct loss smoke confirmed `X/9` and rejected a guessed name, player IDs, and a clue label. |
| Clipboard fallback | ACCEPT | Failed or unavailable clipboard access still selects a labelled, read-only manual-copy field and announces the recovery action. |
| Focus recovery | ACCEPT | Opening focuses Share; the dialog close handler restores the connected launching element. |

## Validation

```text
npx prettier --check src/result_dialog.ts src/share.ts
exit 0

npx tsx --eval '<loss share spoiler smoke>'
exit 0, confirmed X/9 plus a feedback row; no name, IDs, or clue label

git diff --check
exit 0, no output
```

The project-wide TypeScript/build commands currently stop on two unused imports
in `src/interaction.ts` (`playerIdFromString` and `ResultDialogController`).
Those imports are outside this results fix and are an in-flight integration
issue, not a reason to reopen the accepted result behavior. There is no
`smoke` npm script; the direct share smoke above covers this lane's pure share
contract. Run the full build once the interaction integration owner resolves
its compile error.
