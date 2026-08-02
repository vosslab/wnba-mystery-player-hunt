# High-impact fix re-review

## Scope

This re-review checks only the two corrections requested by
`high_impact_review_b42.report.md`. It deliberately excludes layout, visual-parity, and other
low-impact questions.

## Decision

ACCEPT.

1. The delivery-data boundary now permits only a paced official Python retrieval, or an official
   user export that the Python pipeline ingests, validates, and normalizes. The report explicitly
   confines prior browser observations to historical endpoint discovery and prohibits browser
   runtime and Playwright from gathering roster or statistics data for release. The active plan
   independently states the same Python-only boundary.
2. The nine guesses are now expressly an observation about the Pickle reference, not the WNBA
   game rule. The WNBA rule is unambiguous: default six guesses, tunable only from five through
   seven.

Both changes remove implementation ambiguity without adding unnecessary delivery gates. They
preserve the important separation: data refresh is a Python concern, while browser automation is
for game behavior and UI validation.

## Validation

- `git diff --check` - passed.
- `source source_me.sh && python3 -m pytest tests/test_markdown_links.py` - 32 passed, 2 failed.
  The failures are the pre-existing missing ignored screenshots under
  `test-results/pickle_observation/`, referenced by the Pickle parity report and its review. They
  are outside this re-review and do not concern either corrected boundary.

## Handoff

ACCEPT: proceed with the Python data lane and the independent playable-game lane in parallel.
