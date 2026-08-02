# WP-1.5 data-use decision review

## Outcome: NEEDS_FIX

The decision correctly keeps the build local, states that Python is the sole acquisition path,
keeps the browser limited to bundled JSON, and excludes performance statistics and league media
from the shipped product. It also appropriately avoids making a legal conclusion and leaves a
human public-release approval unresolved.

It does not yet meet WP-1.5's required evidence standard. The plan requires the decision record
to cite consulted terms and the specific clauses. The record instead defers all terms review to a
future human and provides no consulted authoritative terms source or clause. Either record the
authoritative materials actually consulted and their relevant clauses, or explicitly amend the
plan's WP-1.5 evidence expectation to match this intentionally conditional, non-legal posture.

The promised README attribution is also not presently true: `README.md` contains neither a
WNBA Stats attribution nor links to this decision record and a refresh guide. The decision may
state this as a release-documentation requirement, but it must not describe it as already carried
by the README until those documentation changes land.

## Checks

- `git diff --check` passed.
- `source source_me.sh && python3 -m pytest tests/test_markdown_links.py -q` found one unrelated
  documentation integration failure: three README links to missing `docs/INSTALL.md` and
  `docs/USAGE.md`. All 33 other Markdown-link cases passed, including this decision record's
  local report links.

## Verified scope

- The decision's private `WNBA_FANTASY_PTS` rule matches the candidate-pipeline report and the
  snapshot validator's performance-field exclusion.
- Its static-browser claim is corroborated by the browser test's WNBA-network-request guard.
- Its statement that complete official roster and two-season input remain unavailable matches the
  bounded access report; it does not overclaim a current official dataset or legal permission.
