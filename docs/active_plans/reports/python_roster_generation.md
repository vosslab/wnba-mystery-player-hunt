# Python roster generation

`data_fetcher/wnba_roster.py` is the reusable offline second stage of the roster refresh, exposed
through `tools/build_roster_file.py`. It reads the private candidate file produced by
`data_fetcher/wnba_harvester.py`; it does not fetch data, import browser code, or write to the
game unless its caller explicitly names the output path.

## Standard run

After the user approves a cutoff and a candidate file with `validation.scope: "complete"` is
available, run:

```bash
source source_me.sh && python3 tools/build_roster_file.py \
  --input data/private/wnba_candidates.json \
  --cutoff 200 \
  --output src/data/roster.json
```

Use `--cutoff 300` for the other approved option. The script deliberately has no default: the
cutoff is a product decision, not an implementation preference.

## Selection boundary

- Every input candidate already comes from an authoritative current-roster response. That is the
  only eligibility gate.
- The generator rejects `validation.scope: "test-limit"`; an intentionally truncated plumbing
  harvest cannot become a review or game snapshot.
- The selection rule is exactly
  `max(fantasyPointsCurrentSeason, fantasyPointsPreviousSeason) >= cutoff`.
- The corresponding years are read from `candidate_file.source.seasons.current` and `.previous`.
  No downstream selection path assumes particular calendar years.
- A numeric zero is valid. A missing or nonnumeric fantasy total fails before selection.
- The command reports the current-season-only count, the two-season union count, and player IDs
  added only by the preceding season.
- `ROSTERSTATUS` remains diagnostic source evidence. It never filters a candidate.
- The default-empty `data_review/eligibility_overrides.csv` can correct a documented team-code
  presentation error only when its roster-source URL matches the candidate. It cannot add,
  remove, or rank a player.

## Normalization boundary

- `data_review/team_conferences.csv` maps maintained official team codes to `East` or `West`.
  An unknown code fails with the mapping path.
- `data_review/country_overrides.csv` maps raw source values to ISO English display names. An
  unlisted raw value fails with an explicit instruction to add a reviewed row.
- Compound positions are split in source order into one primary and distinct alternates.
- Heights become inches, birth dates become midnight UTC timestamps, and age is not stored.
- Draft year and overall pick are emitted only for drafted players. A recognized paired
  undrafted spelling becomes `{ "kind": "undrafted" }`.
- Explicit source placeholders for missing college data become `No US college`.

## Public output

The output is the exact official `RosterSnapshotV1` envelope described in
[roster_snapshot_schema.md](roster_snapshot_schema.md). It records only the selected cutoff and
the seasons as selection provenance. It contains no fantasy points, minutes, or other performance
statistics. The generator runs a Python allowlist check before its atomic write; the TypeScript
`parseRosterSnapshot` remains the game-import boundary.

## Current delivery state

The generator is ready for a complete private candidate file and the user's cutoff approval. It
has not overwritten `src/data/roster.json`; the current development fixture remains available for
gameplay work until a verified official refresh is intentionally produced.
