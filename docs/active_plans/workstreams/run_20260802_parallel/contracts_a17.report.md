# Shared contracts report

## Outcome

- Added one focused type module each for roster data, puzzle state, and persisted save data.
- Added branded player and puzzle identifiers, with casts confined to their validating constructors.
- Added `parseRosterSnapshot(unknown)` as the sole TypeScript roster-JSON boundary. It validates
  nested objects and arrays and rejects non-schema player fields, including statistics.
- Published the Python-facing roster schema and the development versus official data distinction.
- Kept the nine configured clue labels in one ordered array with no fixed-length type or arrows.

## Type-design influence

The `typescript-engineer` guidance kept domain ownership split by player, puzzle, and save
boundaries; its opaque-type and narrowing rules confined brands and fully narrowed `unknown`
without `any` or unchecked casts.

## Validation

```text
npx tsc --noEmit -p tsconfig.json
exit 0, zero diagnostics

npx prettier --check 'src/**/*.{ts,tsx,mts,cts,js,mjs,cjs}'
exit 0, all matched files use Prettier code style

git diff --check
exit 0

npx tsx --eval '<validator smoke input>'
exit 0, Roster validator smoke check passed.
```

The repository-wide Markdown-link pytest was also run. It found two pre-existing report-link
failures in the Pickle observation artifacts, outside this workstream; this new schema document
introduced no local-link failure.
