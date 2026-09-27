# What's next

Queue as of 2026-09-27, most useful first. The generation prompt (CLAUDE.md)
is frozen for now: courses were just generated with it, so effort goes into
the app, which helps every existing course.

1. **Toasts can cover the phone's pinned Start bar** on the course page.
   Small.
2. **Weakest and Missed rank by right/wrong counts**, not by the memory
   model Review uses (`lib/memory.ts`). Switching them would make them
   target what is actually fading. Medium; run the simulator skill after.
3. **Backup edge cases** from `docs/audits/2026-09-27-code-audit.md` (M5–M7):
   a backup taken while storage is already full, a restore with a second
   tab open, and a backup from a newer app version. Small.
4. **Desktop session screen** uses one narrow column; a side rail would use
   the width. Medium.
5. **Clock read during render** in `nextSectionToLearn` (audit leftover).
   Small.

Later:
- Share links and sync (needs the owner's Supabase account).
- Calibrate the simulator from a real study log (`#/help?devtools`, then
  Copy study log), after a few weeks of use.
- Repo rename to arborous (`docs/rename-plan.md`).
