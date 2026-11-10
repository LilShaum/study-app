# Grade Arborous against its goals

**When**: now. The changes the owner wanted built first are live: the
design audit's five directions (2026-11-06) and the tree's look C
(2026-11-10). The owner, 2026-11-03: grade "after you have finished doing a
bunch of the changes I've asked you for".

**To start it** (the owner): open a fresh session on this repo. Before
typing anything, choose **Fable 5.2** and **high** effort (CLAUDE.md,
Models: a switch after the first message makes the new model reread
everything). Attach the material below and say: *"Read
docs/prompts/grade-the-app.md and do it."*

**Attach**: the **slides** (PDF) of one or two real lectures, nothing else.
The session makes each lecture's file itself with the current prompt, on
Opus 5.5 at high effort as the owner does (CLAUDE.md, Models), so the file
it grades is what the app makes today. Slides stay out of the repo, which
is public. Without them it grades on the made-up test lectures in
`scripts/__fixtures__/` and marks those grades provisional.

**Not the owner's study data.** They use the app too little for their log
to say anything (2026-11-03: "im afraid you will make false conclusions
off my one off shitty data"). Judge learning and scheduling with the
simulator, never from the owner's own answers.

---

## What you are doing

Grade every part of Arborous, and the lecture files it makes, against what
each is for: how far it hits that mark, where it misses, and why. Then
propose what would close each gap, overhauls included where a part is
built on the wrong idea. **Grade and propose; build nothing** until the
owner has read the report and chosen.

The owner (2026-11-03): "go through and grade the app and every component
of it relative to the goals of the app and each of those components and how
much we are hitting those marks or missing them … suggest
changes/fixes/improvements that would help bridge the gaps, even to the
point of suggesting overhauling certain things if necessary."

And what they hope this session sees that earlier ones did not
(2026-11-10): "include … all the previous like grades and stuff that has
been looked at and changed so it can see the evolution and see if shit
could have been better to do another way … look at shit that humans notice
and care about making good in an app that usually our ai app improvement
sessions miss, because they tend to focus on more technical things … I
want it to really give good insight in actual app ui/ux design and how the
code should be written and organized and like the different systems of the
app and how they were built and seeing if things can be improved at deeper
more fundamental levels whereas usually its like little tweaks … i def want
fine tunning too or just any improvements it can argue".

So, besides the grade of each part, three things:

1. **The evolution**: how the app got here, and where it could have gone
   another, better way.
2. **What a person notices**: the app's design and feel as a student meets
   it, judged as seriously as its learning logic.
3. **The systems and the code**: what shape each system should have for
   what the app has become, at the level of how it is built, not only its
   details.

Most earlier sessions built one ask at a time, and their reviews found
bugs and small fixes. Few stepped back to ask whether a part rests on the
right idea. You have the whole history and the room to do that. Fine
tuning counts too: any improvement you can argue.

## Read first, in this order

1. `CLAUDE.md`: what the app is for, in the owner's words. This is the
   yardstick above every other.
2. `docs/EXPECTATIONS.md`: each part's **Goal**, how it is meant to work,
   and **Goals to confirm** at the end (drafts the owner has not yet
   confirmed: ask them at the start; while no answer has come, grade the
   other parts first).
3. `docs/ASKS.md`: everything the owner has asked, open and done.
4. `docs/proposals/`: decisions already argued. Do not overturn one without
   new evidence, and say what the evidence is when you do.
5. `docs/evidence.md`, `sim/FINDINGS.md`, `prompts/generator.md`,
   `docs/HANDOFF.md` (§5 what went right and wrong, §8 the technical map).

Load the skills the work needs, when it needs them: `working-method`,
`simulate` (anything about scheduling or learning), `arborous-design` and
`app-making` (anything a student sees).

## The history: how the app got here

The repo keeps most of its own history. Read it as evidence of how the
app was made and checked, not as decisions to defend.

- **The commits.** 414 since 2026-08-31, each message saying what changed
  and why. A cloud clone is shallow: run `git fetch --unshallow origin
  main` first. `git log --reverse --format='%ad %s' --date=short` reads as
  a timeline.
- **Earlier reviews**, each with what it found:
  - in `docs/audits/`: the code audit and the first test of the prompt on
    real slides (both 2026-09-27), the audit of the learning logic
    (2026-10), the fresh-eyes review (2026-10-13), and the weak points
    found by using the app as a student on a phone (2026-10-17);
  - the briefs two of them were given, in `docs/briefs/`;
  - the design audit (2026-11-03), in `docs/proposals/design-audit.md`.
- **Decisions.** Each proposal in `docs/proposals/` argues its options and
  names the pick; `decisions.md` holds the owner's choices of 2026-10-11.
  `sim/FINDINGS.md` dates what the simulator killed and what it kept.
- **What went live, and when.** The Done list in `docs/ASKS.md`. Its top
  paragraph says asks before 2026-10-14 are not on record.
- **The owner's corrections.** The dated lines in CLAUDE.md ("How the
  owner wants it to work"). Several exist because a session got something
  wrong.

What to look for in it:

- **The pattern in the owner's corrections.** Some, to start from:
  - written answers added to the practice test unasked ("I NEVER TOLD YOU
    TO ADD WRITTEN ANSWERS", 2026-10-26);
  - related terms that looked like buttons and did nothing for weeks;
  - one lecture with every right answer in position A, because shuffled
    options were asked for and never written down (2026-10-21);
  - Learn reading a term and asking its name straight away;
  - defaults tuned to one class ("Stop making changes that are based on
    specific info", 2026-10-26);
  - the generator prompt in CLAUDE.md, so a coding session saved a course
    and a check pushed it to a public branch (HANDOFF §5).

  Others are in the history. Ask what each says about how this app is
  built and checked, not only what was fixed, and whether the same kind of
  miss is still waiting somewhere.
- **Decisions that could have gone another way**: a pick that later work
  strained against, a feature built and then rebuilt, a part that grew by
  one ask after another instead of by design.
- **What the earlier reviews found, and what became of it**: fixed, still
  open, or come back.
- **What none of them looked at.**

## The lenses

Grade every part against its own goal, and these where they bear on it.

**The ones the owner has stressed most:**

1. **Understanding, not memorising.** The why, the connections, questions
   that test application: two ideas together, the nuance between
   neighbours, misconceptions, the opposite, a similar term swapped in,
   right but for one detail.
2. **Slides are a narrated lecture with the narration missing.** Bullets
   are pieces of a picture; a diagram is there to learn from or only to
   paint the picture; the teacher's talk joined them into a mechanism or a
   comparison. The file and the app now carry narration (section openings,
   the lecture's thread, figure notes; `docs/proposals/narration.md`).
   Does a student who never heard the lecture get what the teacher said?
3. **A lesson plan that builds**, in the slides' order, as a tutor would
   teach it, adapting to what the student misses, for a student who may
   never have gone to the lecture.
4. **Every way to study has one clear use.** Two that do one job are a gap.
5. **Easy as Duolingo**: open it on a bus and study; the reason to come
   back is what is fading, never guilt.
6. **Built for any class**: judged on a class with no calculations, no
   studies, no diagrams too.
7. **What it is for against what it does**, with no bias toward what was
   built.

**What a person notices.** Review sessions tend to check what code can
show: a function's output, a test, a label's wording. People judging an
app notice other things first, and those decide whether it gets opened
again tomorrow. Grade them as seriously as the learning logic. Some of
what that covers, as starting points rather than a checklist:

- **The first minutes of someone new.** They open it; then what? A first
  lecture means taking a prompt to an AI chat with their slides and
  bringing the reply back. Walk that as a new student would, with no one
  to explain it.
- **Feel.** Does it feel made, calm and of one piece? Do spacing,
  alignment and type set a rhythm or fight it? Is there feedback on a tap,
  and motion where it helps? How fast does it feel on an ordinary phone?
  Playwright can slow the CPU 4×, as the weak-points review did.
- **Effort.** Taps and decisions to reach what you came for; where the eye
  lands first; how much there is to read before acting; how far there is
  to scroll (Help was about 18 phone screens at the last count).
- **Knowing where you are**: what a tap will do, how to get back, whether
  the same thing looks and behaves the same everywhere.
- **How it treats you**: after a wrong answer, at the end of a sitting,
  after a skipped day. Encouraging or nagging? Kind to a tired student on
  a bus?
- **Real life**: interrupted mid-sitting, the phone locked, offline,
  switching apps, a dark room, one hand, a small phone; and a desktop at a
  desk.
- **Trust**: does a student believe the numbers and the schedule, and
  that their work is safe?

Use it over time, not a screen at a time: several days of study with
progress seeded, a whole sitting from Start to its end, a practice test
from setup to results. Record video where motion matters. Hold it against
apps students already like for what each does best (Duolingo's ease is the
owner's own bar) as a standard to meet, not a look to copy. The book look
(`arborous-design` skill) is the app's identity: judge how well it is
carried out and whether it helps, and say so where it gets in the way.

The design audit's second pass has not been run: the New lecture and Add
dialogs, Sync, Help, the glossary, Browse, desktop widths. Grade those
screens with the same care; your findings are that pass.

**The systems and the code.** Judge the code as the person who will keep
building this app for years would. About 29,000 lines of TypeScript outside
the tests, in rough systems (HANDOFF §8 maps them):

- the lecture file and its schema (`src/schema`);
- what is stored and how (`src/store`, Zustand persisted in localStorage);
- the memory model (`lib/memory`);
- building a sitting (`lib/buildSessionItems`, `lib/learnSteps`,
  `store/session`, `components/session`);
- the item kinds and their cards (`components/items`);
- the practice test (`routes/TestRoute`);
- the lecture check (`lib/courseHealth`);
- the prompts the app hands out (`prompts/`, `lib/build*Prompt`);
- sync and backup (`lib/cloud`, `lib/autoSync`, `lib/backup`);
- the tree (`lib/growTree`, `components/CourseTree`);
- the offline app and its updates (`sw.ts`, `lib/appUpdate`);
- the simulator (`sim/`), the tests and the screenshot script.

Questions to ask of each:

- **Built today, knowing every ask, what shape would it have?** How far is
  the code from that shape, and does the gap cost anything: bugs a student
  meets, features that are slow or risky to add, modes that behave
  differently where they should match?
- **Where does one idea live in many places?** As an example of the kind
  of thing to look for, not a finding: adding the select-all item kind
  meant touching about 30 files, because each assumed one right answer
  (`docs/proposals/multi-select.md`).
- **Where has a file grown by accretion?** The largest are TestRoute
  (about 1,600 lines), CardSession (1,100) and CourseTree (1,000).
- **Data that lasts**: how the lecture file and stored progress change
  without losing a student's work, and the storage budget the weak-points
  review ran into.
- **The tests**: do they check what a student meets, or how the code
  happens to be written?

For each deep change, give the honest cost: what it takes, what it risks,
what it buys, and a path that keeps the app working and live at every
step. A rewrite argued from taste is not a finding. One argued from what
the current shape costs students or the work is.

**Fine tuning.** Small improvements count: a label, a spacing, a slow
screen, a line in the prompt. List them by part, briefly; the large ones
get the full argument.

## Plan the plan first

The owner's method (CLAUDE.md, 2026-11-03): before grading anything, write
how the grading will be decided. That means the yardstick for each part,
what counts as evidence, the scale, and the order you will go in. Weigh the
options for each of those, argue them, pick, and only then grade. Write it
as section 0 of the report.

## The parts

The lecture file and its prompt (New lecture, Add material, Add questions,
Add explanations, Fix), the narration, the lecture check, Today, Learn,
Review and the memory model, Practice, the practice test, multiple choice
(wrong options, Why, Not sure), select all that apply, flip cards (Got it ·
Hard · Missed it), typed terms, written answers, worked problems,
explanations, the library, a lecture's page, a class's page and exams, the
tree, Progress, Browse, the glossary, diagrams, Help, the first run, Sync,
export and share links, Studies, Set aside, and the design language as a
whole. Add any part you find that this list misses.

## How to judge: what it does, not what its code means to do

- **Use it as a student.** Phone size first, both themes
  (`npm run build`, `node scripts/screenshots.mjs <dir>` outside the repo).
  Walk a real sitting start to finish (`src/lib/sessionAudit.test.ts`, its
  steps in the arborous-design skill). Note what a student meets, and what
  a student who never went to the lecture would make of it.
- **For the lecture files, take the real slides.** Slide by slide: what
  would the teacher have said, and why is this diagram here? Then find
  where, if anywhere, a student meets that in the file and in the app.
- **For learning and scheduling, the simulator** (`npm run sim`, and new
  policies where a proposal needs one), its findings in direction and size
  only, holding under more than one simulated student.
- **Read the code** where what happens matters and a screen cannot show it,
  and for the systems lens above.

**The scale**, in words, each grade with its evidence and one sentence of
why: *Hits it* · *Mostly* · *Partly* · *Misses* · *Works against it*.

## What to write

`docs/proposals/grade-<date>.md`:

1. **How this was decided** (section 0 above).
2. **The scorecard**: every part, its goal, its grade, the evidence, its
   biggest gap.
3. **The evolution**: what the history shows. Decisions that could have
   gone another way, the pattern in the owner's corrections, what earlier
   reviews found and what became of it.
4. **The gaps, ranked** by how much each costs learning or use, times how
   often a student meets it.
5. **For each of the top gaps**: the options (an overhaul among them
   wherever the part rests on the wrong idea), argued for and against, a
   pick and why it wins, its rough cost, and what the simulator or a real
   sitting must show before it is built.
6. **The systems**: for each, its shape now, the shape it should have, and
   whether and how to get there.
7. **Fine tuning**, by part.
8. **What already works** and should be left alone, and why.
9. **Questions only the owner can answer.**

The owner reads it on a phone and has not seen your tool calls or the files
you opened. Put the key points first, name things the way a student would
rather than by a term made up during the work, write in full sentences,
and keep bullets for lists of separate items.

Then give the owner a short summary in chat: the grades, the three gaps
that matter most, and the questions. Commit the report (docs only) and
push it as the repo's rules say.

## How to run it

- **Models.** You (Fable 5.2, high) plan, judge and write the report. Name
  the model on every agent (CLAUDE.md, Models): Opus 5.5 to grade a part
  or anything a student reads, Sonnet 5.5 for searches and mechanical
  reads. Each lecture's file is made by an agent on Opus 5.5 at high
  effort, following `prompts/generator.md` as the app hands it out.
- **Agents cost a cold start.** Each one rereads what it needs, so one is
  worth it where a piece splits off cleanly (a system's code, a group of
  screens, a lecture file against its slides) and you don't need the
  reading yourself. Don't start agents to re-check your own grading. Five
  at once once used a session's usage in ten minutes (CLAUDE.md), so stay
  below that.
- **No approval needed** to read anything, build, run the tests and the
  simulator, take screenshots and videos, start agents within the plan
  above, and write, commit and push the report. Ask the owner only about
  the Goals to confirm. This session changes nothing in the live app.
- **Grades come from evidence.** Where a grade rests on a guess (no real
  slides, a screen only seen at desktop size), say so beside it.
- **Never put course content in the repo** (CLAUDE.md). The slides and the
  files made from them stay in the scratchpad.
- **Every new ask goes in `docs/ASKS.md`** the moment the owner makes it.
