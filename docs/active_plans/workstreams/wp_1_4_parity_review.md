# WP-1.4 parity review

## Findings

### Blocker: required end-state parity is still unobserved

WP-1.4 requires factual, screenshot-referenced observations of duplicate rejection, the
end-of-game dialog, statistics contents, and exact share text (including answer leakage).
The parity report correctly says that it could not observe them after the guest-instance
404, but the M1 exit criterion requires every WP-1.4 question to be answered. The Pickle
parity rule therefore requires targeted evidence or escalation; it does not permit an
implementer to invent these behaviors. This blocks exact-parity acceptance for WP-5.2 and
WP-5.3, not the already supported clue-definition recommendation.

### High: Age is described with the wrong owner and time basis

The clue matrix says Age is "Birth date-derived at build; changes annually." The plan requires
the clue engine to derive age from `birthDateUtc` against its injected UTC puzzle date, without
a global/build-time clock. Build-time age would make historic/reloaded puzzle feedback drift
from the stored puzzle date. Correct the report before it is used to guide contracts or M4.

### High: fantasy points are described as eligibility, not recognizability

The locked recommendation calls the fantasy-points cutoff an "offline eligibility and
recognizability rule." Current-roster membership is the sole eligibility gate; fantasy points
only rank those already eligible players for the build-time recognizability cutoff and never
ship as a clue or snapshot field. Correct the wording so no later data work adds a second
eligibility gate.

### Medium: the clue matrix does not supply evidence for its fan-salience claims

WP-1.4 requires fan-salience *evidence* and separately lists learning value, upstream
availability/stability, maintenance cost, width, and deduction value. The matrix combines
several of those dimensions and provides uncited assertions such as programs that WNBA
coverage "routinely identifies." Add direct official league/team player-surface references or
numbered captures for each upstream claim, and label the cultural/program examples as sourced
evidence rather than intuition. The ordered nine-clue decision is user-locked, so this is a
report-completeness issue, not permission to remove a clue.

### Low: the plan's stale eight-column wording must not be propagated

The report correctly identifies later references to eight columns as stale. Its locked order
contains the required nine clues and states that configured definitions, not a count constant,
own the grid. Future walkthroughs and risk language must be corrected to nine, including the
wide College clue.

### Low: the no-arrow conclusion is adequate only for the observed Pickle surface

The absence statement is supported by the inspected instructions, headers, and two feedback
rows: `test-results/pickle_observation/01_instructions.png` shows no arrow rule, and
`test-results/pickle_observation/06_guess_3.png` shows no arrows in the rendered cells. It is
not a controlled numeric-mismatch observation,
so retain its scope as "no arrows in the observed UI" rather than claiming a code-level
property. That evidence is sufficient for the plan's current no-arrows adaptation decision;
a later contrary observation reopens all four WNBA ordinal clues (Height, Draft year, Draft
pick, and Age), as the report states.

## Accepted evidence

- Exact Pickle headers are visibly seven fields: `TEAM`, `LG./DIV.`, `B`, `T`, `BORN`, `AGE`,
  and `POS.` in `test-results/pickle_observation/02_board.png`.
- `test-results/pickle_observation/01_instructions.png` visibly
  establishes nine guesses, a two-letter search threshold, green outlined exact matches, and
  gold dashed partial matches for league/division, age (within two years), and position.
- `test-results/pickle_observation/03_autocomplete.png`, backed
  by `autocomplete.json`, shows one-letter rejection, two-letter results, and each result's
  name plus the same seven-field context as the grid.
- `test-results/pickle_observation/06_guess_3.png` visibly confirms
  exact/partial/non-match rendering and the `4 of 9` counter. The report correctly avoids
  naming the undocumented dark-cell state.
- The ordered recommendation is exactly `Team`, `Conference`, `Height`, `Draft year`, `Draft
  pick`, `Country`, `College`, `Age`, `Position`; it retains both Age and overall Draft pick,
  rejects Draft round, and gives College WNBA-specific treatment.

## Missing evidence

- A healthy completed round or equivalent archived/published evidence for duplicate rejection,
  win/loss dialog contents, statistics, exact share text, clipboard result, and answer leakage.
- Direct official-surface citations/captures supporting each clue's availability/stability and
  the matrix's fan-salience evidence.
- A focused numeric mismatch capture if stronger assurance of the no-arrow observation is
  needed. This is not currently a blocker because the observation scope is explicit.

## Required fix/observation brief

1. Amend the parity report's Age and fantasy-points wording to match the plan boundaries above.
2. Add a compact evidence column or linked appendix for the clue matrix's official-surface and
   fan-salience claims.
3. In a healthy Pickle session, submit a duplicate and complete both a win and loss. Capture
   the dialog, statistics, and the exact copied/share text; record whether answer or clue
   values leak. If unavailable, use the WP-1.4 fallback sources, label confidence, and escalate
   the still-low-confidence end-state details before implementing them.

## Verification

- Read WP-1.4, the Pickle parity rule, age and roster/recognizability decisions, and the
  current parity report.
- Inspected all numbered screenshots visually, with focused visual review of
  `01_instructions.png`, `03_autocomplete.png`, and `06_guess_3.png`; inspected
  `autocomplete.json` and its browser diagnostics.
- Verified the report's existing screenshot target paths resolve locally.
- `source source_me.sh && python3 -m pytest tests/test_markdown_links.py`: exit 0,
  22 passed in 0.04s.
- `git diff --check`: exit 0.

## Verdict

`DONE_WITH_CONCERNS`. The observed grid, feedback, autocomplete, guess count, no-arrow scope,
and nine-clue recommendation are usable. WP-1.4 is not acceptance-complete for end-state
parity, and the two plan-boundary wording errors must be corrected before downstream data or
clue-engine work treats this report as authoritative.
