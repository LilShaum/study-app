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
