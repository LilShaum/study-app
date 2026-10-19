# What's next

See `docs/HANDOFF.md` for the full state and the open items in order. The
generation prompt (`prompts/generator.md`) was refined on 2026-09-29 and its
length rule held on a real course since; leave it alone unless a generated
course shows a new failure.

Done 2026-09-27: messages no longer cover the phone's Start bar (and the page
leaves room under it); Weakest ranks by the memory model and Missed means
"the latest answer was wrong"; backups are built from what is in memory,
refuse a newer app's format, and make other open tabs reload on restore; the
study screen has a side rail on desktop; the course page reads the clock once.

Done 2026-10-01: the library filters by class (course code) with tags folded
away, and lists today's work across courses; a finished Today points to the
next course with work; one exam date can be set on several courses of a
class; undoing a removal keeps the study log; re-uploading says "updated".

Done 2026-10-02: a catch-up later the same day for missed cards (simulator: several points on the exam under both students; sim/FINDINGS.md). Today now uses what is left of the day's time. One daily time for all courses, shared by how soon each exam is (sim/several.sim.ts). The generator prompt moved out of CLAUDE.md to prompts/generator.md; course files are git-ignored.

Done 2026-10-11: Learn places a question that names no term by the passage it quotes, and keeps leftovers for a last step, so a step only asks about what it showed. A glossary per course (View → Glossary). Diagrams cleaned by DOMPurify, plus a Content-Security-Policy. Proposals for the owner in docs/proposals/ (Learn gaps, classes).

Done 2026-10-11 (second session), the owner's decisions in docs/proposals/decisions.md: Learn A–F (a new flashcard read open before it is asked; steps of at most 12 cards; misses stay in their step, never straight after themselves; the notes open after a miss; the next section at the end; finished steps skipped; simulated, sim/FINDINGS.md). "Lecture" in everything a student reads. Classes: a class page (lectures, exams, Today for the class, Add a lecture) and several exams per class, kept on the lectures they cover so they sync, back up and share with them; each lecture follows the next exam it is on.

Done 2026-10-17 to 10-19 (HANDOFF has each): class Practice, one lecture at a time or mixed; studies grouped and practised on their own; lectures stored compressed, a backup reminder and a storage warning; Even out the answers, for a lecture or a whole class; the lecture check ranked; a faster library; leaner generation replies; restore in the app's own sheet with Undo; toasts above the page on a phone; Practice saying what the sitting holds; the length check sharing ties.

Next:
- The owner and the friend try Learn and a class on a phone.
- The owner uploads the Even out replies (HANDOFF, 2026-10-19).
- Confirm the compact generation replies on the owner's next real lecture.
- Share links and sync are live (`src/lib/cloud.ts`, `docs/supabase.sql`) and
  confirmed working by the owner on real devices, 2026-09-27. Cloud sessions
  cannot reach supabase.co unless the environment's network settings allow it.
- Calibrate the simulator from a real study log (`#/help?devtools`, then
  Copy study log), after a few weeks of use.
- Repo rename to arborous (`docs/rename-plan.md`).
