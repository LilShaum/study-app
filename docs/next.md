# What's next

The generation prompt (CLAUDE.md) is frozen for now: courses were just
generated with it, so effort goes into the app, which helps every existing
course.

Done 2026-09-27: messages no longer cover the phone's Start bar (and the page
leaves room under it); Weakest ranks by the memory model and Missed means
"the latest answer was wrong"; backups are built from what is in memory,
refuse a newer app's format, and make other open tabs reload on restore; the
study screen has a side rail on desktop; the course page reads the clock once.

Next:
- Share links and sync are live (2026-09-27, `src/lib/cloud.ts`, `docs/supabase.sql`),
  but untested against the real backend from a cloud session, whose network
  policy blocks supabase.co. Confirm on a real device.
- Calibrate the simulator from a real study log (`#/help?devtools`, then
  Copy study log), after a few weeks of use.
- Repo rename to arborous (`docs/rename-plan.md`).
