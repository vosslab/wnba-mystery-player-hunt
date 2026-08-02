# Python candidate pipeline

`fetch_wnba_player_data.py` exposes the reusable Python harvester in
`data_fetcher/wnba_harvester.py`. This is an optional maintenance command, not a game build or
runtime dependency. It writes only ignored private candidates and never writes
`src/data/roster.json`.

## Network contract

One `get_page()` function owns all live requests. It receives a URL rather than constructing one,
then validates the request, referer, redirect, and HTML media type. It permits only HTTPS
`www.basketball-reference.com/wnba/` HTML pages, uses GET only, and rejects JSON, API, XML, POST,
browser rendering, JavaScript execution, off-host URLs, and non-HTML responses.

The request boundary waits at least three seconds plus `random.random()` seconds before every
request. That is deliberately below Sports Reference's published 20-requests-per-minute cap for
other sites; see the [bot-traffic policy](https://www.sports-reference.com/bot-traffic.html).

## Harvest flow

The current-season Basketball-Reference totals page supplies both current totals and current team
links. The preceding totals page supplies prior-season totals. Each current team roster page
establishes membership, then each selected player HTML page supplies biography fields. The
harvester derives WNBA fantasy points from the totals formula; it never reads a WNBA JSON statistic.

```bash
source source_me.sh && python3 fetch_wnba_player_data.py --season 2026 --max 3
```

The bounded 2026 run succeeded: 15 team pages, 223 current rows, 182 previous rows, and three
candidates (A'ja Wilson, Alyssa Thomas, and Dearica Hamby). Its ignored output is
`data/private/wnba_candidates_test_limit_3.json`; `source.kind` is
`basketball-reference-html` and `validation.scope` is `test-limit`.

The no-limit command has not been completed here. It is expected to visit every player on the
current roster pages and write `data/private/wnba_candidates.json` with `validation.scope` equal
to `complete`. Do not claim full roster coverage, a selected cutoff, or a production snapshot until
that manual run and offline review occur.

## Candidate boundary

Each candidate keeps roster and player-page source URLs, roster and biography fields, and current
and preceding derived fantasy totals. The envelope records the current and previous seasons,
season totals URLs, team count, roster-response count, totals-row counts, candidate count, and
scope. Stable decimal identifiers are deterministically derived from Basketball-Reference source
keys so the established game-facing contract stays numeric.

`--max` sorts by the two-season fantasy score and limits only after the current roster is known.
When it actually truncates, the candidate file is deliberately incomplete and stage two rejects it.
An explicit `--output` must remain below `data/private/` and never changes that scope.

The separate `tools/fetch_wnba_candidates.py` command is an offline validator for saved local
exports. It has no live network role in this path.

## Snapshot boundary

`tools/build_roster_file.py` is offline. It accepts only a complete candidate envelope, applies the
current-roster eligibility gate and a user-approved 200 or 300 two-season cutoff, then drops all
performance fields before writing a static snapshot. The game uses whichever valid snapshot is
committed, regardless of its source date.

Basketball-Reference output is derived rather than official WNBA data. Public use remains subject
to the [data-use decision](../decisions/wnba_data_use.md) and its linked Sports Reference policies.
