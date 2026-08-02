# High-impact plan review

## Assumptions

- The fun-first amendment is the current authority where it narrows an earlier plan gate.
- This review considers only release, correctness, maintainability, validation, and delivery risk.

## Decisions

Two small, high-impact clarifications are needed before treating the plan as internally
settled:

1. The Python-only data boundary is correctly stated in the amendment and WP-1.2, but the
   data report still permits a release-quality **browser/API capture** as an input
   ([`wnba_data_access_and_fields.md:135`](../../reports/wnba_data_access_and_fields.md#L135)).
   That contradicts the explicit future-data boundary in the amendment
   ([`fun_first_priority_amendment.md:23-24`](../fun_first_priority_amendment.md#L23-L24)).
   Make the release input a successful paced official **Python pipeline** capture (or a
   user-supplied export); preserve existing browser observations only as historical discovery
   evidence.
2. The amendment's phrase "Freeze contracts ... nine-guess Pickle reference"
   ([`fun_first_priority_amendment.md:11-12`](../fun_first_priority_amendment.md#L11-L12)) can
   be read as changing the WNBA game to nine guesses, while the active game rule is six,
   tunable only from five to seven ([`wnba_game-plan.md:176-177`](../../wnba_game-plan.md#L176-L177)).
   Change it to "the reference's nine-guess observation (not the WNBA guess limit)" so the
   core loop cannot be implemented with the wrong limit.

Apart from those corrections, the important boundaries are coherent: development data can
unblock M2/M4 but cannot ship; roster membership is the only eligibility gate; the two-season
maximum is recognizability-only and non-shipping; all nine clues, no arrows, puzzle-day age,
and deterministic/save requirements agree. The active-plan close-out move and four ordinal
clues are also consistent.

## Concrete Next Steps

- Apply the two wording corrections, then proceed with contracts, the playable shell, and
  development-data win/loss validation in parallel with the Python data lane.

## Changed Files

- `docs/active_plans/workstreams/run_20260802_parallel/high_impact_review_b42.report.md`

## Validation Performed

- `source source_me.sh && python3 -m pytest tests/test_markdown_links.py` - 22 passed.
- `git diff --check` - passed.

## Handoff

- NEEDS_FIX: release-data wording still permits browser/API collection despite Python-only policy.
- NEEDS_FIX: "nine-guess" wording can override the intended six-guess WNBA loop.
- Everything else reviewed is delivery-consistent; do not add parity or layout gates.
