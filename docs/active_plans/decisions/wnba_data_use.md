# WNBA data-use posture

## Decision

The current Python harvester creates derived candidates from server-rendered Basketball-Reference
WNBA HTML. Public deployment of scraped Basketball-Reference-derived snapshot data remains
conditional on a human owner reviewing the then-current terms and deciding whether permission or a
different source is required. This is an implementation posture, not legal advice or a legal
conclusion.

The game remains independent of that maintenance and release decision. It reads the committed static
snapshot only, makes no runtime network request, and stays playable regardless of the snapshot's
source date.

## Acquisition boundary

- `fetch_wnba_player_data.py` is Python-only and uses validated GET requests for
  `www.basketball-reference.com/wnba/` HTML pages.
- The current totals page supplies team discovery and season totals; current team roster pages
  establish membership; player pages supply biography fields.
- The harvester derives `WNBA_FANTASY_PTS` with the documented WNBA formula solely to rank the
  ignored private candidate file. It is never a clue, public snapshot field, or runtime response.
- `get_page()` rejects JSON, API, XML, POST, browser rendering, JavaScript execution, off-host
  URLs, redirects outside the allowed host, and non-HTML media types.
- The published browser and Playwright never contact WNBA, NBA, or Basketball-Reference services.

The bounded 2026 `--max 3` run succeeded. It demonstrates the technical route only: 15 team pages,
223 current totals rows, 182 prior totals rows, and three test-limit candidates. It does not claim a
complete harvest, cutoff result, permission, or public-release approval. Stage two rejects the
test-limit candidate file.

## Allowed product data

- A future snapshot may contain only game identity and clue fields: player name, team, conference,
  height, birth date, draft information, country, college, and position.
- Candidate source URLs and performance values remain in ignored private data. The public snapshot
  retains selection provenance but no scrape timing or age gate controls play.
- No WNBA, NBA, team, or player logos, headshots, video, or other league media ship.

## Required human review

Before deploying a snapshot generated from Basketball-Reference HTML, review the current
[Sports Reference bot-traffic policy](https://www.sports-reference.com/bot-traffic.html) and
[Sports Reference data-use policy](https://www.sports-reference.com/data_use.html), the intended
public use, attribution wording, and any needed permission. The harvester's pacing is technical
compliance with the published request cap; it is not permission to republish data.

WNBA terms remain relevant if a future implementation again uses WNBA-originated data or assets.
The direct WNBA traditional HTML page currently provides only an Angular shell, and its JSON/API
route is intentionally forbidden. The known WNBA player-page and throttled REST observations are
rejected-route evidence, not a reason to treat Basketball-Reference output as official WNBA data.

## Evidence

- [wnba_data_access_and_fields.md](../reports/wnba_data_access_and_fields.md) records the bounded
  technical result and rejected WNBA Stats route.
- [python_candidate_pipeline.md](../reports/python_candidate_pipeline.md) records the private
  candidate and snapshot boundaries.
- [DATA_REFRESH.md](../../DATA_REFRESH.md) gives the manual two-stage workflow.
