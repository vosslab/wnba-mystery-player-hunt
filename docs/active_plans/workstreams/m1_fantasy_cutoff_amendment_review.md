# M1 fantasy-cutoff amendment review

## Scope

Independent review of the current diff in `docs/active_plans/wnba_game-plan.md` and
`docs/CHANGELOG.md` against the approved fantasy-points direction:

- current-season checks of 102 players at 300 FP and 131 players at 200 FP;
- include the preceding season;
- select with `max(current, preceding NBA_FANTASY_PTS) >= cutoff` after current-roster
  membership;
- use FP at build time only, never as a clue or shipped snapshot field.

## Findings

### Medium: a second eligibility filter remains permissible

The plan says current-roster membership is the only eligibility gate (lines 71-73 and 349-352),
but lines 371-375 permit `ROSTERSTATUS` to be promoted to a filter if evidence suggests it helps.
That can exclude a current-roster player and conflicts with the stated single eligibility rule.
The `forceEligible` override at lines 390-394 also needs to remain strictly a correction to an
authoritative roster-data error, never an independent eligibility decision.

### Low: the supplied-count population needs an explicit definition

WP-1.2 and WP-1.3 require the 102/131 cross-checks (lines 722-728 and 753-757), while WP-1.3
also limits its comparison to current-roster candidates. The public traditional-stats page can
include players who are no longer on a current roster. State whether 102/131 are expected over
all rows returned by the stats page, current-roster rows only, or both, so a legitimate roster
filter does not look like a failed source check.

### No other fantasy-cutoff defects found

The plan consistently uses a direct cutoff based on the maximum of current and preceding seasons;
it does not retain a sum rule. The 75/100/125/150 comparison is explicitly supporting context,
not a top-N selector. No active minute-based eligibility or recognizability selection remains:
the two remaining `minutes` mentions only prohibit it from the shipped snapshot. Missing fantasy
values are handled as incomplete data, while explicit zeroes remain valid. FP is confined to the
gitignored candidate file and expressly removed before `src/data/roster.json` is written.

## Verification

- `git diff --check` exited 0 with no output.
- `source source_me.sh && python3 -m pytest tests/test_markdown_links.py` exited 0: 22 passed.
- Targeted `rg` audit found the maximum rule in the architecture, WP-1.3, WP-3.2, and open
  decision sections; it found no recent-minutes, participation-data, or games-played fallback.
- Context, objectives, data inventory, M1 exit gate, WP-1.2, WP-1.3, WP-3.1 through WP-3.3,
  data/release gates, risk register, checklist, open decision, and changelog all retain the
  cutoff model and build-time-only FP boundary.

## Verdict

DONE_WITH_CONCERNS. The amendment is internally consistent on the required cutoff, two-season
maximum, roster-first, non-shipping, and missing-data behavior. Resolve the two wording concerns
above before treating current-roster membership as an unqualified sole eligibility gate.
