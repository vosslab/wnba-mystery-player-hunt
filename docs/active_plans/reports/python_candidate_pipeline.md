# Python candidate pipeline

`tools/fetch_wnba_candidates.py` is a manifest-only Python validation boundary. It reads saved,
Python-produced official responses; writes a private, ignored working file; never writes
`src/data/roster.json`; and never imports or controls a browser. The later roster generator is
responsible for selection and for dropping fantasy points. This optional maintenance workflow is
independent from game runtime and builds: a valid static snapshot remains playable at any age.

## Standard run

Use a saved manifest when official WNBA Stats responses have been produced locally in Python:

```bash
source source_me.sh && python3 tools/fetch_wnba_candidates.py \
  --input-manifest data/private/official_exports/manifest.json
```

The output defaults to `data/private/wnba_candidates.json`, which is ignored. The optional
`--output` path must also stay below `data/private/`, so candidate performance totals cannot
accidentally become a game-facing or tracked artifact. There is no `--live` route: the required
roster and traditional-stat REST responses are not established as a complete refresh source.

## Export manifest

All paths are relative to the manifest. Every source URL must be an HTTPS `stats.wnba.com` URL.
The response files are saved, unmodified official responses produced by Python. `playerPages`
contains HTML with the `window.nbaStatsPlayerInfo` assignment for every player that appears in a
current roster response.

```json
{
  "asOfDateUtc": "2026-08-02",
  "sources": {
    "teams": {
      "sourceUrl": "https://stats.wnba.com/js/data/widgets/teams_landing_inner.json",
      "file": "teams.json"
    },
    "rosters": [
      {
        "teamId": "1611661317",
        "sourceUrl": "https://stats.wnba.com/stats/commonteamroster?LeagueID=10&Season=2026&TeamID=1611661317",
        "file": "rosters/1611661317.json"
      }
    ],
    "traditionalStats": {
      "2026": { "sourceUrl": "https://stats.wnba.com/stats/leaguedashplayerstats?...Season=2026...", "file": "traditional_2026.json" },
      "2025": { "sourceUrl": "https://stats.wnba.com/stats/leaguedashplayerstats?...Season=2025...", "file": "traditional_2025.json" }
    },
    "playerPages": {
      "1628932": {
        "sourceUrl": "https://stats.wnba.com/player/1628932/",
        "file": "players/1628932.html"
      }
    }
  }
}
```

The representative roster entry above is illustrative only. A real run must provide one roster
response for every team ID found in the official teams response. The tool rejects missing,
duplicate, or unexpected team rosters; player records whose reported team does not match the
roster response; missing player pages; missing required biography fields; and missing 2026 or 2025
`NBA_FANTASY_PTS` values. An explicit numeric zero is retained; an absent record is an error.

## Private candidate schema

The output includes provenance and validation counts, followed by one candidate for each player in
the authoritative current-roster responses. Candidate records retain only the allowlisted roster
and biography fields plus `fantasyPointsCurrentSeason` and
`fantasyPointsPreviousSeason`. `ROSTERSTATUS` is raw diagnostic evidence only; it does not filter
the roster. This file is the only place in the pipeline where fantasy points persist.

No cutoff is chosen here. The downstream generator applies the approved two-season
recognizability rule after current-roster membership has already established eligibility.
