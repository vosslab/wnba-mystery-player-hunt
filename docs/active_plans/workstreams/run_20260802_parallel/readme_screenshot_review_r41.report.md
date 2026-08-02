# README Screenshot Review

## Outcome: NEEDS_FIX

The existing PNG is a useful, readable 1600 x 1000 (16:10) desktop capture. It visibly shows the
development-fixture disclosure, an accepted wrong guess, remaining attempts, and the comparison
grid. Its 112,206-byte size is comfortably within the documentation budget. The README has one
exact managed-block begin sentinel, one exact end sentinel, and one descriptive relative image
embed between them. The capture harness is syntactically valid and its source is Prettier-clean;
the paired capture report is also Prettier-clean.

I replayed the harness against the existing `dist/` artifact. It produced a byte-identical
1600 x 1000 PNG at `/tmp/wnba_pickle_feedback_replay_r41.png` and did not report console/page
errors or WNBA requests. The harness serves only `dist/` and installs a request listener that
turns any `wnba.com` request into a failure, satisfying the browser/data boundary for a successful
run. (The README as a whole currently needs Prettier formatting, outside the managed screenshot
block.)

## Required fix: target-first persistence

The player loop clears storage only once before it begins. On a UTC day where `players[0]` is the
daily target, the first submission wins and persists a completed puzzle. The subsequent reload
retains that completed save. Every later submission is rejected as `puzzle-complete`; meanwhile
the existing winning row still makes `comparisonRows.count()` nonzero, so the loop treats it as an
accepted feedback state and only fails later because the completion dialog remains visible. Thus
the capture cannot reliably produce its promised non-winning feedback state on every schedule day.

Clear local storage and reload before *each* candidate attempt (or isolate each attempt in a fresh
browser context), then accept a candidate only after confirming an active puzzle and a newly added
comparison row. That makes the target-first day recoverable without changing game behavior or
depending on a particular daily target.
