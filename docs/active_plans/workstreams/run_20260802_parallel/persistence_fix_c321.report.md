# Persistence fix report

## Outcome

Fixed the two persistence defects from
[persistence_review_z08.report.md](persistence_review_z08.report.md).

- A valid V1 statistics object that predates `lastCompletedPuzzleDateUtc` now keeps every
  existing counter and distribution value, with that field migrated to `null`.
- A present but malformed completion-date field still makes the save invalid and recovers to a
  fresh save. Unknown versions and other malformed fields retain the existing recovery path.
- The storage namespace is `wnba-20-questions-save-v1`, matching the plan contract.

## Validation

```text
npx tsc --noEmit -p tsconfig.json
exit 0, no diagnostics

npx prettier --check src/save_load.ts src/constants.ts
exit 0, all matched files use Prettier code style

npx tsx --eval '<legacy migration, malformed recovery, normal roundtrip, store exceptions>'
exit 0, persistence smoke OK

git diff --check
exit 0, no output
```

## Focused handoff

The migration is deliberately limited to an absent field in an otherwise valid V1 record; it
does not add version guessing or broaden recovery behavior.
