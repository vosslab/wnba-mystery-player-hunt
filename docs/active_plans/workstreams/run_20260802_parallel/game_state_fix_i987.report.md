# Game state guess-limit fix

## Outcome: DONE

`submitGuess` now treats an appended incorrect guess count at or above the configured limit as a
loss. This prevents a legacy or previously saved active game from remaining active after a
configuration change lowers the limit. The accepted guess is still recorded once, then the
existing authoritative completion path records the loss and its idempotent statistics update.

The unchanged ordering preserves current semantics: missing, completed, duplicate, and invalid
submissions remain rejected before a player row is evaluated or appended; an exact target still
wins immediately.

## Focused smoke coverage

The temporary smoke exercised both outcomes:

- Five distinct incorrect guesses at the normal limit of five complete an authoritative loss.
- A valid active save with six prior distinct guesses made at limit seven accepts its next
  distinct incorrect guess under a new limit of five, then returns `lost` with one recorded game
  rather than an active seven-guess state.

## Validation

```text
npx tsc --noEmit -p tsconfig.json
exit 0, zero diagnostics

npx tsx _temp_game_state_limit.mts
exit 0

npx prettier --check src/game_state.ts _temp_game_state_limit.mts
exit 0, all matched files use Prettier code style

git diff --check
exit 0, no output
```

The temporary smoke file was removed after validation.
