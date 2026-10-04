# Handoff

Read this first in a new session. It is the product brief: what Arborous is
for, the principles behind it, its design language, what has been built and
why, what worked and what didn't, and where it is going. The technical map
and the working rules are at the end.

Other records: `docs/next.md` (running done/next list), `sim/FINDINGS.md`
(every study-design result, with numbers), `docs/evidence.md` (the learning
science), `README.md` (code tour).

Last updated 2026-10-04.

---

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
  jargon, no "AI" tone, and no em dashes in anything the student sees
  (they are the best-known tell of AI-written text; use a period, comma or
  colon). If a label needs explaining ("open a saved reply"), change the
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
- **Study modes.** Today; Learn (per section, in small steps: read → recall
  → apply, misses come back within the step, natural stopping points);
  Review (most-forgotten first, sized to the day's minutes); Quiz,
  Flashcards, Terms (typed), Mixed, Weakest first, Review missed. Confusable
  terms are paired. A side rail on desktop.
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

In order. Items 1–3 are small and should be done next.

1. **Security: diagrams from other people.** `src/lib/prepareSvg.ts` is a
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
| `src/lib/courseHealth.ts`, `questionQuality.ts` | The course check |
| `src/lib/growTree.ts`, `src/components/CourseTree.tsx` | The tree |
| `src/lib/cloud.ts`, `syncMerge.ts`, `autoSync.ts` | Sync and share links |
| `src/lib/backup.ts` | Backup / restore |
| `src/store/*` | courses, progress, plan, resume, studyLog, fallen, session, theme… |
| `scripts/audit-course.mjs`, `scripts/calibrate-log.mjs` | Score a generated course; fit the model to a real log |
| `sim/` | Simulator (`run.sim.ts` suite, `several.sim.ts` multi-course) |
| `docs/supabase.sql` | Tables, row-level security, RPC |

**Checks:** `npx tsc --noEmit -p .`, `npx eslint src`, `npx vitest run`
(~620 tests), `npm run build`. Don't run Prettier over whole files (it
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
