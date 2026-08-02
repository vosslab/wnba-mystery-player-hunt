# Roster generator high-impact review

## Verdict

ACCEPT. The generator maintains the intended data boundary and produces parser-valid snapshots
without altering the development fixture during the offline checks.

## Correctness findings

- The command requires an explicit `--cutoff` of either `200` or `300`. Selection is exactly
  `max(fantasyPointsCurrentSeason, fantasyPointsPreviousSeason) >= cutoff`; numeric zero is
  accepted, while missing or nonnumeric values fail.
- Current-roster membership is the sole selection eligibility input. `ROSTERSTATUS` is retained
  only in the private profile record and is never read for selection. Overrides are default-empty,
  must name a present player and the exact candidate roster URL, and only replace the displayed
  team code; they cannot add, remove, or rank candidates.
- The selection summary correctly distinguishes current-season-only players from the two-season
  union and lists only the IDs admitted by the preceding season. An offline two-player fixture
  selected 2 at 200 (including ID 99 as the preceding-season addition) and 1 at 300.
- The maintained team table contains all 15 planned 2026 codes, including `POR` and `TOR`; an
  unknown code fails clearly. Unknown raw countries also fail, requiring a reviewed mapping.
- Height, ISO birth date, drafted versus undrafted fields, no-US-college values, and compound
  positions normalize at the private-to-public boundary. The tested `Guard/Forward`, undrafted,
  Canadian, and missing-college case emitted `G`, alternate `F`, `{ "kind": "undrafted" }`,
  `Canada`, and `No US college`.
- Output has exact key allowlists for the snapshot, selection rule, players, and draft shapes, so
  performance values cannot leak from private candidates. The generated 200 and 300 outputs both
  passed `parseRosterSnapshot`.
- Provenance is constrained to HTTPS `stats.wnba.com` input URLs. The output uses a sibling
  temporary file followed by replace, so a complete generated file replaces the named destination
  atomically.

## Validation

- `source source_me.sh && python3 tools/build_roster_file.py --help` -- pass.
- `source source_me.sh && python3 -m py_compile tools/build_roster_file.py` -- pass.
- `source source_me.sh && python3 -m pyflakes tools/build_roster_file.py` -- pass.
- `source source_me.sh && python3 -m bandit -q tools/build_roster_file.py` -- pass.
- Offline fixtures covered both cutoffs, zero versus missing fantasy points, preceding-season
  additions, undrafted/compound/international normalization, and explicit unknown-country and
  unknown-team failures. No network or browser was used.
- Generated snapshots passed the TypeScript `parseRosterSnapshot` boundary. The SHA-1 of
  `src/data/roster.json` was unchanged before and after the tests.
- `git diff --check` -- pass.

## Deliberately out of scope

This review did not verify live WNBA data availability, current real-world roster composition, or
the product choice between the 200 and 300 cutoffs. Those are acquisition/calibration decisions,
not generator correctness defects.
