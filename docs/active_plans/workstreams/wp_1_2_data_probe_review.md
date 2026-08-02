# WP-1.2 data-probe review

## Findings

### High: the NO-GO conclusion exceeds the failed-access experiment

The report records three direct REST requests with a six-second read timeout, all of which
timed out. That is sufficient to reject a production pipeline based on those unproven direct
requests, but it is not sufficient to conclude that the official data is unavailable or that
WP-1.2 has exhausted viable official access paths. No browser/XHR capture is recorded, no
state-based wait longer than six seconds is recorded, and no completed browser request supplies
the actual URL, query parameters, headers, response shape, or timing.

The report should say "NO-GO for implementation on the present evidence in this environment,"
not imply an upstream-wide NO-GO. A failed direct probe is environment-specific access evidence;
it does not establish an upstream outage, removal, or permanent throttle policy.

### High: the successful known-player route was not retested in the final probe

`wnba_player_samples.json` was written at 2026-08-02 11:12 CDT by the checked-in prototype,
which uses a 20-second timeout and extracts all three `window.nbaStatsPlayer*` assignments for
three player pages. The report, written about 50 minutes later, says those assignments occur
zero times in current player-page HTML, but does not record a final-probe request to any of the
three known player URLs, its response size/status, or the exact marker counts. This contradiction
is material: it could be real upstream drift, a request/header difference, or a probe defect.
It must be resolved before discarding the proven page route.

### High: actual page XHR parameters remain inferred, not confirmed

The template binding `playerStats.rows` supports the conclusion that the shell renders client-side
data, but it does not prove the endpoint is `leaguedashplayerstats` or prove the listed parameters
and header set. The report expressly labels the header set attempted rather than proven. It must
not call the endpoint/page relationship "proven" until a browser network capture identifies the
request that populated the page and preserves a redacted request/response summary.

### Medium: roster-route coverage is insufficient for 2026 current-roster enumeration

The report checks `/teams/`, one legacy team id (`1611661317`), and one REST league route. That
does not satisfy the required multi-team, current-roster probe or establish that no official
HTML-first enumeration path exists. In particular, it does not document a tested roster-page URL
pattern for each official current team, nor a team list that includes the 2026 Portland Fire and
Toronto Tempo. The lone `www.wnba.com` 404 has no URL in the report, so it cannot be reproduced
or evaluated as an alternate official route.

### Medium: all league-wide acceptance questions remain unresolved

No complete roster or 2025/2026 traditional-stat payload was obtained. Therefore the report does
not resolve the all-row 2026 300/200 FP cross-checks (102/131), their current-roster intersections,
the two-season data completeness rule, the undrafted representation, or any requested distribution
for position, school, country, and roster status. Reporting them as unknown is correct; declaring
WP-1.2 complete is not.

## Accepted evidence

- The report preserves the user's rules: current-roster membership is the sole eligibility gate;
  `WNBA_FANTASY_PTS` remains a build-time-only recognizability metric; 2025 and 2026 totals use the
  approved maximum rule; missing values are not coerced to zero.
- Direct HTML GETs to the listed Stats routes returned HTTP 200 shells without the reported
  embedded records, and the three direct API attempts produced no usable payload within their
  stated six-second read timeout.
- The report properly avoids inventing a full-refresh pacing interval, roster count, or field
  distribution from a failed pull, and it does not substitute `ROSTERSTATUS`, minutes, or games
  played for the agreed rules.

## Missing or weak evidence

- A controlled, current retest of at least one of the three known player pages using the checked-in
  prototype headers and its 20-second timeout, with status, response length, and all three marker
  counts recorded.
- Browser/XHR observation of the traditional page and a known-player page with a state-based wait
  for populated rows or a terminal error, plus the actual request URL, query, response status,
  timing, and field names.
- Browser-derived evidence that the API request succeeds or fails after a realistic wait; three
  six-second direct attempts cannot establish browser access behavior or a working rate limit.
- Reproducible official current-roster coverage: a documented roster URL pattern, tested across
  multiple teams, and an official team-list route that explicitly enumerates all 2026 teams,
  including Portland and Toronto. The report must give the exact `www.wnba.com` fallback URL,
  rather than only its 404 result.
- A clear boundary between observations from this execution environment and claims about the
  upstream service. The absence of an API body here is not evidence that the WNBA has no data.

## Required follow-up

Run one bounded, read-only browser-led probe before choosing the final WP-1.2 status:

1. Retest `https://stats.wnba.com/player/1628932/` with the prototype request settings and record
   the three marker counts. This resolves the same-day sample/report conflict.
2. In a real browser, open the supplied traditional page for 2026 and 2025. Wait for either a
   populated table or a visible terminal error/network completion (for example, up to 30 seconds,
   recording the actual condition rather than assuming a fixed sleep). Capture the XHR/fetch call
   that supplies rows, including its exact URL/query and response outcome.
3. Use the confirmed request, if any, for one 2026 and one 2025 response. Verify the all-row FP
   counts against the user-provided 102 at 300 and 131 at 200 before any roster intersection.
4. In the same browser session, test an official league/team-list route and roster pages for a
   multi-team sample that includes a 2026 expansion team. Record route shapes and whether each
   returns roster records. Only after that page-first pass, test the documented REST fallbacks at
   an observed, successful pace.

If no browser path returns data, retain a scoped, environment-specific implementation NO-GO and
escalate before WP-3.1. Do not change the FP cutoff, two-season rule, or current-roster-only gate.

## Verification

- Reviewed [wnba_game-plan.md](../wnba_game-plan.md),
  [wnba_data_access_and_fields.md](../reports/wnba_data_access_and_fields.md),
  [fetch_wnba_player_data.py](../../../tools/fetch_wnba_player_data.py), and the local sample.
- `source source_me.sh && python3 -m pytest tests/test_markdown_links.py` (pending final run).
- `git diff --check` (pending final run).

## Verdict

DONE_WITH_CONCERNS. The report accurately records a blocked direct-access attempt and protects
the user's data rules, but it does not meet WP-1.2's league-wide acceptance criteria or justify a
general upstream NO-GO. The bounded browser-led follow-up above is required before making the
data-lane decision final.
