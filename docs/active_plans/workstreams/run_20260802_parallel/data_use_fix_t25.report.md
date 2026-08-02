# WP-1.5 data-use record correction

## Scope

Corrected only `docs/active_plans/decisions/wnba_data_use.md` after review. No application,
README, plan, browser, or data-pipeline file was edited.

## Evidence consulted (2026-08-02)

- [WNBA Terms of Use](https://www.wnba.com/terms-of-use): Sections 1 and 9 identify statistics as
  basketball content, restrict public use of service material, require WNBA.com attribution for
  uses of NBA Statistics, limit those uses to news reporting or private non-commercial use, and
  list prohibited contexts including a fantasy game and commercial product/service. The Terms
  also say they may change.
- [NBA Privacy Policy](https://www.nba.com/privacy-policy): identifies the WNBA as part of the NBA
  Family and describes personal-data processing for its covered services.

The record paraphrases those provisions and does not give a legal interpretation or conclusion.

## Result

- Local development remains permitted by the project decision.
- Public deployment is conditional: a human owner must review then-current official materials and
  obtain needed permission or approve another data source/use.
- The requirement for a complete, validated, two-season official input remains separate from that
  human review.
- The game keeps its existing boundaries: Python-only acquisition; bundled static browser data;
  no runtime WNBA/NBA request; no league media or logos; and no shipped fantasy-point values or
  cutoff boundaries.
- README attribution is phrased as a release requirement, not as a present fact.

## Checks

- PASS: `npx prettier --check docs/active_plans/decisions/wnba_data_use.md docs/active_plans/workstreams/run_20260802_parallel/data_use_fix_t25.report.md`
- PASS: `git diff --check -- docs/active_plans/decisions/wnba_data_use.md docs/active_plans/workstreams/run_20260802_parallel/data_use_fix_t25.report.md`
- Link scan: `source source_me.sh && python3 -m pytest tests/test_markdown_links.py` collected
  34 documents; this record and its local links passed. The only failure was unrelated README
  links to the in-progress `docs/INSTALL.md` and `docs/USAGE.md` files.
