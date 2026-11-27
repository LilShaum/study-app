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
- **Continuous adaptive quiz** (2026-11-22, planned in
  `docs/proposals/zen.md`): for once a lot has been covered, questions
  that keep coming, ordered by what was just missed, what is not learned,
  past misses and unsure answers; marked as you go ("the time it took
  reviewing all the answers" was the slowest part of the master prompt),
  with every miss to be seen at once. Learn keeps Skip the reading: Learn
  is "paralell to the lecture notes", the quiz is "for if someone just
  wants to have that adaptive quizzing".
- **Practice:** mixed lectures, closer to an exam, as the exam gets near
  (2026-10-19). Study whatever you want however you want: boxes to tick
  for kinds and sections, not one-of choices, and easy to find ("having
  it hidden is bad", 2026-11-03).
- **Practice test and written questions:** what you practise should look
  like what the exam asks. Where a class's exam is calculations, short and
  long answers, the app should have you write them (2026-10-21). The
  practice test is multiple choice unless written answers are chosen on
  its setup ("I NEVER TOLD YOU TO ADD WRITTEN ANSWERS", 2026-10-26), and
  what was missed comes back first in the next test: "Remember, ADAPTIVE"
  (2026-10-26). Practice studies and the test rehearses (2026-11-03: "a
  practice test that doesn't show u answers right after and maybe it has
  u timed … but u can still customize what shows on it"; the default left
  to the design): the test marks at the end, timed if wanted, with the
  same reasons and passage as the other modes; Practice marks as you go,
  which the test did from 2026-10-26.
- **Making a lecture:** the student ticks which kinds of item to make and
  gets only those ("if they just want flash cards for example they will
  just get flash cards"); prompt screens are a few short steps, details
  folded, clear to a new user (2026-10-29).
- **Trusting a lecture** (2026-11-27): a student who missed class must be
  able to trust the lecture. The owner already dislikes that AI has to make
  lectures, so no extra AI step for checking: the generator prompt audits
  its own lecture by a method, and where the app can check without AI
  (slide accounting, the slides themselves) it does (`docs/proposals/trust.md`).
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
- **Understanding, not memorising** (2026-11-03: "people shouldnt
  memorize, they should learn, meaning understand why exactly the thing
  they are being taught is that way … by making connections"). Questions
  that test application: concepts combined, the nuance that tells two
  similar things apart, wrong options that are misconceptions, the
  opposite, a similar term swapped in, or right but for one detail. The
  explanations the generator writes are there to be used for this, across
  the app. Saying how sure you were should matter: a confident wrong
  answer is worth more attention.
- **Slides are a narrated lecture with the narration missing**
  (2026-11-03). Bullets are pieces of a picture; a diagram is there to
  learn from, or only to paint the picture; the teacher's talk joined
  them into something bigger, a mechanism or a comparison. The file and
  the app must supply that narration for a student who never heard it,
  for any kind of source, slides first. A diagram the slide's text talks
  about is the point, to be known (2026-11-03: "if a pathway is shown in a
  diagram and then there are bullet points about it … things I need to
  know").
- **Motion is realistic, not step by step** (2026-11-25): things overlap
  as they would in life ("very soon after it starts shaking the leaves
  should start falling and continuing to do so while the shake continues"),
  never one animation waiting for the last to finish.
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
- **The end of every reply** (2026-11-11): replies run long and the owner
  may not read all of it, so anything for them to look at goes at the
  bottom, short and set apart: the questions for them, and the decisions
  or liberties taken without asking ("if there is a little question hidden
  in there or some liberty you took/decision you decided to make on your
  own, please make it so they are outlined at the bottom because those are
  SOME of the main things I need to overview"). The owner often replies
  partway through reading, so a question their reply leaves unanswered is
  asked again at the bottom of the next reply, until it is answered or
  dropped (2026-11-11: "if I dont address something that I need to
  address then make sure to bring it up again").
- **Review pages** (2026-11-25): the page the owner reviews holds only what
  they have not seen or answered yet; anything changed again later shows
  only as it is now. Everything to read, and every question, is on the
  page, each item able to stand alone (what changed, where to look, what is
  asked), so a reply in chat only points to it. "Do not overcomplicate
  things for me, do not bombard me with information, do not go so concise
  and context deprived that I'm not sure what you are referring to, make it
  intuitive to go through, make it so it's not easy to miss details."
- **Working with the owner:** usage is limited, so ask before expensive
  work. "What's next?" means work you can do without them. Done means
  tested and live.
- **Use agents** (2026-10-18: "feel free to start paralell tasks with new
  agents"; 2026-11-03: "I swear I have said repeatedly to use agents").
  Split work that splits, in parallel, each agent well scoped and on a
  cheaper model where that is enough; read its diff and run the checks
  before anything ships. Mind the cost: five at once used a session's
  usage in ten minutes (2026-10-21), so say before a large fan-out. An
  earlier session wrote that complaint down as "one agent at a time"; the
  owner never said that. **But anything a student sees or feels is built
  by the session itself, never an agent; agents do mechanical work only
  (scripts, data, tests)** (2026-11-25).
- **Done means checked the way the owner tests** (2026-11-25): on a phone,
  zoomed in, light and dark, scrolled to the bottom, several taps in a
  row, and against each expectation in its `docs/FEEDBACK.md` entry.
- **Models** (2026-11-04). Sessions run on Opus 5.5: check before the
  first message (an early switch is cheap; one 22 minutes in made the new
  model reread everything and used the owner's usage). Every agent is
  spawned with its model named, never inherited: an agent copies the
  session's model at that moment, which is how one ran on Opus 5. Sonnet
  5.5 for well-scoped coding to an exact spec, searches and mechanical
  edits; Opus 5.5 for planning, judging, reviewing, grading and anything a
  student reads. **Courses are generated the way the owner does it: Opus
  5.5 on high effort or more, with the prompt as the app hands it out**
  (2026-11-04). A test course made on a smaller model shows that model's
  limits, not the prompt's; a second model may be tried only to find
  unclear wording, and a fault that shows only there is never patched
  with more rules. **Fable 5.2** (2026-11-10) costs twice as much and has
  its own, smaller allowance: kept for the grading session, a fresh
  session at high effort (Anthropic: most of its gain is there; max is
  slow and costly), never switched into a long chat.
- **Plans for reimagining, auditing or improving something** (2026-11-03:
  "make well thought out plans, and plan the plans. dont make them in one
  go, debate with urself what is better or worse between certain options
  … and argue to yourself why a certain way to do something is the best
  and only then is there a plan"). First plan how to decide (what the
  feature is for, who meets it, what evidence and code bear on it), then
  lay out the real options, argue each for and against, pick one with the
  reason it wins, and only then write the build plan. Written down in
  `docs/proposals/`, so the reasoning outlives the session.

**Part 4 codes** (2026-11-25): if the owner types `P4-1`, `P4-2` or `P4-3`,
read `docs/proposals/part4-brief.md` and do that stage.

## Working on the app

- `prompts/generator.md` is the generator prompt the app hands out (imported
  with `?raw`). It is not instructions for coding here; edit it only when the
  task is to change that prompt.
- Checks: `npm run build` (the same `tsc -b` CI runs, which also covers `sim/`;
  `npx tsc --noEmit -p .` does not), `npx eslint src`, `npx vitest run`.
- The study simulator (`.claude/skills/simulate`) is for anything that
  changes scheduling, Review, Learn or the memory model.
- A change a student would notice (how the app teaches, what the prompt
  makes, a new way to study, a screen that works differently) gets one
  plain line in `src/lib/whatsNew.ts` in the commit that ships it: Help's
  What's new (2026-11-10).

## How to work here

**Every piece of feedback is broken down before anything is built**
(2026-11-25: "don't just accept them as adjectives but break down each one
and see what I really mean"): the `owner-feedback` skill writes it into
`docs/FEEDBACK.md` with what went wrong, the ask in my own words, and each
expectation turned into a meaning, a check and the cheap reading to avoid.

**Every ask goes in `docs/ASKS.md` the moment the owner makes it** (dated,
their words), and leaves Open only when it is live or the owner drops it.
The session-start hook prints the Open list; work it before proposing
anything new, and when the owner asks "what's next", start from it. An ask
kept only in chat or a task list is lost when the session ends.

**Ripples** (2026-11-22): a change is not done until everything that
relates to it is checked and changed with it: grep for the old behaviour's
words, and walk its row in `docs/RIPPLES.md` (the prompts, Help,
EXPECTATIONS, checks, tests). The generator prompt described a Learn order
the app had dropped weeks before because nobody looked.

Plan first: keep a task list for anything over two steps, one task in
progress at a time, and a task is done only when it is tested and live
(pushed, merged to `main`, and the live site checked). Leave anything blocked
open and say what it waits on.

Load these skills when the work matches; don't wait until halfway through:

| When | Skill |
|---|---|
| Start of the session, any multi-step task | `working-method` (if the account has it) |
| Any feedback, correction or expectation from the owner (screenshots, review-page notes, "you didn't listen") | `owner-feedback`, before replying or building |
| Anything a student sees: screens, labels, toasts, Help, the tree | `arborous-design` and `app-making` |
| Scheduling, Review, Learn, Today, the memory model, any "will this help students" question | `simulate` |
| Before shipping a code change | `code-review` |
| Auth, sync, share links, rendering course diagrams, anything with user input | `security-review` |
| Editing or making a skill | `skill-creator` |
| Questions about the learning science (`docs/evidence.md`) | the PubMed connector, if connected |

A new session starts with `npm install` and Playwright already done (the
SessionStart hook in `.claude/hooks/`). `node scripts/screenshots.mjs <dir>`
shoots every screen; `node scripts/ui-dashes.mjs` lists the em dashes in the copy, to judge each one.

