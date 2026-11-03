# Grade Arborous against its goals

**To start it** (the owner): open a fresh session on this repo at the
highest effort setting, attach the material below, and say: *"Read
docs/prompts/grade-the-app.md and do it."*

**Attach, if you can** (kept out of the repo, which is public):
- one or two real lectures: the **slides as a PDF** and the **`.study.json`**
  made from them. This is the only way to grade the lecture files against
  what a teacher would have said;
- a **backup** from the app (Help → Back up everything), with progress and the study
  log, so Today and the schedule are judged on real use, not only simulated.

Without them the session grades on the made-up test lectures in
`scripts/__fixtures__/` and marks those grades provisional.

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

## Read first, in this order

1. `CLAUDE.md`: what the app is for, in the owner's words. This is the
   yardstick above every other.
2. `docs/EXPECTATIONS.md`: each part's **Goal**, how it is meant to work,
   and **Goals to confirm** at the end (drafts; if the owner has not
   confirmed them, ask before grading against them).
3. `docs/ASKS.md`: everything the owner has asked, open and done.
4. `docs/proposals/`: decisions already argued. Do not overturn one
   without new evidence, and say what the evidence is when you do.
5. `docs/evidence.md`, `sim/FINDINGS.md`, `prompts/generator.md`,
   `docs/HANDOFF.md`.

Load the skills the work needs, when it needs them: `working-method`,
`simulate` (anything about scheduling or learning), `arborous-design` and
`app-making` (anything a student sees).

## Plan the plan first

The owner's method (CLAUDE.md, 2026-11-03): before grading anything, write
how the grading will be decided. That means the yardstick for each part,
what counts as evidence, the scale, and the order you will go in. Weigh the
options for each of those, argue them, pick, and only then grade. Write it
as section 0 of the report.

## The lenses the owner has stressed most

Grade every part against its own goal, and these where they bear on it:

1. **Understanding, not memorising.** The why, the connections, questions
   that test application: two ideas together, the nuance between
   neighbours, misconceptions, the opposite, a similar term swapped in,
   right but for one detail.
2. **Slides are a narrated lecture with the narration missing.** Bullets
   are pieces of a picture; a diagram is there to learn from or only to
   paint the picture; the teacher's talk joined them into a mechanism or a
   comparison. Does the file, and does the app, give that narration to a
   student who never heard it? The generator works out why each slide was
   shown and where a run of slides builds to, then drops it ("the map is
   not part of the output"): judge what that costs.
3. **A lesson plan that builds**, in the slides' order, as a tutor would
   teach it, adapting to what the student misses, for a student who may
   never have gone to the lecture.
4. **Every way to study has one clear use.** Two that do one job are a gap.
5. **Easy as Duolingo**: open it on a bus and study; the reason to come
   back is what is fading, never guilt.
6. **Built for any class**: judged on a class with no calculations, no
   studies, no diagrams too.
7. **What it is for against what it does**, with no bias toward what was
   built ("related terms looked like buttons and did nothing for weeks").

## The parts

The lecture file and its prompt (New lecture, Add material, Add questions,
Add explanations, Fix), the lecture check, Today, Learn, Review and the
memory model, Practice, the practice test, multiple choice (wrong options,
Why, Not sure), flip cards, typed terms, written answers, worked problems,
explanations, the library, a lecture's page, a class's page and exams, the
tree, Progress, Browse, the glossary, diagrams, Help, the first run, Sync,
backup, export and share links, Studies, Set aside, and the design language
as a whole. Add any part you find that this list misses.

## How to judge: what it does, not what its code means to do

- **Use it as a student.** Phone size first, both themes
  (`npm run build`, `node scripts/screenshots.mjs <dir>` outside the repo).
  Walk a real sitting start to finish (`src/lib/sessionAudit.test.ts`, its
  steps in the arborous-design skill). Note what a student meets, and what
  a student who never went to the lecture would make of it.
- **For the lecture files, take the real slides.** Slide by slide: what
  would the teacher have said, and why is this diagram here? Then find
  where, if anywhere, a student meets that in the file. Are the bullets
  joined into the bigger picture? Are the comparisons drawn? Is each
  diagram tested, explained, or rightly left alone?
- **For learning and scheduling, the simulator** (`npm run sim`, and new
  policies where a proposal needs one), its findings in direction and size
  only, holding under more than one simulated student.
- **Read the code** where what happens matters and a screen cannot show it.
- **The real backup**, if attached: what the student studied, missed and
  let fade, against what the app planned.

**The scale**, in words, each grade with its evidence and one sentence of
why: *Hits it* · *Mostly* · *Partly* · *Misses* · *Works against it*.

## What to write

`docs/proposals/grade-<date>.md`:

1. **How this was decided** (section 0 above).
2. **The scorecard**: every part, its goal, its grade, the evidence, its
   biggest gap.
3. **The gaps, ranked** by how much each costs learning times how often a
   student meets it.
4. **For each of the top gaps**: the options (an overhaul among them
   wherever the part rests on the wrong idea), argued for and against, a
   pick and why it wins, its rough cost, and what the simulator or a real
   sitting must show before it is built.
5. **What already works** and should be left alone, and why.
6. **Questions only the owner can answer.**

Then give the owner a short summary: the grades, the three gaps that matter
most, and the questions. Commit the report (docs only) and push it as the
repo's rules say.

## Rules

- **Never put course content in the repo** (CLAUDE.md). The attached slides,
  files and backup stay in the scratchpad.
- **Use agents** (CLAUDE.md): grade parts in parallel where they split,
  each agent well scoped. Usage is limited, so say before a large fan-out.
- **Every new ask goes in `docs/ASKS.md`** the moment the owner makes it.
- **Grades come from evidence.** Where a grade rests on a guess (no real
  lecture, no real log), say so beside it.
