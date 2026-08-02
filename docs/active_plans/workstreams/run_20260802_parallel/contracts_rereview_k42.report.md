# Contract fix re-review

## Decision

ACCEPT.

The two requested fixes are complete and keep the existing contract boundaries intact.

## Evidence

- `RosterSnapshotV1` is a real discriminated union: its development and official variants pair
  the `dataKind`, `dataStatus`, and `selectionRule` discriminators, rather than allowing those
  fields to vary independently.
- The JSON parser enforces the same two provenance combinations at the `unknown` boundary. A
  development snapshot carrying an official selection rule is rejected.
- An official rule accepts exactly two four-digit seasons, requires distinct adjacent
  current-first ordering, and rejects a reversed, duplicate, single, or non-adjacent pair.
- An official `selectedPoolSize` must match the validated player-array length. Invalid players
  already reject the snapshot, so a partial parsed array cannot be accepted as official data.
- The review found no regression in the existing boundary decisions: roster JSON remains
  `unknown` until parsed, performance data remains excluded by allowlists, age remains derived
  from birth date plus puzzle date, the nine configured clues retain no arrow state, and save
  types retain their versioned puzzle/statistics boundary.

## Validation

```text
npx tsc --noEmit -p tsconfig.json
exit 0, no diagnostic output

npx tsx --eval '<official and development provenance smoke>'
exit 0, snapshot invariants smoke passed
exit 0, development provenance smoke passed

git diff --check
exit 0, no output
```

The focused smoke accepted valid development and official snapshots and rejected mixed
provenance, bad official status, reversed seasons, and a selected-pool mismatch.

## Handoff

The roster contract is ready for data-pipeline and game consumers. No source changes are
requested from this re-review.
