# WNBA data-use posture

## Decision

The current build stays a local development build. Public deployment using data acquired from
WNBA Stats is conditional on a human owner reviewing the then-current official terms and either
obtaining any needed permission or approving a different source/use. A complete official roster
and two-season fantasy-point input must also be acquired and validated through the Python
pipeline before a release build can be made. This is an implementation posture, not legal advice
or a legal conclusion.

## Allowed product data

- The shipped snapshot contains only derived factual identity and clue fields: player name, team,
  conference, height, birth date, draft information, country, college, and position.
- Snapshot data is generated offline from official WNBA Stats responses by Python 3.12. The
  browser consumes its bundled JSON only.
- The project retains source URLs and refresh provenance in the private candidate file and the
  generated snapshot's source note.
- A release README must attribute displayed factual player data to
  [WNBA Stats](https://stats.wnba.com/) and link to this decision record and the refresh guide.
  That attribution is a release requirement; it is not currently claimed as present.

## Excluded data and assets

- No WNBA, NBA, team, or player logos ship.
- No player headshots, photos, video, or other league media ship.
- `NBA_FANTASY_PTS` is used only in the ignored private candidate file to select the recognizable
  current-roster pool. It is not a clue, public snapshot field, page value, or runtime response.
- The published browser makes no WNBA or NBA network request. It does not fetch data at runtime
  and it never controls a browser to collect it.

## Acquisition boundary

The two-stage refresh is entirely Python: `tools/fetch_wnba_candidates.py` validates saved
Python-produced official response exports under ignored `data/private/`, then
`tools/build_roster_file.py` emits the allowlisted public snapshot. Producing the complete
Python-saved official export set remains unresolved. The implementation and recovery steps are documented in
[python_candidate_pipeline.md](../reports/python_candidate_pipeline.md) and
[python_roster_generation.md](../reports/python_roster_generation.md).

Current official acquisition is incomplete: the bounded probe confirmed a player page and request
shapes, but did not obtain complete roster or 2025/2026 traditional-stat responses. The required
release input is therefore still blocked. The full evidence and accepted alternatives are in
[wnba_data_access_and_fields.md](../reports/wnba_data_access_and_fields.md).

## Unresolved review

This record does not determine ownership, trademark, copyright, database, contractual, privacy,
or other legal rights. Before any public deployment, a human owner must review the intended use,
attribution wording, and then-current official terms or written permission. That review remains
unresolved and must rely on authoritative materials current at that time.

## Official materials consulted on 2026-08-02

- [WNBA Terms of Use](https://www.wnba.com/terms-of-use) says that its basketball content includes
  statistics, places restrictions on reproducing or publicly using service material, and gives
  separate conditions for `NBA Statistics`. Those conditions require prominent WNBA.com
  attribution for use/display/publication; limit it to legitimate news reporting or private,
  non-commercial use; and expressly prohibit use with a fantasy game, commercial product/service,
  sponsorship, gambling, live or archived play-by-play, or a comprehensive regularly updated
  statistics database without prior consent. The Terms also say they may change. This record does
  not interpret whether any planned release falls within those categories.
- [NBA Privacy Policy](https://www.nba.com/privacy-policy), linked by the WNBA Terms and describing
  the NBA Family including the WNBA, says it governs personal data processed through covered
  services and identifies categories such as contact, device, location, and online-activity data.
  The current static browser design does not call WNBA/NBA services or collect an account from
  them; a future design that does must receive separate privacy review.

These summaries are implementation evidence, not a substitute for the linked materials or
professional advice. They should be refreshed at the release decision because the Terms say they
may be amended.

## Evidence

- The current development fixture is explicitly typed as development data and the snapshot parser
  rejects performance fields; see [roster_snapshot_schema.md](../reports/roster_snapshot_schema.md).
- The browser validation exercises only bundled static data and records no WNBA network requests;
  see [browser_s1234.report.md](../workstreams/run_20260802_parallel/browser_s1234.report.md).
- The game plan's data boundary and non-goals are the governing product scope; see
  [wnba_game-plan.md](../wnba_game-plan.md).
