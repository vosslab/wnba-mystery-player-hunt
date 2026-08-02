# README finalization report

## Scope

Updated `README.md` to replace the obsolete pending-runbook wording with the implemented data
refresh guide and the data-use decision record. The managed screenshot sentinel comments and their
existing image embed were left unchanged.

## Product posture

The README now describes the bundled roster as a hand-built development fixture. It makes no
hosting claim and keeps the six-guess game loop and Python-only, no-runtime-request data boundary.
It states that a release snapshot would use factual WNBA Stats fields with attribution only after
the current terms and any required permission receive human approval.

## Validation

Ran the focused README, Markdown-link, ASCII, and whitespace tests using the repository Python
environment. README, Markdown-link, and whitespace checks passed. The suite had one unrelated
pre-existing source failure: `src/share.ts` contains the non-ISO-8859-1 share-square emoji, which
the repository-wide ASCII check rejects (501 passed, 1 failed). This README edit introduced no
ASCII or link failure.
