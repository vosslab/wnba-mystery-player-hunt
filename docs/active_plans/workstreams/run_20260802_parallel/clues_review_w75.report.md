# Clue engine review

## Decision

ACCEPT.

## Findings

`src/clue_engine.ts` implements the nine configured clues in the plan's order by
mapping `CLUE_DEFINITIONS`. It does not keep a second order-defining list and the
returned cells contain only a clue id, display value, and exact/partial/miss state.

- Team, conference, country, and college are exact-only.
- Height is partial at one or two inches, and misses at three.
- Draft year is partial at one or two drafted-season years. Drafted versus undrafted
  misses; two undrafted players match exactly and never partially.
- Draft pick is partial at one through three drafted overall picks, and misses at four.
- Age is calculated from the supplied UTC puzzle date, including the birthday boundary;
  the engine has no global-clock read.
- Position is exact only for equal primaries, otherwise partial when either full position
  set overlaps. The same forward/guard overlap is partial in both directions.
- The display values use the guessed player and correctly distinguish `Undrafted`,
  formatted feet/inches, pick numbers, and the complete compact position set.

The implementation is pure, exposes the per-clue evaluators needed by a future question
mode, and contains no arrow behavior.

## Validation

```text
npx tsc --noEmit -p tsconfig.json
exit 0, no diagnostics

npx tsx --eval '<clue boundary smoke>'
exit 0: clue boundaries smoke passed

git diff --check
exit 0, no output
```

The focused smoke covered every partial boundary, undrafted handling, both directions of
position overlap, birthday-age calculation, and nine-cell configured ordering.
