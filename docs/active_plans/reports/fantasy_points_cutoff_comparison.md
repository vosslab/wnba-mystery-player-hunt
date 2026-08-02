# Fantasy-points cutoff comparison

## 2026-08-02 official-input status

No cutoff comparison is available yet. An earlier Python REST attempt timed out and did not
establish complete official roster or traditional-stat inputs. The live path has been removed
rather than described as a working refresh, so this report deliberately contains no substituted
counts, player names, or inferred boundary examples.

Known page behavior is not the blocker: `https://stats.wnba.com/player/1628932/` loads
immediately and provides player-page biography evidence. The team and traditional HTML pages
also load, but do not provide the complete roster or fantasy-point records needed here. A
page-primed exact `commonteamroster` REST request timed out. The direct stats routes therefore
remain unresolved for a complete refresh.

## Next input needed

Provide a locally saved, Python-produced official-response manifest at
`data/private/official_exports/manifest.json`, with the unmodified official team list, all 2026
team rosters, 2026 and 2025 traditional-stat responses, and player-page HTML for every rostered
player. Run:

```bash
source source_me.sh && python3 tools/fetch_wnba_candidates.py \
  --input-manifest data/private/official_exports/manifest.json
```

Once that succeeds, the generator can produce separate, non-game-facing `--cutoff 200` and
`--cutoff 300` files. The eventual comparison will report (1) 2026 all-page counts against the
user's provisional 131/102 figures, (2) current-roster intersections, (3) players admitted by
the 2025 season, and (4) named examples around each boundary. It will not choose a cutoff.

## Game delivery status

The static TypeScript game is playable and buildable without this refresh. This unresolved
official-data comparison affects only a future official snapshot and cutoff decision; it is not a
runtime or delivery dependency for the existing development fixture.
