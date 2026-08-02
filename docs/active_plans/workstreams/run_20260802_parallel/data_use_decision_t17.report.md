# Data-use decision report

## Outcome

Added [wnba_data_use.md](../../decisions/wnba_data_use.md) as the WP-1.5 posture record.
It keeps public deployment local and conditional until complete official refresh data is
validated. It makes no legal conclusion.

## Evidence used

- The Python candidate and roster-generation reports establish an offline, Python-only pipeline
  and an ignored private working-data boundary.
- The data-access report establishes that complete official roster and 2025/2026 fantasy-point
  responses remain unavailable in this environment.
- The typed snapshot schema and browser report establish that the current game uses a labeled
  development fixture with no performance data and no runtime WNBA network access.

## Product posture recorded

- Ship only derived factual clue fields from the reviewed snapshot.
- Exclude logos, headshots, league media, and public fantasy-point values.
- Require README attribution to WNBA Stats when release documentation is finalized.
- Require a human review of current authoritative terms or permissions before public deployment.

## Checks

Run after this edit:

```bash
source source_me.sh && python3 -m pytest tests/test_markdown_links.py
git diff --check
```
