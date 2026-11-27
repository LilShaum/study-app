# Handoff

Read this first in a new session. It is the product brief: what Arborous is
for, the principles behind it, its design language, what went right and
wrong, how to work on it, and the technical map.

Where everything else is:

- `docs/README.md`: every doc, what it is for, current or historical.
- `docs/CODEMAP.md`: every source file in one line (generated).
- `docs/ASKS.md`: what the owner has asked for; its Open list is the work.
- `docs/EXPECTATIONS.md`: what every feature does now, in detail.
- `docs/FEEDBACK.md`: the owner's feedback, broken down.
- `docs/proposals/`: plans, each with its reasoning.
- `sim/FINDINGS.md`: every study-design result, with numbers.
- `docs/archive/history.md`: the dated log of what was built, session by
  session (this file's old §0, §4 and §6).

The sections below are the parts of the brief that still hold. What the
app does today is in EXPECTATIONS; what comes next is in ASKS.

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

See `docs/EXPECTATIONS.md`, one entry per feature, kept current. The list
that stood here (2026-10-11) is in `docs/archive/history.md`.

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

The Open list in `docs/ASKS.md`, in its order, and the plans in
`docs/proposals/` (indexed in `docs/README.md`). The 2026-10-11 roadmap
that stood here is in `docs/archive/history.md`.

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
- Feedback from the owner goes through the `owner-feedback` skill first:
  broken down in `docs/FEEDBACK.md` (their words, what went wrong, the ask
  in your words, each expectation made concrete and checkable) before
  anything is built. The habits it exists to stop: a question read as an
  instruction, a correction over-applied, an adjective met the cheap way.
- "What's next?" means work you can start without them. Leave out what
  waits on the owner (uploads, backups, real study logs, a real
  generation, iPhone checks); they know those already.
- For any study-flow change: model it in the simulator, check both
  students, build, recheck through the real path, re-baseline, log it in
  `sim/FINDINGS.md`.
- For any UI change: look at it at 390px and on desktop, in light and dark,
  before shipping.

## 8. Technical map

React 18 + TypeScript + Vite 6, Zustand (persisted to localStorage via
`src/lib/safeStorage.ts`), Zod, Tailwind, Vitest; GitHub Pages; optional
Supabase.

The table names the hubs; every file, in one line each, is in
`docs/CODEMAP.md`.

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

**Checks:** `npm run build` (its `tsc -b` covers `src` and `sim`; `npx tsc
--noEmit -p .` does not), `npm run lint`, `npm test`, `npm run knip` (unused
files, exports, dependencies) and `npm run codemap` after adding or
re-describing a file. A pull request runs all of these
(`.github/workflows/checks.yml`). Don't run Prettier over whole files (it
rewrites the quote style).

**Ship:** commit on the session branch, push, open a pull request; the
checks run on it, and merging into `main` is the owner's call. GitHub
Actions tests and publishes in a couple of minutes after the merge. Confirm by grepping the live JS for a string from the change. The
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
- Every change goes through a pull request; the owner merges it (2026-11-27:
  "if you suggest it I am down"). The owner is new to GitHub: write the PR
  description in plain words, what changes for a student first, and say
  what to look at before merging.
