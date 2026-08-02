# WNBA data access and fields

## Scope and data rules

- Probe date: 2026-08-02 UTC.
- A player is eligible only when she is listed on an authoritative current-team roster.
  `ROSTERSTATUS` is diagnostic data, never a second eligibility filter.
- `NBA_FANTASY_PTS` is a build-time recognizability metric only.  The proposed score is
  the maximum of 2026 and 2025 totals for an otherwise eligible player; it is never a clue
  or a shipped snapshot field.
- Missing data is unknown, not zero. `data/wnba_player_samples.json` is tracked bounded
  evidence and was not changed.

## Historical page-discovery evidence

These observations established page and request shapes during planning. They are not an
acquisition method: all future response gathering remains Python-only, and no browser or
Playwright workflow may supply manifest inputs.

### Known player page

The known page `https://stats.wnba.com/player/1628932/` loads immediately. It is the established
source for individual player biography evidence, including these page assignments:

| Assignment | Count |
| --- | ---: |
| `window.nbaStatsPlayerInfo = ` | 1 |
| `window.nbaStatsPlayerStats = ` | 1 |
| `window.nbaStatsPlayerSeasons = ` | 1 |

This was already established at initial planning and does not establish league enumeration or
current-roster membership. The throttled `commonplayerinfo` REST route is not a replacement.

### Traditional player totals

The supplied official traditional-totals HTML page loads for both 2026 and 2025, but it does not
yield the complete fantasy-point records needed for this refresh. Its page-primed request shape
was recorded as follows (only `Season` differs):

```text
GET https://stats.wnba.com/stats/leaguedashplayerstats?
College=&Conference=&Country=&DateFrom=&DateTo=&Division=&DraftPick=&DraftYear=
&GameScope=&GameSegment=&Height=&LastNGames=0&LeagueID=10&Location=&MeasureType=Base
&Month=0&OpponentTeamID=0&Outcome=&PORound=0&PaceAdjust=N&PerMode=Totals&Period=0
&PlayerExperience=&PlayerPosition=&PlusMinus=N&Rank=N&Season={2026-or-2025}
&SeasonSegment=&SeasonType=Regular+Season&ShotClockRange=&StarterBench=&TeamID=0
&TwoWay=0&VsConference=&VsDivision=&Weight=
```

The page did not yield a complete traditional response. This establishes neither a response
shape nor a viable full-refresh route. The page URLs were:

```text
https://stats.wnba.com/players/traditional/?PerMode=Totals&sort=NBA_FANTASY_PTS&dir=-1&Season=2026&SeasonType=Regular%20Season
https://stats.wnba.com/players/traditional/?PerMode=Totals&sort=NBA_FANTASY_PTS&dir=-1&Season=2025&SeasonType=Regular%20Season
```

This is an environment-specific noncompletion observation, not evidence that the WNBA has no
traditional-stat data or that the endpoint is permanently unavailable. Per the delivery-priority
decision after this bounded run, no direct retry was attempted.

### Team and roster routes

The team HTML page loads, but it does not provide a complete current-roster data set for this
workflow. No team-list schema or complete team set is claimed here.

The Phoenix Mercury team page establishes this exact page-primed roster request shape:

```text
GET https://stats.wnba.com/stats/commonteamroster?LeagueID=10&Season=2026&TeamID=1611661317
```

The exact `commonteamroster` REST request timed out, so no player membership or field shape is
claimed from it. The route must not be presented as a working full-refresh source.

The public `www.wnba.com` routes below all returned browser-visible HTTP 403 Access Denied in
48-58 ms in this environment:

```text
https://www.wnba.com/teams
https://www.wnba.com/team/las-vegas-aces/roster
https://www.wnba.com/team/portland-fire/roster
https://www.wnba.com/team/toronto-tempo/roster
```

The Portland Fire and Toronto Tempo shapes were explicitly tested, but a 403 is not a statement
about whether those teams or their rosters exist upstream.

## Fantasy-cutoff evidence

| Season | All traditional-page rows >= 300 FP | All traditional-page rows >= 200 FP | Current-roster intersection |
| --- | ---: | ---: | --- |
| 2026 | User-provided provisional target: 102 | User-provided provisional target: 131 | Not observable |
| 2025 | Not observable | Not observable | Not observable |

No completed `leaguedashplayerstats` response was available, so these values cannot be
independently verified and no 2025 distribution exists. The values describe all rows on the
traditional page before roster intersection, not eligible-pool counts.

## Field distributions and roster coverage

No completed league record or roster record was captured. The following remain unknown:

- Current team IDs, current-roster count, and membership for every team.
- All 2025/2026 fantasy-point values and the selected 200/300 cutoff intersection.
- Exact representation of undrafted values, `POSITION`, `SCHOOL`, `COUNTRY`, and
  `ROSTERSTATUS` in a current roster.
- The overlap/disagreement between authoritative roster membership and `ROSTERSTATUS`.

The three-player local sample remains useful only for known player-page field names. It cannot
stand in for a distribution or an eligibility source.

## Delivery decision and release-data boundary

The page-first result is clear: individual player-page HTML works for biographies; team and
traditional HTML pages load but do not supply complete roster or fantasy-point inputs; and the
page-primed exact roster REST request timed out. These facts leave official roster and two-season
fantasy inputs unresolved, without claiming that the upstream has no data.

M2 and M4 may proceed with clearly labeled development fixture data. The TypeScript game is
playable and buildable independently of refresh timing; a snapshot can be months old when its
schema and selection invariants are valid. The fixture must not be presented as a real 2026
roster, used to select a daily production answer, or treated as a fantasy-cutoff calibration. A future
official snapshot, current-roster membership, and cutoff comparison require one of these inputs:

1. A successful Python-produced official response set with complete 2026 and 2025 traditional
   rows plus every 2026 team roster, retained and validated by Python; or
2. A Python-produced official export set containing those records and source URLs, ingested,
   validated, and normalized by the manifest-only Python pipeline.

No alternate performance metric, minutes threshold, or `ROSTERSTATUS` fallback is authorized.
The page observations are historical endpoint-discovery evidence only: browser runtime and
Playwright must never gather roster or statistics data for the release pipeline.

## Validation

The static game has separate build and gameplay validation. Official-data acquisition validation
is Python-only and requires a manifest-based source set.
