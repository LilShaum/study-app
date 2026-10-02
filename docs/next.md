# What's next

The generation prompt (CLAUDE.md) is frozen for now: courses were just
generated with it, so effort goes into the app, which helps every existing
course.

Done 2026-09-27: messages no longer cover the phone's Start bar (and the page
leaves room under it); Weakest ranks by the memory model and Missed means
"the latest answer was wrong"; backups are built from what is in memory,
refuse a newer app's format, and make other open tabs reload on restore; the
study screen has a side rail on desktop; the course page reads the clock once.

Done 2026-10-01: the library filters by class (course code) with tags folded
away, and lists today's work across courses; a finished Today points to the
next course with work; one exam date can be set on several courses of a
class; undoing a removal keeps the study log; re-uploading says "updated".

Next:
- Share links and sync are live (`src/lib/cloud.ts`, `docs/supabase.sql`) and
  confirmed working by the owner on real devices, 2026-09-27. Cloud sessions
  cannot reach supabase.co unless the environment's network settings allow it.
- Calibrate the simulator from a real study log (`#/help?devtools`, then
  Copy study log), after a few weeks of use.
- Repo rename to arborous (`docs/rename-plan.md`).
