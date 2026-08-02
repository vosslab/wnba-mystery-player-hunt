# WP-1.5 data-use correction re-review

## Outcome: ACCEPT

The corrected decision record now supports its conditional local-development posture with the
official WNBA Terms of Use consulted on 2026-08-02. Section 1 identifies statistics as
Basketball Content and restricts public use of Service material; Section 9 defines NBA
Statistics to include WNBA player-performance statistics and requires WNBA.com attribution,
limits use to legitimate news reporting or private non-commercial purposes, and lists fantasy
games and commercial products/services among prohibited contexts. The record accurately
paraphrases these clauses without deciding whether this project is covered by any category, and
requires a human release review of the then-current terms or written permission. That is a
properly conditional implementation decision, not a legal overclaim.

The linked NBA Privacy Policy is identified as a supplementary implementation consideration;
the record does not treat it as permission. Its statement that the current browser makes no
WNBA/NBA request is a product-boundary claim corroborated by the static-bundle browser evidence,
not a claim about the official policy.

README attribution is explicitly a release requirement, not a claim that attribution has already
been added. The decision keeps the required boundaries intact: Python-only acquisition, bundled
static browser data, no runtime league request or browser-controlled collection, no league media
or logos, and no shipped fantasy-point values.

## Checks

- PASS: live authoritative review of [WNBA Terms of Use](https://www.wnba.com/terms-of-use),
  including Sections 1 and 9, on 2026-08-02.
- PASS: `npx prettier --check docs/active_plans/decisions/wnba_data_use.md README.md`.
- PASS: `git diff --check`.
- DEFERRED, unrelated integration: `source source_me.sh && python3 -m pytest
tests/test_markdown_links.py -q` has one README failure because the concurrently owned
  `docs/INSTALL.md` and `docs/USAGE.md` files are not present yet; the decision record's own
  local links pass.
