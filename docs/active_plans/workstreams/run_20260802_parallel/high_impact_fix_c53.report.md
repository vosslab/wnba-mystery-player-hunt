# High-impact review fix

## Assumptions

- The fun-first amendment is the authority for delivery priorities where it narrows the active
  plan.
- Browser observations already recorded in the data report remain useful historical discovery
  evidence, but are not a permitted release-data collection method.

## Decisions

1. Official release data may arrive only from the paced Python pipeline retrieving official public
   HTML, JSON, or API data, or from a user-supplied official export that Python ingests, validates,
   and normalizes. Browser runtime and Playwright are excluded from roster/statistics gathering.
2. The nine-guess count belongs only to the observed Pickle reference. The WNBA game defaults to
   six guesses and can tune only within the already-approved five-to-seven range.

## Changed Files

- `docs/active_plans/reports/wnba_data_access_and_fields.md`
- `docs/active_plans/workstreams/fun_first_priority_amendment.md`

## Validation Performed

- `source source_me.sh && python3 -m pytest tests/test_markdown_links.py` - 32 passed, 2
  failed on pre-existing missing ignored `test-results/pickle_observation/` screenshot links in
  the Pickle parity report and its review; neither affected file is owned by this fix.
- `git diff --check` - passed.

## Handoff

- DONE: the two high-impact ambiguities identified in `high_impact_review_b42.report.md` are
  resolved without adding new gates or reopening game-design decisions.
