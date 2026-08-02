# WP-4.1 daily selection review

## Verdict

**ACCEPT.** The selector meets the high-impact deterministic-schedule contract.

## Evidence reviewed

- `puzzleNumberForUtcDate` accepts only canonical, real `YYYY-MM-DD` UTC dates and rejects
  dates before the single `DAILY_EPOCH_UTC` constant. Converting an explicitly supplied
  midnight-UTC string is calendar validation, not a wall-clock dependency.
- `selectDailyPlayer` reads no DOM, storage, network, clock, or random source. The only
  date input is the caller argument.
- A specified FNV-1a/`Math.imul` ranking over `snapshotId` and `playerId`, with player-ID
  tie-breaking, fixes a permutation. It is independent of input player order and has no
  JavaScript-engine-dependent random ordering.
- Empty pools and duplicate IDs throw instead of silently violating the one-player-per-cycle
  guarantee. Modulo indexing repeats only after the full permutation.

## Focused validation

```text
npx tsc --noEmit -p tsconfig.json
exit 0, zero diagnostics

npx tsx --eval '<daily full-cycle, repeat, reversed-input, duplicate/empty, and UTC-boundary smoke>'
exit 0, daily selection smoke passed: 16 unique players, order invariant, exact UTC boundaries

git diff --check
exit 0
```

The source scan found no prohibited operational dependency. Its sole `new Date` constructs
the UTC instant from the injected date string for strict calendar validation.
