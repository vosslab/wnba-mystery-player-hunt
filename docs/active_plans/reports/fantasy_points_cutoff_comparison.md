# Fantasy-points cutoff comparison

## 2026-08-03 derived-input result

The completed Basketball-Reference HTML pull contains 206 players across 15 current team rosters.
The offline generator applies `max(2026 WNBA_FANTASY_PTS, 2025 WNBA_FANTASY_PTS)` after current
roster membership and removes all fantasy totals from the generated game snapshot.

| Cutoff | Current season | Two-season union | Prior-season additions |
| --- | ---: | ---: | ---: |
| 200 | 131 | 155 | 24 |
| 300 | 107 | 136 | 29 |

The 200-point pool exceeds the requested 120-150-player range. The 300-point pool contains 136
players and matches the corrected target of roughly 8-10 players across each of 15 teams.

## Team coverage

| Team | 200 cutoff | 300 cutoff |
| --- | ---: | ---: |
| ATL | 10 | 9 |
| CHI | 13 | 11 |
| CON | 10 | 8 |
| DAL | 13 | 13 |
| GSV | 11 | 11 |
| IND | 11 | 9 |
| LAS | 8 | 8 |
| LVA | 9 | 8 |
| MIN | 9 | 7 |
| NYL | 10 | 10 |
| PHX | 9 | 9 |
| POR | 10 | 6 |
| SEA | 11 | 9 |
| TOR | 11 | 10 |
| WAS | 10 | 8 |

## Decision

Use the 300-point two-season cutoff. It produces the requested overall scale while preserving the
preceding-season path for established players returning from a season off and the current-season
path for strong rookies. The resulting verified 136-player snapshot includes Olivia Miles and is
committed at `src/data/roster.json`; the private candidate file and its performance totals remain
outside git.
