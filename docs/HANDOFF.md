# Handoff

Read this first in a new session. It is the product brief: what Arborous is
for, the principles behind it, its design language, what has been built and
why, what worked and what didn't, and where it is going. The technical map
and the working rules are at the end.

Other records: `docs/next.md` (running done/next list), `sim/FINDINGS.md`
(every study-design result, with numbers), `docs/evidence.md` (the learning
science), `README.md` (code tour).

Last updated 2026-10-11 (second session that day).

---

## 0. Plan for the next session

Start here. Make each step a task, keep one in progress, and only mark it
done when it is tested and live (see §7). Load `working-method`,
`arborous-design` and `app-making` at the start; `simulate` before Learn.

**Done 2026-10-13, fresh-eyes review (live, partial):** see
`docs/audits/2026-10-13-fresh-eyes.md`. Review is spaced like Learn (no card
within five of one that gives its answer; 2–11 a sitting → 0–2 on the
owner's lectures); Keep going in exam week plans one part, not a whole day;
`sim/lecture.sim.ts` runs days of study on a real lecture. Open from it:
Learn's 2-card session on a section's second look, sittings that run long
(re-asks not planned, guessed card times), calibration waits on real use,
and brief sections 5.2, 5.3, 5.5–5.7.

**Done 2026-10-13, after the fresh-eyes review (live):** see the follow-up
in `docs/audits/2026-10-13-fresh-eyes.md`. Learn carries on past a
section's second look; sittings are planned with real card times and the
re-asks of misses; the app fits each student's forgetting rate
(`lib/personalScale.ts`); the simulator has a slow-forgetting student and
real card times (absolute scores dropped; see FINDINGS); the owner's
lecture wording was taken out of the repo.

**Done 2026-10-14/15 (live):** generator prompt: a reading map of why
each slide is there (objectives, what later slides build on, studies,
lists to compare vs learn, building blocks), figure labels the lecture
builds on are content, conflicting rules consolidated, figures it cannot
read listed in `inventory.unclear_figures` (shown by the course check),
and "attach the slides to the message, not only as project files" (project
files often reach the AI as text only). Add material skips only facts
already tested at the same depth. Practice test (`TestRoute.tsx`,
`lib/practiceTest.ts`): medium and hard MCQs, answers at the end, per
lecture, per exam or a whole class. Course check on items per slide
(`lib/sectionDensity.ts`), with More practice writing for sparse sections
first. **Open:** compare a regenerated lecture against the old one to
confirm the prompt changes on real output.

**Back burner (owner, 2026-10-15): anything that needs the owner's real
study log.** Do not start these until the owner sends a backup (Help →
Back up everything, key `arborous:study-log`) and asks for them:
calibrating the simulator and the readiness forecast from real answers;
re-checking the three-cards-per-term first-meeting limit; weighting
scheduling by importance (the owner's idea: detail and time spent per
concept); measuring how much repetition comes from mix-ups and misses.

First real log (2026-10-15, about 2 hours of Learn the morning of a
cognitive neuroscience test, on a lecture of study cards only): flashcards
73% right, MCQs 97%. The MCQs came straight after a worked example that
laid out the whole study, so they mostly measured reading a minute ago.
Worked examples took 29 of 103 minutes; 6 hit the 3-minute card cap. Every
answer was a first meeting, so nothing here calibrates forgetting yet.
**Owner: no drastic changes from this**, the class is unusually study-heavy.
Weigh it against logs from other classes before changing Learn's order.

**Open, marked for later (owner, 2026-10-14):**

- **Done 2026-10-15:** what is expected of every feature is in
  `docs/EXPECTATIONS.md` (linked from CLAUDE.md). Keep it current.
- **Item counts don't follow importance** (prompt and check shipped
  2026-10-15, see above; waiting on a regenerated lecture to confirm). Old lectures (made with the
  pre-weight-table prompt) give one basics slide 10–20+ items; the owner's
  first Add material run (parts 3–4 of a lecture) gave about 2 items per
  slide, put 57 terms the slides teach in sentences (SNARE parts, Mg²⁺
  block, desensitized state, transporters) into "mentioned", and skipped
  topics the course had covered only at less depth. Proposed, waiting on the
  owner's go: "mentioned" only for names never explained; Add skips only
  facts already tested at the same depth; a course check on items per slide
  (`source_range`) that flags thin key sections and over-dense basics.

**Done 2026-10-13 (live):** the owner's first real study of a lecture, with
screenshots: cards on one term all at once, an MCQ straight after the
definition, fill-in and flashcard for it, typed terms whose definition
spelled them out, the same fact reworded, and too little that asks for
mastery. Plan, numbers and results in `docs/proposals/content-quality.md`.

- **iPhone header**: the home-screen app reports no status-bar inset, so
  `lib/statusBarFallback.ts` measures the case and pads the header itself.
  Waiting on the owner to confirm on the phone.
- **`lib/contentChecks.ts`** decides a give-away (`givesAway`), one fact
  (`sameFact`) and a card answered by an earlier one (`answeredBy`), for
  the session order, the course check and the audit alike.
- **Learn and Today**: no typed term that spells itself out (read, never
  asked, out of every count via `scored.ts`); no flashcard shown open first
  (the `preview` item is no longer made; `PreviewCard` stays for old
  bookmarks); the later card of a pair moves to the next step
  (`learnSteps.apart`, `MIN_GAP` = 5 cards). Simulated level under both
  students; re-baselined.
- **`sessionAudit.ts` + `sessionAudit.test.ts`** hold the line on the test
  lectures, and print the whole walk of a real one (`AUDIT_COURSE=`). The
  arborous-design skill now has "Checking what a student is asked".
- **Course check and Fix**: `gives-away`, `same-fact` and `thin-key-terms`
  (a key term only one card asks about); Fix rewords and re-angles them,
  More practice targets thin key terms.
- **Generator prompt** (`prompts/generator.md`, Quality bar, so all four
  prompts carry it): how the app uses each card, a plan per idea with key
  ideas asked from several sides, no reused sentences, no card answering
  another, nothing a stranger could answer, the slide's text as what is
  need-to-know, and a read-as-the-app-asks self-check.

- **Later the same day, read on the owner's five real lectures**: an MCQ
  answered with the term just typed, or a flashcard rewording a definition
  just read, is now spaced like a repeat (`sameName`, reworded reveals,
  definitions read count as shown). **MCQs**: the prompt's "MCQs carry the
  nuance" (exceptions, neighbours, consequences, why; a difficulty mix of at
  most a quarter easy and at least a quarter hard); course check
  `mcq-restates-definition` (about one MCQ in eight on the real lectures)
  with a Fix rewrite; More practice asks for medium and hard MCQs when the
  mix is off.

- **Evening, basics over-taught** (the owner: every sitting on feedback
  loops): at most three cards on a term at a first meeting, the rest in a
  second look that opens the next sitting (`TERM_BUDGET`, `_second`); a
  review cap per term was tried and removed the same night (it held due
  cards past their point; FINDINGS); one
  term in two lectures scored once (`lib/linkedTerms`, 21 shared between
  Cell Signaling and Endocrinology); MCQs that are a definition again stay
  multiple choice; no colophon on study screens (a card that fits no
  longer scrolls under the status band). The prompt's Quality bar is now
  six numbered parts with a weight table (key, supporting, background,
  example detail), the sides of an idea, "parts of one system taught
  together", MCQ nuance vs trivia with real examples, and a counted
  difficulty mix; the self-check counts MCQs and cards per idea.

- **Overlapping decks**: New lecture has "Follows on from", which puts the
  previous lecture's last sections (ranges, terms, quotes) in the prompt
  with rules for repeated slides (`lib/previousLecture.ts`). Linking
  questions across lectures by wording was measured on the owner's five
  lectures and rejected: few true repeats, several false ones. Dialogs no
  longer sit under the colophon (`.paper-grain > main`, z-index 2).
- **Not done, on purpose**: "always keep time for new material" and
  "interleave sections in Learn" were already tested and lost
  (FINDINGS, `REVIEW_CAP`; task #31).

Open from it: a section whose repeats cannot be spaced ends in a step of
one or two cards (the content fix removes them); existing lectures get the
better content only through Fix or More practice.

**Done 2026-10-12 (live):** the modes review in `docs/proposals/modes.md`
(every mode asked "why is it here, how well does it do it"), with the
owner's go-ahead. New evidence entries in `docs/evidence.md`.

- **Learn asks later.** Inside a step everything is read, then asked first
  read, first asked (`ORDER` in `learnSteps.ts`); the passage opens after
  every answer in Learn. Asking a miss again at the section's end was
  simulated and dropped (cost time; a second right answer in one sitting).
- **Cram was built in the simulator and lost** (6–9 points under both
  students). What helped was spacing, so **Today splits the last three days
  before an exam into three sittings three hours apart** (`partMinutes` in
  `lib/today.ts`, "10 min · 1 of 3" on the course page, the next sitting's
  time on the finish screen): +2 to +5. New scenarios: late-start,
  crammer-harsh. sim/FINDINGS.md has the table.
- **One Practice page** (`/study/:id/practice`, `PracticeRoute.tsx`)
  replaced Review and the six format modes on the course and section
  pages: which cards × which kind × from where. Old session URLs still
  work; `?kind=` filters review/weakest/missed (`pendingKind` in the
  session store). Built by a Sonnet subagent to a spec, then reviewed.
- **Learn with your slides.** A section can carry `source_range` ("slides
  12–18"); the generator prompt asks for it when the source numbers its
  slides. Learn opens such a section with a card to read those slides,
  then "I've read them" drops its reading cards so everything is asked
  first (`askFirst` in the store, `SlidesCard`). Existing courses have no
  ranges until regenerated or re-added.

- **Questions first** (switch on Learn's step line, "Skip the reading" /
  "Read first", `store/learn.ts`, one setting for every lecture): drops the
  cards that give answers, so each card is asked first with the answer and
  passage after; examples and diagrams stay. Simulated level for material
  never met and ahead for material met in a lecture (+2 to +6); default
  stays read first. The simulator now credits a failed first try with the
  answer shown like reading it (Kornell 2009), which raised every scenario;
  see FINDINGS.

Open from it: the Continue card resumes a kind-filtered Practice session
without its filter; the Practice "Due now" count is everything due while
the session is sized to the daily minutes (it offers more at the end).

**Done 2026-10-11, second session (live):** the owner's decisions in
`docs/proposals/decisions.md`, all built.

- **Learn A–F.** A flashcard never answered is read open first ("Read
  first, asked in a moment", a session-only `preview` item, `PreviewItem`
  in `buildSessionItems.ts`), then asked in the same step; the notes are
  open on Learn's reading cards. A step holds at most 12 cards
  (`STEP_CARDS` in `learnSteps.ts`: fewer terms a step, then overflow
  questions in a following step after the reading). A miss comes back in
  its own step, never straight after itself (`requeue` in
  `store/session.ts`). After a miss the passage from the notes is open.
  Learn's finish screen offers the next section; Learn skips steps already
  answered. Simulated (sim/FINDINGS.md, three entries): A+B within noise
  (busy-20 30→28% ±2 is the one to watch), C slightly better under `fsrs`,
  level under `harsh`; re-baselined. The "Learn" pill on the study screen
  is now small caps.
- **"Lecture"** in everything a student reads ("course code" is "class
  code"). Code names, storage keys and `.study.json` unchanged. The
  generator prompt still says "course" (only the AI reads it).
- **Classes.** `/class/:code` (`ClassRoute.tsx`): lectures in order, the
  class's exams (next first), Today for the class (starts in the class
  lecture with the nearest exam, `?class=` keeps "Next: Today in…" inside
  the class), Add a lecture (New lecture with the class code set), Add an
  exam. The library heads each class's lectures with a link to it; a
  lecture page has "← Library · CODE".
- **Several exams per class** (`lib/classExams.ts`,
  `ClassExamDialog.tsx`). **Where they live, and why:** on the lectures.
  Each lecture's `metadata.exams` holds the class exams that cover it, with
  its own sections. A lecture already syncs (whole JSON, last edit wins),
  backs up, exports and travels in a share link, so the exams go
  everywhere with no new table, no Supabase migration and no new merge
  rule; the class list is gathered by exam id. The scheduler asks
  `lectureExam(course, now)`: the nearest upcoming exam covering the
  lecture (its own old single exam counts too), so after a midterm its
  lectures follow the final with nothing to do. Checked on the way in
  (`ClassExamSchema`, bounded; a bad list is dropped, not the lecture;
  `examsOf` re-checks for backups and sync). Security review: no findings.
  A lecture in a class shows the class's exams in its exam dialog and
  links to the class page; a lecture with no class keeps the old dialog.

Open from it: two devices editing the same exam on different lectures at
once can leave the name or date differing between lectures (each lecture
syncs on its own); the class page shows the first it finds. Unlikely, and
saving the exam again fixes it. Also left from the code review, on
purpose: a Learn step of only reading cards (examples, diagrams) is
skipped by Today once "done" but repeated by Learn, as before; and a
lecture with no sections at all can end up with an empty section list on
an exam (reads as "all"). Both small; fix if they show up.

**Done 2026-10-11, first session (live):** Learn no longer asks a step about what it
didn't show (`stepSection` places a term-less item by its
`source_excerpt`; leftovers go in a last step; simulator within noise,
re-baselined). The glossary (`/study/:id/glossary`, `GlossaryRoute.tsx`,
`lib/glossary.ts`). Two proposals for the owner, both waiting on answers:
`docs/proposals/learn.md` (what Learn lacks, A–F) and
`docs/proposals/classes.md` (class page, class exam, "course" vs
"lecture", more than one exam). Diagrams are cleaned by DOMPurify (SVG
profile, colour remap and sizing as hooks in its pass) and the built page
carries a CSP meta (`vite.config.ts`, `contentSecurityPolicy`); checked in a
browser on every screen with no refusals. `npm audit` flags
`brace-expansion`, a build-time dependency only.

Next, in order:

1. **Ask the owner (and the friend) to try Learn and a class on a phone.**
   The simulator cannot see whether "read first, then asked" fixes "it
   asks about things it didn't show"; only a real student can.
2. **Sync gaps and polish** (§6 items 2–3). These don't wait on anyone.
3. Watch busy-20 in the simulator after any Learn change: the reading
   cards cost a 20-minute student about two points there.

Before ending the session: update this file (what changed, what is open)
and `docs/next.md`, and tell the owner in a few plain lines.

## 1. What Arborous is for

A study app that turns a student's own lecture material into everything
they need to be ready for the exam, and then plans their studying for them.

The student pastes the app's generator prompt into a Claude chat with their
slides attached, gets back a `.study.json` course, and opens it. From there
the app decides what to do each day. The bar for a course is the one in the
generator prompt: a student who works through every item should meet
nothing on the exam they have not practised. The bar for the app is that a
student who simply presses **Today** each day, for the time they have, ends
up as ready as their time allows — without having to know anything about
spacing, retrieval or scheduling.

It is built for one real student first (the owner, a university student
with several courses and exams at once), and it should feel like an object
made with care rather than a generated web app. Share links and sync exist
so the same thing works across their phone and laptop and can be handed to
a classmate.

## 2. Principles

**Learning**

- Every scheduling and study-flow decision is tested in the simulator
  first, as a policy, before any screen is built (`.claude/skills/simulate`).
  A result counts only if it holds in direction under both simulated
  students (`fsrs` and `harsh`). The simulator's student is never the app's
  own memory model.
- Retrieval over re-reading, producing over recognising, spacing over
  massing. A definition is asked by showing the meaning and having the
  student type the term; MCQs are reused as typed recall once answered
  right. Evidence and its limits are in `docs/evidence.md`.
- Validate through the app's real doors. A policy that pokes the stores
  directly can look better than the shipped feature (the catch-up first did
  — see §5).

**Product**

- **Today is the one button.** Everything else on a course page is for
  choosing yourself; the app's job is to make that choice unnecessary.
- Honest signals. A section never opened is a bare branch; what has faded
  falls to the ground; the reason to come back is the time when what you
  learned will actually be slipping ("these come back after 7:40pm"), never
  a streak or guilt.
- The student's own material, never invented content. Grounding is enforced
  in the generator prompt (every item carries a `source_excerpt`) and
  checked by the app's course check.
- Local first. Everything works offline without an account; sync is
  optional and merges rather than overwrites.

**UX**

- Phone first. Most studying happens on a phone; check every change at
  390px wide. The main action stays in thumb reach (the pinned Start bar).
- Plain words. Copy reads like a person wrote it: short, concrete, no
  jargon, no "AI" tone. Em dashes only on purpose: AI writing scatters them
  by habit (about fifty were cleared from the app in one pass), so default
  to a period, comma or colon and keep a dash only where it reads better or
  does a design job. If a label needs explaining ("open a saved reply"), change the
  label ("upload a file instead").
- Every page has an obvious way back (a "← Library" link, not only the
  wordmark).
- Anything that can be opened can be closed again; anything destructive has
  Undo.

## 3. Design language

The app is set like a printed book or a herbarium sheet — the name and the
trees come from that — and several passes went into getting away from the
look of a generic web app. Keep it.

- **Type.** Fraunces throughout (a book is set in its text face), with
  small caps for labels (`.mark`). Display sizes for page titles only.
- **Structure.** The library is a contents page: a ruled list, roman
  numerals, the figures in a right-hand column with dot leaders. Panels are
  ruled top and bottom, not boxed. A course's details are a specimen label
  (`SpecimenLabel.tsx`): small ruled fields, not a sentence of statistics.
- **No web furniture.** No cards in a grid, no rounded filled boxes, no
  pills, no drop shadows as decoration. A selected filter or choice is
  underscored like a marked index entry, not filled in. Buttons are `press`
  (ink underline), `press-ink` for the main action.
- **Surface.** Paper grain; light and dark themes (`data-theme`), both of
  which must work — check diagrams and trees in dark.
- **The tree** (`src/lib/growTree.ts`) is the course drawn as a tree: a limb
  per section, sized by the section; foliage is what is held now (from the
  memory model); faded knowledge lies as fallen leaves under its branch;
  selecting a section lets its fading leaves fall, and a finished session
  buds them back. Its construction contract is at the top of the file: no
  primitives, no mirror symmetry, three line weights, `currentColor`,
  deterministic per course. Each course has its own habit on two continuous
  axes (upright↔spreading, fine↔broad foliage).
- **Motion** is small and meaningful (leaves falling, budding), and all of
  it respects `prefers-reduced-motion`.
- **Icons** are hand-set stroke paths in the same weights as the drawing.

## 4. What exists

- **Courses.** New course (hands out the prompt, reads the reply even if it
  is wrapped in text or cut off), Add material (new lectures appended, with
  their inventory), More practice, Fix (turns the course check's findings
  into a prompt for corrections), Edit details, Export, Share link, Browse
  and edit any item.
- **Course check.** Flags undefined terms, answer-length bias in MCQs
  (correct option longest too often), stems that restate their excerpt,
  sections that only test recall, structural faults.
- **Study modes.** Today (the daily button; three sittings in the last
  three days before an exam); Learn (per section, in small steps: read,
  then asked in the order read, misses come back within the step; can
  start from the student's own slides and ask first); Practice (one page:
  due, weakest, missed or everything × questions, flashcards or terms ×
  lecture or section; behind it the old Review, Quiz, Flashcards, Terms,
  Mixed, Weakest first and Review missed sessions). Confusable terms are
  paired. A side rail on desktop.
- **Planning.** Exam date and which sections it covers, per course; one exam
  date can be set on several courses of the same class. Today splits the
  day between review and new material, uses only what is left of the day's
  time, and offers a five-minute catch-up a few hours after a sitting for
  what was missed. One daily time can be shared across all courses by how
  soon each exam is. The library lists today's work across courses, nearest
  exam first, and filters by class.
- **Progress.** The tree; a Progress page with a "fading" view; per-section
  figures.
- **Data.** Backup/restore of everything; optional sync and share links
  (Supabase); a local study log (answers, times) that feeds measured pace
  and, later, calibration.
- **Help** written in plain words, a Sync page, an onboarding pass.

## 5. What went right, what went wrong

**Right**

- Simulator-first design. It killed several plausible ideas before they
  cost a screen (an exam-week choice, capping review all month, a personal
  forgetting rate for now) and found two real wins (the same-day catch-up,
  and sharing one daily time by exam date). Both were rechecked through
  the app's own code paths before shipping.
- The countable rule for MCQ answer length. "Keep options roughly equal"
  left the correct option longest 46–55% of the time; "longest in no more
  than one in four, shortest in no more than one in four" brought a fresh
  course to 12% / 17%.
- Reading pasted replies forgivingly (fenced, prefaced, truncated) saved
  whole generations that used to be lost to one missing brace.
- Testing on a real phone. Each quick test by the owner found something the
  desktop never showed (a tag wall burying the course list, a label
  wrapping, a page with no way back).

**Wrong, and what it taught**

- **Named tree species.** Four species could not be told apart: a line
  drawing has only silhouette. Six attempts produced a scribble, a fishbone,
  a star and a rosette. Lesson: vary continuous traits, don't name kinds.
- **The first memory model** dropped a missed item to five hours; it was
  forgotten by the next sitting, missed again, and reviews climbed past 400
  a day. A miss now resets to the strength of first learning.
- **A simulated policy that went round the app.** The catch-up looked
  strong when it re-asked misses directly, and did nothing through the real
  Today button at 6 hours, because misses were not due yet. Always check a
  feature through the doors a student uses.
- **The generator prompt lived in `CLAUDE.md`.** Every coding session was
  told it was the course generator; one saved a course in the repo and a
  session check pushed it to a public branch. The prompt now lives in
  `prompts/generator.md`, and course files are git-ignored.
- **Wording that needed explaining** ("open a saved reply", "Subjects" for
  what were tags). Name things by what the student does.

## 6. Where it is going

First, from a friend's real use of Learn (2026-10-10) and the owner's own
idea. These come before the list below.

A. **Learn asks about things it hasn't taught.** (Placement fixed
   2026-10-11; `docs/proposals/learn.md` A–F built the same day.) "You learn 4 terms, then
   the recall asks about things the read part didn't show." The cause is in
   `src/lib/learnSteps.ts`: an MCQ or flashcard that names none of the
   section's defined terms is spread across the steps by its position
   ("unplaced"), so step 1 can ask about material that step 1 never read.
   Fix: place such items by what they quote (an item whose
   `source_excerpt` overlaps a definition's excerpt goes in that
   definition's step), and put whatever still matches nothing in a last
   "putting it together" step of the section, never an early one. This
   changes Learn, so run the simulator before and after (`simulate`
   skill). The same friend called Learn "not very in-depth"; check whether
   that is this bug or a real gap once it's fixed.
B. **A glossary.** (Built 2026-10-11.) A per-course page listing every term and concept with
   its meaning, alphabetical and searchable, to read rather than be quizzed
   on (the friend asked for it; Browse shows items by section, not as a
   reference). Built from the definition items; set like a book's index.
C. **Classes as a real thing.** (Built 2026-10-11, with several exams per
   class; see §0.) The owner's idea: organise by class, add
   lectures to a class, and when an exam comes, pick from the whole class
   what is on it. Today a class is only a shared course code: the library
   groups and filters by it, and one exam date can be copied to sibling
   courses. Build on that rather than a new data model: a class page
   (tap a class in the library) listing its lectures, "add a lecture" with
   the code filled in, and one exam dialog for the class that sets the date
   and lets you tick lectures and sections across all of them (it writes the
   existing per-course `exam_date` and `exam_sections`, so the scheduler is
   unchanged). Decide with the owner whether the app should start calling a
   course a "lecture" in the UI once classes exist.

Then, in order. Items 1–3 are small.

1. **Security: diagrams from other people.** (Done 2026-10-11.) `src/lib/prepareSvg.ts` is a
   hand-written denylist and can be got past (control characters before
   `javascript:` in a link, or `<animate>`/`<set>` swapping a link in).
   Share links make a course from someone else a real input. Replace with
   DOMPurify (SVG profile), keep the colour remapping, and add a
   Content-Security-Policy `<meta>` in `index.html` (GitHub Pages cannot send
   headers). Everything else on the usual pre-launch security checklist was
   checked and is already covered (RLS, publishable key only, Supabase auth,
   no raw SQL, HTTPS, `npm audit` clean).
2. **Sync gaps.** The shared daily time (`plan.total`) is not synced. Study
   logs merge "this device wins" per course, so time studied on the phone
   does not count as studied today on the laptop, and calibration would see
   one device. Merge logs by union (deduplicate answers and times by `at`)
   and sync `total`.
3. **Polish.** "Weakest first" shows a count before anything is studied.
   "Review missed" straight after a sitting competes with the catch-up
   advice (re-asking at once does nothing; a few hours later does).
4. **Bring the student back for the catch-up.** The single biggest lever
   left, because the catch-up only works if they return. Needs web push
   (Supabase function + schedule); iPhone requires the installed PWA. Ask
   before building — it is the first feature that would send the student
   anything.
5. **Calibrate on real use.** Once there is a week or two of real answers
   (a backup file): `node scripts/calibrate-log.mjs <backup.json>`. That
   decides the after-miss forgetting rate, whether reviews come too late,
   and whether a personal forgetting rate is worth it (it was noise in the
   simulator).
6. **Split time by what is due, not only by exam date.** Would need the
   simulator to run several courses side by side; expected to add little
   over the exam-date share.
7. **A readiness forecast.** Tried: the app's estimate matched one
   simulated student and not the other, so it can only ever be shown as a
   range. Revisit after calibration.
8. **Rename to Arborous** everywhere (repo, URL, storage keys). On hold
   until the owner asks; `docs/rename-plan.md` uses sync to carry data
   across.

**Considered and not built**, with reasons in `sim/FINDINGS.md`: an
exam-week "learn what's left vs hold on" choice (mostly worse), capping
review all month (much worse), a learn quota first (worse), species of
tree (unreadable).

## 7. How to work on it

- The work is the app. Don't review, fix or regenerate the owner's course
  files unless they ask.
- The owner wants you to act as the manager: find what most needs doing,
  do it, and report in a few plain lines what changed and what is next.
  Ask only for decisions that are genuinely theirs (product direction,
  anything that reaches outside the app, anything destructive).
- They are budget-conscious. Prefer the smallest change that does the job.
  Well-scoped coding tasks can go to a cheaper subagent with an exact spec;
  read its diff and run the checks before anything ships.
- Concise replies; say clearly whether you are asking or going ahead.
- For any study-flow change: model it in the simulator, check both
  students, build, recheck through the real path, re-baseline, log it in
  `sim/FINDINGS.md`.
- For any UI change: look at it at 390px and on desktop, in light and dark,
  before shipping.

## 8. Technical map

React 18 + TypeScript + Vite 6, Zustand (persisted to localStorage via
`src/lib/safeStorage.ts`), Zod, Tailwind, Vitest; GitHub Pages; optional
Supabase.

| Where | What |
|---|---|
| `src/schema/course.ts` | The `.study.json` format (source of truth) |
| `prompts/generator.md` | Generator prompt, imported `?raw` by the four prompt builders in `src/lib/build*Prompt.ts` |
| `src/lib/readReply.ts` | Finds the JSON in a pasted reply; salvages a cut-off one |
| `src/lib/memory.ts` | R = exp(−t/S), due below 0.75, a miss due again after 3 h |
| `src/lib/buildSessionItems.ts` | Builds every session |
| `src/lib/today.ts`, `todaySitting.ts`, `dailyShare.ts`, `libraryToday.ts`, `exam.ts` | Today, time left, catch-up, shared daily time, exam steering |
| `src/lib/classExams.ts`, `src/routes/ClassRoute.tsx`, `src/components/ClassExamDialog.tsx` | Classes: a class's exams, kept on its lectures; the class page |
| `src/lib/courseHealth.ts`, `questionQuality.ts` | The course check |
| `src/lib/growTree.ts`, `src/components/CourseTree.tsx` | The tree |
| `src/lib/cloud.ts`, `syncMerge.ts`, `autoSync.ts` | Sync and share links |
| `src/lib/backup.ts` | Backup / restore |
| `src/store/*` | courses, progress, plan, resume, studyLog, fallen, session, theme… |
| `scripts/audit-course.mjs`, `scripts/calibrate-log.mjs` | Score a generated course; fit the model to a real log |
| `sim/` | Simulator (`run.sim.ts` suite, `several.sim.ts` multi-course) |
| `docs/supabase.sql` | Tables, row-level security, RPC |

**Checks:** `npx tsc --noEmit -p .`, `npx eslint src`, `npx vitest run`
(~660 tests), `npm run build`. Run the build before every push: its
`tsc -b` is stricter than `tsc -p .` and a deploy failed on that once. Don't run Prettier over whole files (it
rewrites the quote style).

**Ship:** commit on the session branch, push, merge into `main`
(`--no-edit`), push; GitHub Actions tests and publishes in a couple of
minutes. Confirm by grepping the live JS for a string from the change. The
PWA may need two reloads to update.

**Supabase:** URL and publishable key in `src/lib/cloud.ts`; email +
password, confirm-email off; free projects pause after about a week idle
(restore from the dashboard, nothing is lost).

**Cloud-session notes:** the scratchpad vanishes with the container.
Playwright is not a dependency (`npm i --no-save playwright@1.56`, Chromium
at `/opt/pw-browsers/chromium`; a later `npm install` prunes it). Don't
`pkill -f "vite preview"` (it kills the shell). `git push` sometimes drops;
retry. A session can push only its own branch and `main` and cannot delete
other branches. supabase.co is usually blocked, so test sync on real
devices.

## 9. Rules

- **The repo is public: no course content in it, ever.** Course files are
  the student's; generate them in a chat, keep them outside the repo, never
  commit one even if a check asks. `*.study.json` is git-ignored except the
  made-up fixtures in `scripts/__fixtures__/`.
- Never ask for or accept the Supabase secret / service_role key.
- No model names or IDs in code, comments or commits.
- No pull requests unless asked.
