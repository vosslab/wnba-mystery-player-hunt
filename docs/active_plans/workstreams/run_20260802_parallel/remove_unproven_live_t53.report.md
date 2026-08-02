# Remove unproven live refresh

## Outcome

The candidate fetcher is manifest-only. It no longer offers `--live`, direct REST retrieval, or a
claim that `commonteamroster` and `leaguedashplayerstats` can support a complete refresh.

## Evidence and boundary

- `https://stats.wnba.com/player/1628932/` loads immediately and is biography evidence only.
- Team and traditional HTML pages load but do not supply the complete roster or fantasy-point
  data required for the candidate file.
- A page-primed exact `commonteamroster` REST request timed out.
- Future response acquisition is Python-produced; the manifest validator reads local official
  responses only. Browser and Playwright never produce data inputs.

## Delivery status

The TypeScript game remains independently buildable and playable with its static valid roster,
even if a future official roster is months old. Official roster and two-season fantasy inputs
remain incomplete only for a later data refresh and cutoff decision.

## Validation

- `source source_me.sh && python3 -m pytest tests/test_fetch_wnba_candidates.py`: 9 passed.
- `./check_codebase.sh`: 5 checks passed; 19 Node tests passed.
