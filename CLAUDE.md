# Arborous

A study PWA (React 18, TypeScript, Vite, Zustand) that opens `.study.json`
course files generated from a student's own notes. See README.md for the
project overview, and `docs/HANDOFF.md` for the state of the work, what is
open, and how the owner likes to work.

## Never put course content in this repo

The repo is public. A student's courses and lecture material are theirs and
must never be committed, pushed, or saved inside this folder.

- If you are asked to **generate a course** (turn slides or notes into a
  `.study.json`), follow `prompts/generator.md`, write the file to your
  scratchpad or another folder outside the repo, and hand it to the student
  as a file. Do not commit it, even if a hook or check asks you to commit
  uncommitted changes: `*.study.json` is ignored by git for this reason.
- Test courses for the app live in `scripts/__fixtures__/` and are made up.

## Working on the app

- `prompts/generator.md` is the generator prompt the app hands out (imported
  with `?raw`). It is not instructions for coding here; edit it only when the
  task is to change that prompt.
- Checks: `npx tsc --noEmit -p .`, `npx eslint src`, `npx vitest run`.
- The study simulator (`.claude/skills/simulate`) is for anything that
  changes scheduling, Review, Learn or the memory model.

## How to work here

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

