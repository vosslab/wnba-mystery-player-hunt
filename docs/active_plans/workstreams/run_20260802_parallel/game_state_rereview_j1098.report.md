# Game-state limit-fix re-review

## Outcome: ACCEPT

The implementation resolves the previously accepted high-impact configuration-change bug.
After an incorrect guess is appended, `submitGuess` now completes a loss when the active
guess count is **at or above** the supplied limit. An active legacy save with six guesses
from a seven-guess configuration therefore accepts one distinct seventh guess under a new
five-guess limit, records it once, and completes as a loss; it cannot remain active with
seven attempts.

The ordering retains the core loop behavior: inactive and completed puzzles reject without
evaluation; duplicate and invalid player submissions reject without changing the save; an
exact target still wins immediately; the ordinary fifth distinct incorrect guess loses; and
`completePuzzle` remains idempotent, so statistics are not recorded twice.

## Validation

```text
npx tsc --noEmit -p tsconfig.json
exit 0, zero diagnostics

npx tsx --test tests/test_game_state.mjs
exit 0, 4 passed, 0 failed

npx tsx --eval '<configuration, invalid, completion, and idempotency smoke>'
exit 0, game-state configuration and guard smoke passed

git diff --check
exit 0, no output
```

The focused smoke used eight valid players, made six distinct incorrect guesses under a
seven-guess limit, then applied a five-guess limit to the final distinct wrong guess. It
asserted `lost`, seven recorded guesses, and exactly one recorded game, in addition to
invalid-submission rejection, completed-puzzle rejection, exact-win behavior, and
completion idempotency.
