# Contract review

## Type Safety

NEEDS_FIX.

- `RosterSnapshotV1` independently permits `dataKind`, `dataStatus`, and `selectionRule` (`src/types/player.ts:32-58`). Make it a discriminated union; retain parser checks.
- The official parser accepts one season and any positive `selectedPoolSize` (`src/types/player.ts:361-390`). Require two distinct adjacent seasons and pool size equal to player count; this keeps 2025+2026 provenance truthful without hardcoding a cutoff.

## Module Boundaries

Owners are clear. `unknown` is narrowed; casts stay in constructors. Performance fields are excluded; age and nine ordered no-arrow clues are sound.

## Compile-Time Errors

`npx tsc --noEmit -p tsconfig.json` -- exit 0, no diagnostic output.

`git diff --check` -- exit 0, no output.

## Type-Level Tests

No type-test pattern exists. Prefer validator tests; add negative type proofs only if that pattern lands.

Handoff: fix provenance and pool invariants before dependent lanes.
