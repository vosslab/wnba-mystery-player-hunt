# Contract review fix

## Outcome

- `RosterSnapshotV1` is now a provenance-discriminated union. A development snapshot requires
  `development` kind/status and the development selection rule; an official snapshot requires
  `official` kind, `verified` status, and the official selection rule.
- Official provenance now requires exactly two four-digit, distinct adjacent seasons in
  current-season-first order. This validates the relationship without embedding a particular
  season pair or cutoff.
- The official `selectedPoolSize` must equal the validated player count. Unknown recursive input,
  field allowlists, development labeling, and the no-performance-data boundary remain intact.

## Changed files

- `src/types/player.ts` -- narrowed snapshot provenance and enforced the official selection
  metadata invariants at the JSON boundary.
- `docs/active_plans/reports/roster_snapshot_schema.md` -- documented the discriminated
  provenance contract, season ordering, and selected-pool invariant.

## Validation

```text
npx tsc --noEmit -p tsconfig.json
exit 0, no diagnostic output

npx tsx --eval '<snapshot provenance smoke>'
exit 0, snapshot provenance smoke passed

npx prettier --check src/types/player.ts
exit 0, All matched files use Prettier code style!

git diff --check
exit 0, no output
```

The smoke exercised valid development and official snapshots plus rejection of mixed provenance,
one season, non-adjacent seasons, reversed seasons, duplicate seasons, and a pool-size mismatch.

## Handoff

DONE. This fixes the two contract defects from `contracts_review_d64.report.md` without changing
the data pipeline, game behavior, or cutoff decision.
