# Result loss-outcome fix

## Outcome

Changed the loss dialog heading from the ambiguous `Round complete` to `You
didn't solve it.` The answer reveal, attempt count, spoiler-safe share path,
manual-copy fallback, and focus behavior are unchanged.

This is deliberately a small clarity repair: it makes the loss outcome obvious
without trying to reproduce another game's wording or appearance.

## Validation

```text
npx prettier --check src/result_dialog.ts
exit 0, all matched files use Prettier code style

npx tsc --noEmit -p tsconfig.json
exit 0, zero diagnostics

npx tsx --eval '<win/loss spoiler-safe share smoke>'
exit 0, passed: win/loss scores and spoiler-free feedback rows

./build_github_pages.sh
exit 0, built dist/ successfully

git diff --check
exit 0, no output
```
