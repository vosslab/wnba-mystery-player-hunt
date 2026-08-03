# Development snapshot handoff

## Outcome

- Added a schema-valid 16-player development-only roster fixture at
  `src/data/roster.json`.
- Included the three supplied sample players plus a varied, hand-built early
  guess pool spanning both conferences, multiple teams, positions, draft paths,
  countries, colleges, and heights.
- The envelope explicitly says the fixture is hand-built, incomplete, possibly
  stale, and must not ship as an official current roster.
- The fixture contains no performance data, age, headshots, or official cutoff
  provenance.

## Validation

- `npx tsc --noEmit -p tsconfig.json` passed.
- A focused `npx tsx --eval` parse through `parseRosterSnapshot` passed:
  `prototype roster: 16 players`.
- `git diff --check -- src/data/roster.json` passed.
