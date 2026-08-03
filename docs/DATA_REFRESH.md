# Refresh WNBA roster data

This is an optional two-stage Python-only maintenance workflow. The game uses its committed static
snapshot and remains playable regardless of when that snapshot was gathered. Refreshing data never
runs during a build, test, or browser session.

The live harvester gets server-rendered Basketball-Reference WNBA HTML with Python GET requests.
The current-season totals page discovers the current team pages and supplies totals; team roster
pages establish membership; player pages supply biography fields. Fantasy points are derived in the
ignored candidate file with the documented WNBA formula. They never enter the shipped snapshot.

`get_page()` is the only network function. It validates URLs, redirects, and HTML media types, and
rejects JSON, API, XML, POST, browser rendering, JavaScript execution, off-host URLs, and non-HTML
responses. It waits at least three seconds plus random jitter between requests, respecting Sports
Reference's published other-sites cap of 20 requests per minute. See the
[Sports Reference bot-traffic policy](https://www.sports-reference.com/bot-traffic.html).

## Harvest candidates

Run the root command manually when a refresh is wanted:

```bash
source source_me.sh && python3 fetch_wnba_player_data.py --season 2026
```

The no-limit command fetches every player listed on current roster pages, writes ignored
`data/private/wnba_candidates.json`, and rebuilds tracked `src/data/roster.json` for GitHub Pages.
The completed 2026 pull found 15 teams and 206 current-roster candidates.

The command stores stable biography fields per player in ignored
`data/private/wnba_player_profiles.json`. Each entry remains fresh for 14 days. Totals and roster
pages are never served from this cache, so every run still reflects current stats, trades, cuts,
numbers, and roster membership. Expired profiles refresh individually; a failed refresh uses the
stale biography instead of dropping the player.

Use fast mode when only totals and current roster membership need updating. It makes no player-page
requests and accepts matching cached biographies regardless of age:

```bash
source source_me.sh && python3 fetch_wnba_player_data.py --fast
```

If fast mode encounters a newly rostered player with no cache entry, it warns, continues, and marks
the candidate file incomplete. Run the default command to fill those gaps. Force every player page
to refresh with `--refresh-players`; `-F` and `-R` are the equivalent short forms:

```bash
source source_me.sh && python3 fetch_wnba_player_data.py --refresh-players
```

New and refreshed profiles are saved atomically every five successful requests. Existing
`data/private/wnba_candidates.json` and `data/private/wnba_candidates.checkpoint.json` files
automatically seed the profile cache, preserving completed work from runs created before this cache
existed. The checkpoint still records successful candidates during a pull and is removed after a
complete candidate file is written.

A malformed or unreachable player with no cached biography produces a warning while the remaining
profiles continue. The resulting candidate file has `validation.scope` set to `incomplete` until
every current player succeeds, so stage two cannot promote a partial roster. Re-running retries the
missing player. An incomplete or `--max` pull leaves the existing GitHub Pages roster unchanged.
Missing previous-season totals are recorded as zero; this is valid for rookies and established
players who took that season off.

Use a short, explicitly incomplete plumbing run first:

```bash
source source_me.sh && python3 fetch_wnba_player_data.py --season 2026 --max 3
```

The bounded 2026 command succeeded with 15 team pages, 223 current totals rows, 182 prior totals
rows, and candidates for A'ja Wilson, Alyssa Thomas, and Dearica Hamby. It writes ignored
`data/private/wnba_candidates_test_limit_3.json` with `source.kind` set to
`basketball-reference-html` and `validation.scope` set to `test-limit`. Stage two deliberately
rejects this incomplete file.

An explicit `--output` is allowed only below `data/private/`; it does not change the file's scope.
`--max` truncates after current roster membership is known and favors the highest two-season fantasy
scores, so the small run exercises real joins without claiming a full roster.

## Build the snapshot

The root refresh command runs the offline snapshot stage automatically after a complete pull. It
uses current roster membership as the eligibility rule, and then keeps players with
`max(2026 WNBA_FANTASY_PTS, 2025 WNBA_FANTASY_PTS) >= 300`. This produces 136 players, within the
target of about 8-10 players per each of 15 teams. The current season alone selects 107 players; the
preceding season adds 29 returning players.

Run the stage separately only when rebuilding the public snapshot from an existing private
candidate file:

```bash
source source_me.sh && python3 tools/build_roster_file.py \
  --input data/private/wnba_candidates.json \
  --cutoff 300 \
  --output src/data/roster.json
```

The 200-point comparison selects 155 players and exceeds the requested 120-150-player range. The
generated `src/data/roster.json` snapshot is the committed GitHub Pages runtime input. It excludes
fantasy points, source URLs, cache timestamps, and all other private acquisition data.

## Data-use boundary

Basketball-Reference candidates and snapshots are derived, not official WNBA data. Public
deployment of scraped Basketball-Reference output remains conditional on a human data-use review
and permission decision. Consult the [Sports Reference data-use policy](https://www.sports-reference.com/data_use.html)
and [wnba_data_use.md](active_plans/decisions/wnba_data_use.md) at that decision point.

The WNBA Stats traditional page remains an Angular shell in direct HTML, while its JSON/API route
is forbidden. This is retained as rejected-route evidence only; it does not block the independent
game or this working HTML-only Python path.

## Validate offline stages

```bash
source source_me.sh && python3 -m pytest \
  tests/test_fetch_wnba_candidates.py tests/test_build_roster_file.py
```

The legacy `tools/fetch_wnba_candidates.py` command validates saved local exports only. It is not a
live acquisition fallback and it never contacts the network.
