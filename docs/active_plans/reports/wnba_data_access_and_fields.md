# WNBA data access and fields

## Scope and outcome

The data lane is Python-only and separate from the static TypeScript game. The game consumes a
committed snapshot only; it does not know when or where its data was gathered.

On 2026-08-02, the bounded command below succeeded:

```bash
source source_me.sh && python3 fetch_wnba_player_data.py --season 2026 --max 3
```

It used server-rendered Basketball-Reference WNBA HTML, found 15 current team links, 223 current
season totals rows, 182 preceding season totals rows, and wrote `test-limit` candidates for A'ja
Wilson, Alyssa Thomas, and Dearica Hamby. This proves the bounded HTML-only route. It does not
prove a full refresh, select a 200 or 300 cutoff, or authorize public use of scraped output.

## Active acquisition route

- The current-season totals page discovers current team pages and contains server-rendered totals.
- Current team roster pages establish current membership, the sole eligibility gate.
- Player pages provide biography fields used by the private candidate contract.
- The harvester derives `WNBA_FANTASY_PTS` from totals using the documented WNBA formula:
  `PTS + 1.2 * TRB + 1.5 * AST + 3 * STL + 3 * BLK - TOV`.
- A single `get_page()` function performs every live request with GET. It accepts only validated
  Basketball-Reference WNBA HTML, validates redirects and media types, and rejects JSON, API,
  XML, POST, browser rendering, JavaScript execution, off-host responses, and non-HTML.
- Requests wait at least three seconds plus random jitter. This is below Sports Reference's
  published 20-requests-per-minute cap for other sites; see the
  [bot-traffic policy](https://www.sports-reference.com/bot-traffic.html).

The private envelope identifies this provenance with `source.kind` equal to
`basketball-reference-html`. Candidates and any snapshot generated from them are derived, not
official WNBA data.

## Rejected WNBA Stats route

`https://stats.wnba.com/player/1628932/` loads for an individual player, while the equivalent
`commonplayerinfo` JSON endpoint throttles. The current WNBA traditional page direct HTML is an
Angular shell: the visible table is populated later by JavaScript and has no usable player rows in
the fetched document. The harvester never follows that JSON/API request and never uses a browser
or JavaScript renderer. Historical XML indexes are not used.

This is rejected-route evidence, not a runtime or gameplay blocker. WP-1.2 explicitly allowed an
additional source, and the server-rendered Basketball-Reference path supplies the bounded proof.

## Remaining decision

Run the no-limit command only when a refresh is desired. It should collect all players listed on
the current roster pages, but it has not been completed in this work. Stage two rejects bounded
`test-limit` output. A complete candidate is still required before comparing the 200 and 300
two-season cutoffs and before any candidate snapshot can be promoted.

Public deployment of Basketball-Reference-sourced data remains conditional on a human data-use
review; see [wnba_data_use.md](../decisions/wnba_data_use.md).
