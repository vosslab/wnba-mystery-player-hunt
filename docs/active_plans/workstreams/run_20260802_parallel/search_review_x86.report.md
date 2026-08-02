# Search-index review

## Decision

ACCEPT.

The search module is a small, pure lookup boundary that supports the important
gameplay interaction: after two normalized letters, a player can be found,
understood in context, selected once, and not offered again.

## Evidence

- `normalizeSearchText` case-folds, removes combining diacritics and
  punctuation for matching, and collapses surrounding/repeated whitespace;
  result display text remains the original player name.
- The two-character normalized threshold is explicit and returns no
  suggestions below it. Whole-name prefix, token prefix, and substring matches
  have a deterministic, easy-to-explain order, with display name and player ID
  as stable tie-breakers.
- Results give the interaction layer the player ID plus the name, team, and
  position needed to distinguish choices without leaking puzzle clues.
- Guessed IDs are removed before ranking. The index and query paths have no
  DOM, loading, event, or game-state dependencies and mutate neither caller
  input nor indexed player records.

Punctuation is folded for matching rather than retained in a separate fuzzy
matching system. That is appropriate for the current direct-name autocomplete;
there is no evidence that a broader fuzzy-search feature would improve this
gameplay slice.

## Validation

```text
npx tsx --eval '<search normalization, threshold, ranking, and exclusion smoke>'
exit 0: search focused smoke passed

npx tsc --noEmit -p tsconfig.json
exit 0, no diagnostic output

git diff --check
exit 0, no output
```

## Handoff

The interaction layer can build one index from the parsed roster snapshot and
pass its already-guessed player IDs to each query. No source changes are
requested.
