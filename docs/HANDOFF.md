# Handoff

Read this first in a new session. It says what Arborous is, how it is put
together, how to ship a change, what is open, and how the owner likes to
work. `README.md` has the fuller tour; `docs/next.md` is the running list;
`sim/FINDINGS.md` has every study-design decision and the numbers behind it.

Written 2026-10-04.

## What it is

A study app for one student (the owner), live at
**https://lilshaum.github.io/study-app/** and installable as a PWA. The
student pastes the prompt in `prompts/generator.md` into a Claude **chat**
with their lecture slides, gets back a `.study.json` course, and opens it in
the app. The app then plans their studying: Learn (read → recall → apply,
section by section), Review (spaced, from a memory model), and Today (one
sitting that does both, sized to their time and their exam dates).

The owner's real courses are BIOL 365 (Cell Signaling, Endocrinology,
Neuronal Function), PSYC 351C, PSYC 305 and EPHE 155. They never go in
this repo (see the rules).

## Rules that are not negotiable

- **The repo is public. No course content in it, ever** — no `.study.json`
  made from the owner's notes, no lecture text, no PDFs. Course files go in
  the session scratchpad and are handed over as files. `*.study.json` is
  git-ignored (except the made-up fixtures in `scripts/__fixtures__/`). If a
  session check says "commit your uncommitted changes" and the change is
  course content, do not commit it. This has gone wrong once (a branch
  `claude/festive-ramanujan-bf7kqn` with a PSYC 305 course was pushed; the
  owner is deleting it by hand because cloud sessions cannot delete other
  branches).
- Never ask for or accept the Supabase secret / service_role key. The app
  only ever uses the publishable key, which is meant to be public.
- No model names or IDs in code, comments or commit messages.
- Do not open pull requests unless asked. Work on the session's branch,
  merge it into `main` and push (that is how it deploys).

## How the owner likes to work

- Plain, concise replies. Say clearly whether you are asking or proceeding.
- Act as the manager: find what needs doing and do it, rather than waiting
  to be told. Report what changed in a few lines, in plain words.
- Budget-conscious: prefer cheap, well-aimed work. Small well-scoped coding
  tasks can go to a cheaper subagent, but read its diff and run the checks
  before anything ships.
- Copy in the app is plain and human, never "AI" sounding.
- They test on a phone and a desktop. Check phone layouts (390px wide).

## The owner's courses and what they still had to do

None of these files are in the repo. The owner has them in the app (and in
Supabase once sync is restored); this session also sent them as files.

- BIOL 365: Cell Signaling (498 items), Endocrinology (271), Neuronal
  Function (208). Generated before the inventory split, so their "terms
  defined" figures read low.
- PSYC 351C (283 items, 14 sections: one per lecture topic, re-split from an
  earlier two-section version). EPHE 155 Nutrition (517 items, 3 lectures).
  Both had subject/description/tags restored on 2026-09-30.
- PSYC 305 Lectures 1–4 (377 items), generated 2026-10-03 in another session.
- Things the owner was asked to do and may not have: apply
  `Cell-Signaling-fixes.json` (123 corrected answer keys and length-balanced
  options) through Add material → "upload a file instead"; re-upload the
  re-split PSYC 351C and the fixed PSYC/Nutrition files (same title replaces
  in place and keeps progress); set exam dates and one daily time; restore
  Supabase; delete the `claude/festive-ramanujan-bf7kqn` branch. Ask before
  assuming any of these happened.
- The owner had barely studied as of 2026-10-03, so there is no real study
  log yet.

## Course generation

- Courses should be generated in a regular Claude **chat** (claude.ai) with
  the prompt from New course, not in a Claude Code session on this repo — a
  chat cannot touch the repo.
- `prompts/generator.md` was refined on 2026-09-29 (terms vs mentioned,
  `Figure:` excerpts, a countable option-length rule, continue-after-cutoff,
  shorter explanations). The length rule held on its first real test: PSYC
  305 came back with the correct option longest in 12% of MCQs and shortest
  in 17% (the limit is 25%). Don't loosen it.
- Before changing the prompt, read `docs/audits/2026-09-27-prompt-test.md`;
  it records what each rule fixed. `scripts/audit-course.mjs <file>
  [source.txt]` scores a generated course (pass the slides' text to check
  grounding).
- The app's own checks of a course (`src/lib/courseHealth.ts`,
  `questionQuality.ts`) flag answer-length bias, restated excerpts (25%),
  sections with recall only, and undefined terms; the Fix prompt turns those
  into corrections.

## The look

The app is set like a book, on purpose, and several passes went into it —
don't drift it back toward a generic web app:

- The library is a contents page: a ruled list, roman numerals, figures in a
  right-hand column with dot leaders, no cards or rounded boxes.
- Labels are small caps (`.mark`), the face is Fraunces throughout, paper
  grain on the surface, `press` buttons with an ink underline.
- Filters and choices are underscored when selected, never filled pills.
- The tree (`growTree.ts`) follows a construction contract written at the
  top of the file: no primitives, no mirror symmetry, three line weights,
  `currentColor`, deterministic per course. Trees once had named species;
  they could not be told apart and were dropped. Each course now varies
  along two continuous axes (upright↔spreading, fine↔broad leaves).
- Light and dark themes both have to work; check diagrams in dark.

## Environment notes (cloud sessions)

- The scratchpad and anything outside the repo vanish when the container is
  reclaimed. Send the owner anything they need before a session ends.
- Playwright is not a dependency: `npm i --no-save playwright@1.56`, then
  launch Chromium from `/opt/pw-browsers/chromium`. A later `npm install`
  prunes it.
- `pkill -f "vite preview"` kills the session's own shell; start preview
  with `nohup npx vite preview --port 4173 &` and leave it.
- `git push` sometimes drops ("remote end hung up"); retry with backoff.
  A session can only push to its own branch and `main`; it cannot delete
  other branches (git or API), so ask the owner to do it on GitHub.
- supabase.co is usually blocked by the proxy, so sync and shares can only
  be tested on the owner's devices.
- Subagents (Agent tool) run in the same container. A Sonnet subagent did
  the library Today list well from a tight spec; still review every diff.

## Docs map

- `docs/next.md` — running done/next list.
- `docs/evidence.md` — the learning-science evidence the design leans on
  (spacing, retrieval, interleaving, expanding intervals…).
- `docs/audits/` — code audit and prompt test from 2026-09-27; `docs/briefs/`
  — the brief given to the outside audit.
- `docs/rename-plan.md` — how to rename to arborous without losing anyone's
  data (sync carries it across).
- `sim/FINDINGS.md` — every simulator result, newest first.

## Stack and layout

React 18 + TypeScript + Vite 6, Zustand (persisted to localStorage through
`src/lib/safeStorage.ts`), Zod schemas, Tailwind, Vitest. Hosted on GitHub
Pages; optional Supabase for sync and share links.

| Where | What |
|---|---|
| `src/schema/course.ts` | The `.study.json` format (source of truth) |
| `prompts/generator.md` | The generator prompt, imported `?raw` by the app's prompt builders |
| `src/lib/buildNewCoursePrompt.ts`, `buildAddPrompt.ts`, `buildPractisePrompt.ts`, `buildFixPrompt.ts` | The four prompts the app hands out |
| `src/lib/readReply.ts` | Reads a pasted reply: finds the JSON, salvages a cut-off one |
| `src/lib/memory.ts` | Memory model: R = exp(−t/S), due below 0.75, a miss due again after 3 h (`catchUpDue`) |
| `src/lib/buildSessionItems.ts` | Builds every session (Learn, Review, Today, Quiz, …) |
| `src/lib/today.ts`, `todaySitting.ts`, `dailyShare.ts`, `libraryToday.ts` | Today: review/learn split, time left today, catch-up, one daily time shared by exam date |
| `src/lib/exam.ts` | Exam date and scope steering Review |
| `src/lib/growTree.ts`, `src/components/CourseTree.tsx` | The per-course tree drawing (foliage = what is held) |
| `src/lib/prepareSvg.ts` | Cleans course diagrams before they are shown (see open items) |
| `src/lib/cloud.ts`, `syncMerge.ts`, `autoSync.ts`, `src/store/syncMeta.ts` | Sync and share links |
| `src/lib/backup.ts` | Back up / restore everything (Help page) |
| `src/store/*` | courses, progress, plan, resume, studyLog, fallen, session, … |
| `scripts/audit-course.mjs` | Checks a generated course file against the spec |
| `scripts/calibrate-log.mjs` | Fits the memory model to a real study log (backup file) |
| `sim/` | Study simulator; see `.claude/skills/simulate` |
| `docs/supabase.sql` | Tables, RLS policies, RPC for sync and shares |

## Checks and shipping

```
npx tsc --noEmit -p .        # types
npx eslint src               # lint
npx vitest run               # ~620 tests
npm run build
```

Ship: commit on the session branch → push → `git checkout main && git pull
&& git merge --no-edit <branch> && git push` → GitHub Actions builds, tests
and publishes Pages (a couple of minutes). Confirm it is live by fetching the
site and grepping its JS for a string from the change. The owner may need to
reload the PWA twice to pick up a new version.

Prettier rewrites quotes in this repo — don't run it over whole files.

For browser checks: Playwright is installed in `node_modules`; launch with
`executablePath: '/opt/pw-browsers/chromium'` against `npx vite preview
--port 4173` (path `/study-app/`). Seed courses through `localStorage`
(`arborous:courses`, `arborous:onboarding` = `{"state":{"onboarded":true}}`).

## Supabase

Project URL and publishable key are in `src/lib/cloud.ts`. Email + password
auth with "Confirm email" off. Tables `shared_courses` and `user_state`, RPC
`get_shared_course`, row-level security on both (`docs/supabase.sql`).
**Free projects pause after about a week idle** — restore from the
Supabase dashboard; nothing is lost. Cloud sessions usually cannot reach
supabase.co (proxy), so test sync on a real device.

Sync merge: courses last-change-wins with deletions; progress per item by
latest `lastSeen`; per-course stores (plan, resume, studyLog, fallen) this
device wins.

## Study design, in one paragraph

Every scheduling decision was tested in the simulator first, under two
memory models, and logged in `sim/FINDINGS.md`. The ones that shaped the
app: Today does review first and learn with the rest, capping review only in
the last 4 days before an exam; telling the app the exam's sections matters
more than the date; a five-minute catch-up a few hours after a sitting, on
what was missed, is worth several exam points (re-asking straight away is
worth nothing); one daily time shared by 1/days-to-exam beats an equal
split. Not built: an exam-week choice, and a personal forgetting rate
(waiting on real data).

## Open items, most important first

1. **Diagram sanitising (security).** `prepareSvg.ts` is a hand-written
   denylist and can be got past (e.g. `href` values with control characters
   before `javascript:`, or `<animate>`/`<set>` swapping in a link). Share
   links make a course from someone else a real input. Replace it with
   DOMPurify (SVG profile), keeping the colour remapping, and add a
   Content-Security-Policy `<meta>` in `index.html` as a second layer
   (GitHub Pages cannot send headers). The owner was asked and has not yet
   said go.
2. **Sync gaps.** The shared daily time (`plan.total`) is not synced — only
   per-course plan entries are. And study logs merge "this device wins" per
   course, so studying on the phone does not count as studied today on the
   laptop, and the calibration data only has one device. Merge logs by
   union (answers/times deduplicated by `at`), and sync `total`.
3. **Small polish.** "Weakest first" shows a count before anything is
   studied; "Review missed" right after a sitting competes with the
   catch-up advice.
4. **Catch-up reminder.** The catch-up only helps if the student comes
   back. A notification needs web push (Supabase function + cron); iPhone
   needs the PWA installed. Medium-large; only if the owner wants it.
5. **Calibration.** When the owner sends a backup after a week or so of
   real use: `node scripts/calibrate-log.mjs <backup.json>`, then revisit
   the memory constants and the personal-rate idea (FINDINGS 2026-10-02).
6. **Rename** to arborous — on hold until the owner asks; plan in
   `docs/rename-plan.md`.
7. Older courses (Neuronal Function, Endocrinology) were generated before
   the inventory split terms/mentioned, so their "terms defined" figures
   look low. Course content, not app — left alone on purpose.
