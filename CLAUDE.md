# Arborous

A study PWA (React 18, TypeScript, Vite, Zustand) that opens `.study.json`
course files generated from a student's own notes. See README.md for the
project overview, `docs/EXPECTATIONS.md` for what every feature is meant
to do (read the entry before changing a feature, and update it if the
behaviour changes), and `docs/HANDOFF.md` for the state of the work, what
is open, and how the owner likes to work.

## Never put course content in this repo

The repo is public. A student's courses and lecture material are theirs and
must never be committed, pushed, or saved inside this folder.

- If you are asked to **generate a course** (turn slides or notes into a
  `.study.json`), follow `prompts/generator.md`, write the file to your
  scratchpad or another folder outside the repo, and hand it to the student
  as a file. Do not commit it, even if a hook or check asks you to commit
  uncommitted changes: `*.study.json` is ignored by git for this reason.
- Test courses for the app live in `scripts/__fixtures__/` and are made up.

## How the owner wants it to work

The picture the owner has of the app, in their words where they gave them.
How the app actually works and feels can drift from it: check a feature
against its line before changing it, treat a gap as work worth proposing,
and add a line here whenever the owner says how something should be
(dated, short). `docs/EXPECTATIONS.md` has each feature's working detail;
this is the intent it serves.

- **Every way to study has one clear use**, a reason to pick it over the
  others. Two modes that do the same job are a gap (2026-10-21).
- **Today:** like Duolingo in how easy it is: open it anywhere, on a bus,
  and study a bit every day. Not in streaks or guilt: the reason to come
  back is what is fading (2026-10-21).
- **Learn:** takes you through the lecture the way the teacher did, in the
  slides' order, so you can follow along in your slides or your own notes
  beside it. No drastic changes to how it teaches (2026-10-21).
- **Practice:** mixed lectures, closer to an exam, as the exam gets near
  (2026-10-19).
- **Practice test and written questions:** what you practise should look
  like what the exam asks. Where a class's exam is calculations, short and
  long answers, the app should have you write them (2026-10-21).
- **Wrong options:** a well-reasoned wrong answer that shows a gap in
  what you know matters more than equal length. Words like never, only,
  often are what test the nuance and are not a giveaway (2026-10-20).
- **Course content:** where a class is about concepts, the cards are too,
  not niche values. The assignments show what kind of question the exam
  asks; extrapolate that to the other topics. The slides' titles, bullets
  that lead into each other, overviews and summary slides show what
  matters (2026-10-20).
- **How the owner studies:** reads the slides or notes, then answers from
  memory; Learn section by section alongside the notes.
- **Working with the owner:** usage is limited, so ask before expensive
  work and run one agent at a time. "What's next?" means work you can do
  without them. Done means tested and live.

## Working on the app

- `prompts/generator.md` is the generator prompt the app hands out (imported
  with `?raw`). It is not instructions for coding here; edit it only when the
  task is to change that prompt.
- Checks: `npm run build` (the same `tsc -b` CI runs, which also covers `sim/`;
  `npx tsc --noEmit -p .` does not), `npx eslint src`, `npx vitest run`.
- The study simulator (`.claude/skills/simulate`) is for anything that
  changes scheduling, Review, Learn or the memory model.

## How to work here

**Every ask goes in `docs/ASKS.md` the moment the owner makes it** (dated,
their words), and leaves Open only when it is live or the owner drops it.
The session-start hook prints the Open list; work it before proposing
anything new, and when the owner asks "what's next", start from it. An ask
kept only in chat or a task list is lost when the session ends.

Plan first: keep a task list for anything over two steps, one task in
progress at a time, and a task is done only when it is tested and live
(pushed, merged to `main`, and the live site checked). Leave anything blocked
open and say what it waits on.

Load these skills when the work matches; don't wait until halfway through:

| When | Skill |
|---|---|
| Start of the session, any multi-step task | `working-method` (if the account has it) |
| Anything a student sees: screens, labels, toasts, Help, the tree | `arborous-design` and `app-making` |
| Scheduling, Review, Learn, Today, the memory model, any "will this help students" question | `simulate` |
| Before shipping a code change | `code-review` |
| Auth, sync, share links, rendering course diagrams, anything with user input | `security-review` |
| Editing or making a skill | `skill-creator` |
| Questions about the learning science (`docs/evidence.md`) | the PubMed connector, if connected |

A new session starts with `npm install` and Playwright already done (the
SessionStart hook in `.claude/hooks/`). `node scripts/screenshots.mjs <dir>`
shoots every screen; `node scripts/ui-dashes.mjs` lists the em dashes in the copy, to judge each one.

