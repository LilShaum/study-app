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
  `.study.json`), follow `prompts/generator.md` (with its `<!-- no studies
  -->` passages unless the student says their exams ask about studies, as
  the app's box does), write the file to your
  scratchpad or another folder outside the repo, and hand it to the student
  as a file. Do not commit it, even if a hook or check asks you to commit
  uncommitted changes: `*.study.json` is ignored by git for this reason.
- Test courses for the app live in `scripts/__fixtures__/` and are made up.

## How the owner wants it to work

The picture the owner has of the app, in their words where they gave them.

**What it is for, above everything below (2026-10-26).** A one-stop shop
for studying, grown from the owner's first-year "master prompt" for Gemini:
adaptive quizzes that went through topics in the order of the slides while
coming back to what they struggled with, with multiple choice near test
quality. So the app is a lesson plan in which each thing the student does
builds logically on the last, as if a friend or tutor were teaching them:
making the connections the teacher would have made in class, so they learn
rather than memorise; following the slides' order so they can follow along;
adapting to their needs and gaps; efficient on high-yield content without
losing the nuance; testing comprehension and mastery, not recall alone. And
it must help them reach that, not only test it, even if they never went to
the lecture or opened the slides.

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
- **Learn's order in a step:** Read, Recall, Apply. Recall easy to hard
  (easy multiple choice, flashcards, name the term), then Apply: the
  conceptual multiple choice and the write-the-answer questions
  (2026-10-26). Never read and then name straight away: it "accomplish[es]
  no teaching and slows shit down" (2026-10-26).
- **Practice:** mixed lectures, closer to an exam, as the exam gets near
  (2026-10-19).
- **Practice test and written questions:** what you practise should look
  like what the exam asks. Where a class's exam is calculations, short and
  long answers, the app should have you write them (2026-10-21). The
  practice test is multiple choice unless written answers are chosen on
  its setup ("I NEVER TOLD YOU TO ADD WRITTEN ANSWERS", 2026-10-26). Right
  or wrong is shown as each is answered, with the same reasons and passage
  as the other modes, and what was missed comes back first in the next
  test: "Remember, ADAPTIVE" (2026-10-26). Answers as you go by default, or
  at the end if chosen (2026-10-26).
- **Making a lecture:** the student ticks which kinds of item to make and
  gets only those ("if they just want flash cards for example they will
  just get flash cards"); prompt screens are a few short steps, details
  folded, clear to a new user (2026-10-29).
- **Wrong options:** a well-reasoned wrong answer that shows a gap in
  what you know matters more than equal length. Words like never, only,
  often are what test the nuance and are not a giveaway (2026-10-20).
- **Course content:** where a class is about concepts, the cards are too,
  not niche values. When the student gives assignments or past questions,
  they show what kind of question that class's exam asks; extrapolate that
  to the other topics. The slides' titles, bullets that lead into each
  other, overviews and summary slides show what matters (2026-10-20).
- **Built for any class** (2026-10-26: "Stop making changes that are based
  on specific info. This app is supposed to work for essentially any
  class"). What the owner says about one class (its exam format, its
  teacher, its assignments) shapes that class's course files, never the
  app's defaults. A feature switches on from what a lecture contains, not
  from assumptions about the exam, and is judged on a class that has none
  of it too.
- **How the owner studies:** reads the slides or notes, then answers from
  memory; Learn section by section alongside the notes.
- **Studying is the app's main job:** keep improving how it teaches,
  effectiveness before polish, without waiting to be told. Think through
  how a student meets each screen and brainstorm before building; the
  obvious basics (shuffled options, an "I don't know") should never wait
  for the owner to ask (2026-10-26).
- **Check what a feature is for against what it actually does**, without
  bias toward what was built: related terms looked like buttons and did
  nothing for weeks (2026-10-26). Use it the way a student does before
  calling it done.
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

