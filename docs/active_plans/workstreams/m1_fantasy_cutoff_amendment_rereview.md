# M1 fantasy-cutoff amendment re-review

## Findings

No unresolved findings. The two concerns from the first review are resolved without
introducing a conflicting fantasy-point rule.

- **One eligibility gate:** the plan calls current-roster membership the sole eligibility gate
  (lines 349-352). `ROSTERSTATUS` is expressly diagnostic-only and "never an eligibility
  filter" (lines 370-373); WP-1.2 repeats that it remains diagnostic evidence only (lines
  740-741). It therefore cannot become a second eligibility condition.
- **Bounded overrides:** `forceEligible` is an escape hatch only for a documented, proven
  error in the authoritative roster data, never an independent eligibility or fame decision
  (lines 388-392). WP-3.2 carries the same constraint into the generator acceptance criteria
  (lines 931-937).
- **Unambiguous supplied-count checks:** WP-1.2 defines 102 at 300 FP and 131 at 200 FP as
  2026 current-season checks over *all* rows returned by the traditional-stats page, before
  roster intersection, and requires separately reported post-roster counts (lines 720-728).
  WP-1.3 explicitly treats those figures as all-page cross-checks rather than expected
  post-roster counts (lines 755-760), then intersects the current roster before applying the
  200/300 cutoff.
- **Broader consistency:** all applicable locations retain the direct
  `max(currentSeason, previousSeason) >= cutoff` model, with 200/300 as the decision
  comparison, 75/100/125/150 as context only, explicit zero distinct from missing data, and
  fantasy points restricted to build-time working data. The audit found no sum, minutes,
  games-played, or top-N replacement rule.

## Verification

- `git diff --check` - exit 0 with no output.
- `source source_me.sh && python3 -m pytest tests/test_markdown_links.py` - exit 0;
  22 passed in 0.04s.
- Targeted `rg` confirmed the diagnostic-only `ROSTERSTATUS` language, authoritative-data
  override boundary, all-page/post-roster count distinction, roster-before-cutoff ordering,
  and absence of alternate selection fallbacks.

## Verdict

DONE. The amendment fully resolves both earlier concerns and remains internally consistent
with the approved two-season, current-roster-first, build-time-only fantasy-points direction.
