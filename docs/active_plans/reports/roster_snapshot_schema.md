# Roster file schema

`src/data/roster.json` is the only game-facing data file. The Python data pipeline writes
JSON to that path; the TypeScript game calls `parseRosterSnapshot` before using it. The two
lanes share this document, not imports. It has no file identity, refresh history, or game-side
freshness tracking.

## Envelope

```json
{
  "schemaVersion": 1,
  "asOfDateUtc": "2026-08-03",
  "dataKind": "derived",
  "dataStatus": "verified",
  "sourceNote": "Server-rendered Basketball-Reference WNBA roster and player data selected offline.",
  "selectionRule": {
    "kind": "derived",
    "eligibilityGate": "current-roster",
    "recognizabilityMetric": "WNBA_FANTASY_PTS",
    "seasons": ["2026", "2025"],
    "cutoff": 300,
    "selectedPoolSize": 1
  },
  "players": [
    {
      "playerId": "1628932",
      "displayName": "A'ja Wilson",
      "searchName": "aja wilson",
      "teamCode": "LVA",
      "conference": "West",
      "heightInches": 76,
      "birthDateUtc": "1996-08-08T00:00:00Z",
      "draft": { "kind": "drafted", "year": 2018, "overallPick": 1 },
      "country": "United States",
      "college": "South Carolina",
      "positionPrimary": "C",
      "positionAlternates": []
    }
  ]
}
```

- `schemaVersion` is the literal number `1`.
- `asOfDateUtc` is a `YYYY-MM-DD` UTC date.
- A verified snapshot derived from Basketball-Reference's server-rendered WNBA roster and
  totals pages uses the inseparable combination `dataKind: "derived"`,
  `dataStatus: "verified"`, and `selectionRule.kind: "derived"`. Its `sourceNote` identifies
  that derived provenance rather than presenting it as an official WNBA source.
- A verified snapshot from an official WNBA source uses the inseparable combination
  `dataKind: "official"`, `dataStatus: "verified"`, and `selectionRule.kind: "official"`.
- The game accepts only verified derived or official snapshots. Temporary roster provenance is
  outside the game-facing schema.
- Derived and official recognizability rules both record `eligibilityGate: "current-roster"`,
  `recognizabilityMetric: "WNBA_FANTASY_PTS"`, exactly two distinct adjacent four-digit seasons
  in current-season-first order, the selected cutoff, and `selectedPoolSize`. The validator
  requires `selectedPoolSize` to equal the validated `players` array length.
- These are strict provenance pairings, not freshness or data-tracking states. The game uses
  the bundled snapshot as-is and neither records when it was harvested nor checks it online.
- The file contains no fantasy points, minutes, or other performance statistics. The cutoff
  exists only as provenance for the offline selection process.

## Player records

Every `players` entry uses this shape:

```json
{
  "playerId": "1628932",
  "displayName": "A'ja Wilson",
  "searchName": "aja wilson",
  "teamCode": "LVA",
  "conference": "West",
  "heightInches": 76,
  "birthDateUtc": "1996-08-08T00:00:00Z",
  "draft": { "kind": "drafted", "year": 2018, "overallPick": 1 },
  "country": "United States",
  "college": "South Carolina",
  "positionPrimary": "C",
  "positionAlternates": []
}
```

- `playerId` is a stable decimal identifier as a string. The active Basketball-Reference HTML
  adapter deterministically derives it from the player's Basketball-Reference slug/source key;
  it is not a WNBA league person identifier.
- `conference` is `East` or `West`; `positionPrimary` and each alternate are `G`, `F`, or `C`.
- `birthDateUtc` is a UTC ISO timestamp. The game derives age from it and the injected puzzle
  date; no age field is stored.
- A drafted player has `kind`, `year`, and `overallPick`. An undrafted player is exactly
  `{ "kind": "undrafted" }`.
- `country` and `college` are normalized display values. The pipeline supplies the explicit
  no-college bucket rather than a blank value.

The validator rejects unrecognized player fields. That is intentional at this data boundary:
it prevents accidental statistical payloads from becoming shipped game data. It does not
recompute current-roster membership or fantasy-point eligibility; Python owns those offline
decisions.
