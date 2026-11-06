# What Arborous is expected to do

The goal of every feature, how it is meant to work, and what counts as
working. Read the entries for anything you are about to change. If a change
alters what a feature does, update its entry in the same commit. When the
code and this file disagree, don't pick one yourself: ask the owner which is
wrong.

`docs/HANDOFF.md` has the state of the work and its history; this file only
says what the app should be. Numbers quoted here are the current settings in
code; the code is their source of truth.

## The whole app

A student turns their own lecture slides into a lecture file with the app's
prompt, opens it, and from then on the app decides what to study each day.
Two bars:

- **A lecture file**: a student who works through every item meets nothing
  on the exam they have not practised, and spends their time on what the
  lecture teaches, in proportion to how much it matters.
- **The app**: a student who just presses Today each day, for the time they
  have, ends up as ready as that time allows, without knowing anything
  about spacing, retrieval or scheduling.

It is built for one real student first (the owner: university, several
classes and exams at once, studies mostly on a phone), then for classmates
they share lectures with.

## Standing expectations

These hold for every feature.

**Learning**

- Asking beats showing. Retrieval over rereading, producing over
  recognising, spacing over massing (`docs/evidence.md`).
- Any change to scheduling, Today, Learn, review or the memory model is
  modelled in the simulator first, and counts only if it holds under both
  simulated students (`.claude/skills/simulate`).
- Check a feature through the doors a student uses, not by calling its
  code directly.
- Everything that tests can be answered "I don't know": multiple choice,
  typed terms, flashcards, written answers and the practice test. The
  answer (its reasons, the points to make) and the passage show, and it
  counts as a miss, never a mix-up. A guess that happens to be right would
  count as known; in the practice test it is a miss where Skip is a blank.
- Multiple-choice options are shuffled at every showing (`lib/optionOrder`),
  the key and each option's "why not" with them, so where an answer sits
  tells nothing: one generated lecture had every right answer first. A
  question that comes back has its right answer in a new place
  (`orderForShowing`): a plain reshuffle repeated it one time in four. A
  practice test keeps one order through a reload. An option that points at
  the others ("all of the above", "A and C") keeps the written order.

**Content** (the owner's rules, 2026-10-13 to 10-15)

- Item counts follow importance, not slide count or text length. Key ideas
  (an objective, what later slides build on, a pathway, a mechanism, a
  comparison) get 3 to 5 cards from different sides. Basics get their
  definition and little else: a definition is the right card for a basic
  term, because a basic term usually is just its definition, and later
  content needs it.
- A taught pathway is content, never an example: its steps, order and
  parts are tested. Labels in a figure the lecture builds on (shown twice,
  named by later slides, the subject of the slide) are content.
- MCQs carry the nuance: exceptions, the line between neighbours, what
  happens when a step fails, why. Not trivia, not a definition asked back.
  At most a quarter easy, at least a quarter hard.
- Nothing invented: every item quotes where it came from.
- Nothing the student's notes say to skip; anything they say matters is
  covered, even if it looks like an illustration.

**Product**

- Today is the one button. Everything else is for choosing yourself.
- Honest signals: the reason to come back is when knowledge will fade,
  never a streak or guilt.
- Local first: everything works offline without an account; sync is
  optional and merges.
- Phone first (390 px), plain words, a way back from every page, Undo for
  anything destructive (`.claude/skills/arborous-design`).
- The repo is public: no course content in it, ever.

**Work**

- A change is done when it is tested, pushed, live on the site and checked
  there. Anything blocked stays open with what it waits on.

## Getting lectures in

### New lecture (the generator prompt)

**Goal.** Turn a student's slides into a complete, well-weighted lecture
file in one AI chat.

**How it works.** Three short steps (the owner, 2026-10-29: the prompt
screens were "massive blocks of text … not intuitive for new users"): what
to make, copy the prompt, paste the reply; one line each, the reasons and
options folded behind a "more" line (`PromptStep`, `More`). What to make
is a box per kind (multiple choice, flashcards, terms to name, written
answers, explanations, worked examples, problems to work out, diagrams),
all ticked; untick one
and the prompt says to make only the rest and where their content goes
instead (`lib/makeKinds`, "if they just want flash cards … they will just
get flash cards"). The choice is kept on the lecture (`metadata.make`):
Add material, Add questions and Fix keep to it, Add explanations is not
offered without explanations, and the lecture check does not ask for a
kind left out. The app hands out `prompts/generator.md` plus the
student's notes on what their teacher stressed and, optionally, the lecture
it follows on from. The student attaches their slides to the same message.
"My exams ask about the studies on the slides" is off unless ticked
(the owner, 2026-10-26: in depth by default wasted their usage on a class
that never asks): ticked, each study is taught in full (question, method,
result, what it shows) and one the slides only cite is filled in from the
AI's knowledge, labelled; off, a study is evidence for its point, at most
one card on what it found as the slide states it, nothing from outside
(`generatorSpec(studies)`, the `<!-- studies -->` blocks).
The AI reads everything, maps why each slide is there, builds an inventory,
weights each idea, writes items, audits itself, and returns JSON. The app
reads the reply even if it is wrapped in text or cut off.
Part of the map is written out as the narration the slides leave out
(the owner, 2026-11-03: "slides are … a narrated lecture with the
narration missing"; docs/proposals/narration.md): what the lecture and each
section build to (`builds_to`), why each figure the lecture turns on is on
the screen and what to see in it (`why`; `purpose`, to know or just to
picture it; `where`, when there is no drawing of its own), and an `explain`
for each comparison the slides only imply, with a question that turns on
it. Every handwritten note that says more than its slide reaches the
student. A reason the slides do not give, an everyday case or a plain gloss
may be added in an `explain`, labelled `Outside the slides:`; nothing
scored rests on one, and the student sees "Not from your notes" on it.

**Working means.**

- Every term, objective, mechanism and figure the lecture builds on is
  covered; weights follow the content rules above.
- `metadata.inventory` lists `terms` (each has a definition), `mentioned`
  (only named, or covered another way) and `unclear_figures` (figures it
  could not read, so the student checks them).
- Each section has a `source_range` when the slides are numbered.
- The reply is compact (no indentation, an item a line) and leaves counts
  to the app: about a sixth less to write. A cut reply still keeps every
  whole item.
- Every item about an empirical study carries `study:<author> (<year>)`;
  with studies off there are few.
- Each wrong option is a mistake a student who studied would make (the
  neighbour, the reversal, the wrong step, another case's answer), from the
  lecture's own terms; at least one is as long as the right answer.
- If the AI can see only the text of the slides, it says so and asks for
  the file attached, rather than generating without the figures.
- The lecture and every section that builds to something say what, in a
  teacher's words, not a list of contents; each figure the lecture turns on
  has a note on what to look at; a figure marked to know is asked about.

**Not wanted.** Over-taught basics (twenty cards from one slide), skipped
figures and pathways, definitions of things only named, trivia about how a
figure was drawn.

### Add material

**Goal.** Add later slides to a lecture the student already has, without
repeating it and without dropping what the new slides teach.

**How it works.** The prompt carries the whole generator spec, every item
already in the lecture, its sections, ids and tags. The studies box starts
ticked only if the lecture already has study cards; What to make starts as
the lecture was made. The AI writes only what
is new and returns a fragment the app previews and merges.

**Working means.** A fact is skipped only when an item already tests it at
the same depth. A known topic taught in more depth (steps explained, a
mechanism, exceptions, new parts) is new content and gets the items the
spec asks for. New items join the right existing section.

### Add questions (once called More practice)

**Goal.** New questions on material the student already has, when the
existing ones are known.

**How it works.** A prompt with the lecture's excerpts and the course
check's gaps as priorities: sparse sections first, thin key terms, an MCQ
mix that is too easy, too few gradable items. What to make starts at
multiple choice and flashcards, with problems too in a lecture that has
them; written answers only when ticked.

**Working means.** New angles on the same material, never rewordings of
existing cards, and nothing that is not in the notes.

### Add explanations

**Goal.** Give a lecture made before explanations existed the teaching
before its questions: the connections a teacher makes in class, for a
student who may never have been (2026-10-26).

**How it works.** "Add explanations" on the lecture page (shown while the
lecture has none, or says nothing of what it builds to; also a tab of Add
material). The prompt lists each
section by id with its slide range, the terms it defines, every question
it asks, the explanations it already has and the passages its items
quoted, and the generator's own `explain` rules word for word
(lib/buildExplainPrompt). Pasted into the chat that wrote the lecture, it
writes from the slides; elsewhere from the quoted passages. The reply is
explanations, merged into their sections like any fragment, with what the
lecture and each section build to where they do not say yet (never over
what one already says), and, with Diagrams chosen and the slides in the
chat, notes on the figures the lecture has none of.

**Working means.** One to three per section where its questions turn on a
mechanism, a cause, a comparison or a reason; none for a section of plain
terms; nothing the slides do not support, and anything from outside them
labelled. Questions and scores are untouched.

### The lecture check and Fix

**Goal.** Show the student what is wrong or missing in a lecture file,
and get it corrected by the AI that wrote it.

**How it works.** `lib/courseHealth.ts` checks structure (ids, answer
keys), answer-shape give-aways, definitions that name their own term, the
same fact asked twice, MCQs that restate a definition, wrong options with
no reason (`rationale-missing`: Fix writes the reason, or replaces an
option that has none), a wrong option's short reason that only says the
notes don't mention it (`rationale-cites-source`: Fix says what is wrong
about the subject), questions that ask two things at once ("What happens,
and how else…?", `two-questions`; "…, and why?" is one: Fix splits it,
2026-10-26), questions to write out that are lists (names,
labels or questions, nothing explaining why or how: `written-list`) or crowd a section past two (`written-many`), which
Fix turns into multiple choice, terms never defined, sections that only test recall, figures the AI could not read,
and sections with far fewer or far more items for their slides than the
rest of the lecture (`lib/sectionDensity.ts`). Fix turns the findings into
a prompt for the same chat, which judges each one against the notes.

A figure the generator marked as something to know that no question asks
about is reported with the slides' findings: a diagram is read, never
scored, so it is the one way the student learns it will not be tested
(`untested-figures`).

**Working means.** Findings are plain, each says what to do, and none
blocks studying. They are grouped by what they ask (`findingGroup`): to
fix (a question answerable without the material, a problem whose answer
its own worked steps never reach: `problem-answer-mismatch`, which Fix has
worked again from the question alone), to check on the slides,
and smaller notes, folded. A pattern finding (the right answer longest too
often, from 35% of 16+ questions) hands Fix enough of the questions behind
it to undo the pattern. "Too often" is what a guess at the longest option
would score, a tie shared between the options in it (`longestCredit`): a
tie gives away a half, not a whole, and counting it whole flagged lectures
where length gave little away. The finding also has its own small repair, **Even out the
answers** (`lib/evenOptions.ts`): only new wrong options come back, placed
round the untouched right answer (one that leaves it longest, or tied for
it, is refused), merged as corrections under the same
ids. A class page does the same for all its lectures in one prompt and one
reply (`buildClassEvenOptionsPrompt`); each question carries its passage
from the notes, so the prompt works in any chat, not only the one that made
the lecture. A density finding only points; the student, with the
slides, decides.

## Studying

### Today

**Goal.** The one thing to press each day: the best use of the time the
student has.

**How it works.** Reviews what is starting to fade (most urgent first),
then carries on with new material, within the day's minutes (default 30,
re-asks of misses and measured card times included). In the last 4 days
before an exam with unseen material, review takes at most 40% of the time.
In the last 3 days, a day of 30 minutes or more is split into 3 sittings
3 hours apart. A few hours after a sitting, coming back gives a short
catch-up on what was missed. With several lectures, one daily time is
shared by how soon each exam is. A class page's Today starts in the lecture
with the nearest exam and carries on through the others.

**Working means.** A sitting ends close to its planned minutes; nothing
due is starved; new material is reached; the plan follows the exam.

### Learn

**Goal.** The first time through a section: teach it in small steps so it
sticks.

**How it works.** Steps of at most 12 cards, each Read, Recall, Apply (the
owner, 2026-10-26): read a few definitions (and explanations, examples);
recall them easy to hard, an easy multiple choice first, then the
flashcards, then each term typed from its meaning; then apply them in the
medium and hard multiple choice, then a problem to work out, with a card
to write last (`rankOf`). A
question with no difficulty counts as medium. Where a step has nothing
easy to recall first, its terms are named after its questions, never
straight after reading them (named straight after reading was
"accomplishing no teaching"). A card goes in the step of the last term it
names, and never before the passage it was written from: a question naming
only an earlier term but quoting a later definition's passage waits for
that step (a decay-chain question in step 1 of a real lecture, 2026-10-26).
A step with no question of its own whose terms a later question uses
joins the next step. Where every question on a
term only restates its definition, the question still waits five cards
after it, and the typed terms are what comes between; a term named in a
question waits five cards before it is typed, so in a short section it can
be named in the next sitting. Two cards
on one fact are at least 5 cards apart; at most 3 cards on a term at its
first meeting, the rest in a second look at the next sitting (never in the
sitting that taught it). A miss comes back later in its step with the
passage from the notes, before the step's question to write, which stays
last. A term defined the same way in two lectures counts
once. A section with a slide range can start with "read this part of your material" (any source: the range carries its unit, slides or pages; worded for any source, the owner 2026-10-29), then
everything is asked first. "Skip the reading" asks every card first, for
material already met in class. At the end Learn offers the next section.

A section that says what it builds to opens with it, as a teacher opens a
new part of a lecture, on the same first card as its slide range when it
has one; the lecture's first section opens with what the whole lecture
builds to as well (the owner, 2026-11-03; docs/proposals/narration.md).
It is read once, in the section's first step, in Learn and in Today's new
material, never in a review, Practice or the test, and Skip the reading
leaves it out. A figure's card says what to look at and whether it is to
know or just to picture it; one with no drawing of the app's says where it
is in the student's own notes. Neither moves a card or changes a schedule:
one more card to read per section cost nothing measurable in the simulator
(sim/FINDINGS.md, 2026-11-05).

An explanation (`explain`: a key idea in 2 to 4 sentences, what it is,
why, how it follows from the one before, as a tutor would say it) is also
the why behind each question that rests on it, wherever the question is
asked (Learn, Today, Review, Practice, the practice test): open under the
answer after a miss, folded as "Why ▸" after a right one, before the
passage from the notes. **Not sure**, beside Check answer and tapped
before it, opens the why and the passage after a right answer too, as a
miss does (feedback doubled what was kept of right answers given unsure:
Butler, Karpicke & Roediger 2008). In the practice test a question still
marked "?" when handed in is the unsure one, listed under Right, but
marked ? with its why. Sureness is logged, never scheduled on: both rules
tried cost more than they gave (sim/FINDINGS.md, 2026-11-03). A question rests on the explanation in its section
most of its words are in, or failing that one quoting the same passage;
with none, nothing shows (lib/learnSteps explanationFor; the owner,
2026-11-03: "use the new like explanation things … to help the user learn
and understand better"). It is read
in the step of the terms it uses, before that step's worked examples and
questions, and a card on it (most of its words in the explanation) never
comes a step before it. One that names no term is read with the first card
it teaches, or first of all. A card whose answer it prints waits at least
five cards, as after a definition. It does not change which terms place the
cards, nor count toward a section's density in the lecture check. Skip the
reading leaves explanations out; Review and Practice never show them.

A card that practises a worked example (most of its words in the example)
comes after the example, never a step before it. So does a problem: the
worked example teaches the method, the problem has the student use it on a
new case (the example-problem pair, docs/evidence.md). A step works at most
two problems at the first meeting, the one on each of its worked examples
first; the rest open the next sitting, since problems of one kind spread
over sittings and mixed with other kinds teach maths far better than a
block of them (docs/evidence.md). A problem counts as three cards in a step's
size, is not held back by a term's three-card limit, and is never asked
again in the sitting after a miss: its whole solution was just shown. A written answer of several points
is not asked again within the sitting after a miss (Review brings it back a
later day), and a section asks at most two cards to write in a sitting, the
rest in the next. A question that asks for some of the points listed
("Name three…" with five given, "Any three of:") is full marks at that many
(lib/answerPoints `need`), in sessions and the practice test. Every card asked as
"Write the answer" (one point or several) comes after the multiple choice:
in its section's last step, and last in any step it is in, the next
sitting's second look included. A short or long answer of several points
comes last in its section, after its parts; at its first
meeting the section opens with it and its points to read ("This section
builds to this answer"), so it is never asked cold and never read back: in
a section of one step it waits for the next sitting. Skip the reading
leaves the outline out and asks it cold, with I don't know. A one-point
written card (a calculation) has no outline and follows its worked example. A long answer laid out as
a worked example (tagged or titled as one) is asked as a written question
everywhere a student is asked, and scored; Browse still shows it as the
model answer.

**Working means.** A step only asks about what it showed; no answer is
printed on the card before; no term that spells itself out is asked; no
two-card dead ends.

**Leaving and coming back.** Learn picks up at the card it was left on,
whichever way it is opened again (Back, Learn on the lecture page, a reload
after switching apps), and says so, with Start from the beginning. Today
does the same within the day. Practice modes reshuffle, so they start fresh
unless Continue is pressed (store/resume resumesOnOpen).

### Practice

**Goal.** Study what you choose, the way you choose, outside the plan:
before a quiz, a part that feels shaky, only problems, only flashcards on a
bus. Each answer is marked as it is given (docs/proposals/practice.md).

**How it works.** One page for a lecture and one for a class, each a row
on its page under Today (on the class page it was a link inside a
sentence; the owner, 2026-11-03: "having it hidden is bad").

- **Ready-made** sittings on top, one tap each, with their counts: Due
  now (weakest first), Mistakes, Flashcards (Anki's way: every flashcard
  already met that is due or a mistake, weakest first, then up to ten new
  in the lecture's order; `PracticeChoice.newCap`), and Problems when
  there are any.
- **Choose it yourself**: ticks for the kinds (multiple choice, flashcards,
  written answers, terms, problems; written answers apart from flashcards
  and unticked by default), ticks for which cards (due now, mistakes,
  new, already strong: any of them), ticks for the sections, and for a
  class each lecture with its sections, behind one line ("3 of 12
  sections"). Studies, when there are any: every card, every study's, or
  one study's. Each tick shows how many cards it holds.
- **Order**, one of: Mixed (shuffled, cards on one fact kept apart),
  In order (as taught; a class's lectures one after another, each end
  offering the next), Weakest first. A class mixes its lectures by default
  in the last week before one of its exams and says why ("Mixed because
  Midterm 2 is in 3 days"); a pick holds in the situation it was made in.
- **Start** is pinned to the bottom with the number of cards the ticks
  give, so every tick shows its effect.

Under a lecture's and a section's Practice row are one-tap links per kind
(Multiple choice, Flashcards, Written answers, Terms, Problems: every card
of that kind, in order) and the practice test. A sitting carries its
choice in its link (`?p=`), so Continue and a reload keep it. Choices are
remembered per lecture and per class (`lib/practiceChoice`, the
`practice` session mode).
Mistakes holds a card from its miss until it is got right on a later day
(`isMistake`): a right answer minutes after the miss used to clear it, and
in the simulator such a retry kept nothing for a later day (sim/FINDINGS.md,
2026-10-12). A miss is not asked again within a Practice sitting for the
same reason; Review brings it back a few hours on.

**Working means.** A study is found by the generator's `study:` tag or, in
older lectures, a citation in the card's question or answer (never the
slide excerpt, where image credits live). Progress stays on the lecture's
own cards: in a mixed sitting every card carries its lecture, and its
answer, time, set-aside, mix-up and bookmark go to that lecture; the end
shows each lecture's tree and score. A sitting cut short has reached every
lecture. The count on Start is the sitting Start opens.

### Practice test

**Goal.** Rehearse the exam: find out whether you are ready, the way the
exam will ask, with nothing marked until it ends. Studying with each answer
marked as you give it is Practice's job (docs/proposals/practice.md: one
use each; the owner, 2026-11-03: "a practice test that doesn't show u
answers right after and maybe it has u timed or smth but u can still
customize what shows on it").

**How it works.** Only medium and hard MCQs (a question with no
difficulty counts as medium); problems and written questions too only when
ticked under On it, which lists the kinds the lecture or class has
(Multiple choice ticked alone by default; the owner, 2026-10-26: "BY
DEFAULT ONLY MULTIPLE CHOICE"). A problem of any difficulty: an easy one
is still worked, never recognised. A problem whose answer the app checks
is typed, its unit beside the box (it asks for a number it can read before
moving on); one checked against its steps is asked as a written question,
its steps the points to tick. No steps as hints in a test. From: the
sections of a lecture, or the lectures of a class, ticked (folded, all by
default); also a lecture's or a class's studies, everything an exam
covers, or a whole class, from the links that open it. 20, 40 or all. Over
several lectures, 20 or 40 are shared by each lecture's size, or equally if
the student picks Each the same. Timer: None (the default) or Timed, with
the minutes suggested from what is on it (1¼ a multiple choice, 3 a
problem, 5 a written answer, rounded to 5) and changeable. The time left
shows beside the count, red in the last minute; at zero the test ends and
is marked, as an exam is collected. A timed test left and reopened keeps
its time running, and is marked on return if it ran out.
Like a paper test (the owner, 2026-11-03: "mark questions to go back to and
let u swap between questions … with pages u can flip between irl"): the
question count ("Question 5 of 20 ▸") opens every question by number,
answered in ink, the rest faint, and any can be turned to; Mark to come
back to puts a "?" beside one, kept if the test is left. Ending with any
blank or marked shows them first (Before you hand it in: "2 not answered ·
1 marked"), to go back to one or end; time running out hands it in as it
is.
Answers are given at the end, always: nothing is marked while it is taken,
and an answer can be changed (feedback held to the end of a test teaches
as well as or better than feedback after each answer, and any feedback
beats none: docs/evidence.md). The setup says where marking as you go is:
"Want each answer marked as you give it? That is Practice." The end gives
the score, each section weakest first, and every miss with its reasons and
the passage; a written answer is ticked point by point there first, and a
missed one shows each point ✓ or ✗; a missed problem names the mistake
behind the answer when the lecture knows it. A written question left blank
with nothing ticked is not recorded, like a blank MCQ. Retake the missed
ones (untimed).
A new test asks first what was last got wrong (a miss or I don't know, in
a test or anywhere: "Remember, ADAPTIVE", the owner, 2026-10-26), then the
questions never answered in a test, then those answered in one longest ago (`ItemResult.testedAt`, kept across devices by
sync; random within each group, and mixed in the test), so tests taken one
after another work through the pool: two random tests of 20 from 60 shared
a third of their questions (the owner, 2026-10-26). The setup says how many
are new to a test.
A test in progress, and its results, survive leaving and a reload (a phone
reloads the app after switching away) until the student starts a new one.
Answers count as practice once, when the test is marked, so Today knows
what the test found.

### Select all that apply

**Goal.** Make each statement about an idea a judgement of its own, true
or false, so a half-known idea shows: a student cannot strike out three
options and take the fourth (the owner, 2026-11-04: "multi select
questions"; docs/proposals/multi-select.md). Multiple true-false questions
show incomplete understanding and held misconceptions that single-answer
questions miss (Couch, Wood & Knight 2015).

**How it works.** A `multi` item: a question and four to six statements,
any number of them true (`correct`), each with its reason
(`option_rationale`). It says "Select all that apply" and never how many.
Tick the true ones, then Check answer; Not sure and I don't know work as
in multiple choice. Got it only when every true statement is ticked and no
false one is (all or nothing, as a written answer needs every point); each
statement is then marked (ticked and true, ticked but false with why,
"Also true" for one missed), with a count ("3 of 4 statements right"),
the explanation, Why and the passage. In Learn it is with the Apply
questions; in Practice and the practice test it counts as Multiple choice
(the test marks it at the end, the "?" as Not sure). Making a lecture,
"Select all that apply" is its own kind to tick, ticked by default. The
lecture check flags one with no true statement, one naming an option that
is not there, one with every statement true, one without a reason for each
statement, and a lecture whose multis always have the same number true; the
question-quality checks (restated from the notes, cued by "the notes",
sections of recall only) count them as they count multiple choice.

### Flip cards

**Goal.** A flashcard you check yourself, graded as honestly as the student
can: knowing it cold, only just, or not at all are three different things
to schedule (the owner, 2026-10-29: Anki's "say how sure you were about ur
answer").

**How it works.** The question, Flip (or Space), the answer under the
question, then Got it · Hard · Missed it (G, H, M), Got it and Missed it
where they always were. Hard is right but shaky: it grows the card's
memory half as much as Got it, and a first Hard holds a day where a first
Got it holds two (`lib/memory` Grade). Under each button, when the card
would come back ("in 14 hours", "in 4 days", worked out from the same
rule that schedules it, an exam near included; in Learn a miss says
"again this sitting"). No Easy: the simulator found it gave a student who
grades well nothing and cost one who grades kindly, while Hard won back
most of what a near miss called Got it costs (sim/FINDINGS.md,
2026-11-03). A Hard is logged with the answer, to check on real answers.
I don't know shows the answer and counts as a miss.

**Working means.** In Learn, Today, Review and Practice alike; a card with
numbered points is a written answer, not a flip card; the three labels
differ on a card's first answer.

### Written answers

**Goal.** Practise the questions an exam asks you to write (short and long
answers, a worked calculation) by writing them, not by flipping a card.

**How it works.** A flashcard whose back is numbered points, "(1) … (2) …",
or that is tagged `short-answer`, `long-answer` or `assignment-style`, is
asked as a written answer wherever it comes up (Learn, Today, Practice).
Write the answer in the box, or answer in your head, then Show the answer:
what you wrote stays above the model answer, and you tick each of its
points you made. Every point ticked counts as got it; fewer counts as a
miss and comes back sooner. A card with one point asks Got it or Missed it.
Numbers tick points, Enter is Done (lib/answerPoints, FlashcardCard).

**Working means.** A point is never split mid-sentence; a number inside a
point ("2) hours") does not start a new one; an ordinary flashcard stays a
flip card.

### Worked problems

**Goal.** Practise what an exam has the student work out (a calculation,
code to trace or write, a reaction to predict, a proof) by working it, in a
class built on methods rather than facts (the owner, 2026-10-29: a computer
science student found the app "mainly good for multiple choice", not for
"software development classes or math centered classes").

**How it works.** A `problem` item (schema `ProblemItemSchema`, card
`ProblemCard`): the question as an exam sets it, the code it asks about in
a fixed-width block, and the worked steps. Made by default wherever the
material teaches a method to carry out, at least one per worked example on
a new case; a lecture with no method gets none. The student works it on
paper or in their head, then:

- **A number** (its unit beside the box) is checked as typed: "1.2e-3",
  "1.2 × 10⁻³", "3/4", "2π", "x = 4", a unit after it or not. Right within
  1% (a problem can set its own tolerance) or as the answer rounded to the
  places typed, from two significant figures ("1.7" for 1.738, never "2")
  (`lib/problemAnswer`).
- **A short exact answer** (what code prints, a name, "O(n log n)") is
  matched without case, spaces, quotes or a closing full stop, against its
  other accepted forms too.
- **Anything else** (an expression, a structure, a proof, code to write):
  Show the solution, then tick each step the working got right; every
  step is got it, as a written answer's points.

Stuck, "Show the first step" gives the worked steps one at a time, never
the last; right with a step shown counts as not yet, so it comes back
sooner, to do alone. A wrong answer that a known mistake leads to says
which ("Where that answer comes from: the time was not squared"). After
every answer: the verdict, the whole solution, the method in a sentence,
the passage (open after a miss), and for a checked answer "I was right,
count it", as a typed term has. I don't know shows the solution as a miss.
Code in any card's text is set as code: `inline` in backticks and lines of
code between ``` lines, exactly as written (`RichText`); never read as
markup.

**Working means.** A right answer typed any reasonable way is right; a
wrong one is never counted right by rounding; nothing typed that the
checker cannot read counts at all ("Type the answer as a number"). Each
problem's answer is one its own steps reach, or the lecture check says
so. A lecture with code in its strings reads, pasted or uploaded.

### The memory model and review

**Goal.** Bring each card back when it is about to be forgotten.

**How it works.** Each card's memory is R = exp(−t/S); it is due below
0.75. A right answer grows S more the more had faded; a flip card's Hard
grows it half as much (Flip cards). A miss resets to the strength of first
learning and is due again after about 3 hours. The forgetting rate is fitted to the student's own
answers as they build up, starting from the default (`lib/personalScale.ts`),
and card times are measured on the device.

**Waiting on the owner's study log (back burner):** calibrating the model
and forecast, re-checking the 3-cards rule, weighting by importance, and
measuring where repetition comes from.

### Exams and classes

**Goal.** Plan for the exam the student actually has.

**How it works.** A class is the class code its lectures share. A class can
have several exams, each covering some lectures and sections; they are
stored on the lectures, so they sync, back up and share with them. Each
lecture follows the nearest upcoming exam that covers it, and the next one
after that has passed.

### Set aside

**Goal.** Let the student take a card out of study without deleting it.

**How it works.** "Not needed?" under any card: not on my exam, or wrong or
badly written. The Set aside page lists them with Put back; Fix sends the
wrong ones to the AI to rewrite.

## Seeing progress and the material

- **The tree** shows a lecture's state at a glance: a section never opened
  is a bare branch, what is learned is in leaf, what has faded falls. The
  same lecture always grows the same tree (`lib/growTree.ts` holds the
  drawing rules). A leaf falls only for a card once got right that has
  faded to where Review asks it again (`heldShare`): a card missed and not
  yet got right was never learned, and thins the branch through accuracy
  instead, so a section studied today keeps its leaves (the owner,
  2026-11-03, watched one drop them hours after studying it). Choosing a
  branch drops the leaves it has lost since it was last chosen, once
  (`store/fallen`).
- **Progress** shows what is fading and per-section figures, and the
  mix-ups on record: answers that named another term of the lecture
  (`lib/mixUps.ts`), typed or picked from the options. Each brings that term
  straight after the card in Review until the card is right on a later day.
- **Related terms** under a definition, and under a typed term once it is
  answered, are the neighbours the lecture sets beside it: only those the
  lecture defines are shown ("Compare with"), and a tap opens that term's
  meaning under this one, to read the two side by side. They used to be
  buttons that did nothing (the owner, 2026-10-26). The Glossary's "See
  also" jumps to the entry.
- **Browse** is the whole lecture to read and edit; **Glossary** every term
  A to Z; **Plates** the diagrams.

## Data

- **Backup** (Help → Back up everything) saves everything, including the
  study log; restore refuses a newer app's format. Without sync, the
  library says when work has never been backed up, or not for a week with
  new answers since (`lib/keepSafe.ts`; Not now quiets it for 3 days), and
  a restore counts as a backup.
- **Restore** (Help, or the empty library) asks in the app's own sheet,
  never a browser box: the backup beside this device (date, lectures,
  answers, last backed up), naming what the device has that the file lacks,
  with "Back up this device first". A device with nothing on it restores
  without asking. After the reload a toast says what was restored, with
  Undo for 20 seconds, gone as soon as anything is studied; the copy for
  it is kept packed in the tab's sessionStorage. No Undo with sync on, or
  where the browser won't keep that copy, and the sheet says so first.
- **Toasts** sit above the page (and its dialogs) on every screen width.
- **Updates** reach an app left open: it looks for a new version each time
  it comes back into view, and once one is in, reloads where that loses
  nothing (not in a session or the practice test, no dialog open, not
  typing), or on coming back to it, or on leaving the session; in a session
  a toast offers Reload. An iPhone home-screen app otherwise ran a copy
  days old (the owner, 2026-10-26). Help shows the version running
  (`lib/appUpdate.ts`).
- **Storage**: lectures are kept compressed, one key each
  (`lib/packedStorage.ts`), about an eighth of their plain size; the old
  plain form is still read and converted on load, and backups stay plain
  JSON. From 75% full the library warns. When a save does not fit, the
  oldest part of the study log is trimmed (half, then three quarters) and
  the student is told; it is never deleted outright.
- **Sync** is optional (email and password). Per lecture the latest edit
  wins, a deletion counts as an edit; per card the latest answer wins.
- **Share links** hand a lecture to someone else; anything from someone
  else is untrusted (diagrams are cleaned, files are checked on the way in).

## Goals to confirm

Drafted 2026-11-03 for the grading session (docs/prompts/grade-the-app.md),
from CLAUDE.md and the owner's words in docs/ASKS.md. These parts have no
**Goal** line above. Each is a draft until the owner confirms or corrects
it; then it moves into its entry. A grade is only as good as the goal it is
measured against.

- **The library**: open the app and start today's studying in one tap,
  every lecture and class in view as a contents page; no choosing what to
  study unless the student wants to.
- **A lecture's page**: one place to start studying a lecture the right way
  (Today first, then Learn and Practice, each with one clear use) and to
  find everything else about it, without the rest crowding the first
  screen.
- **A class's page**: the lectures of one class, its exams and what each
  covers, and the ways to study across them.
- **The tree**: the reason to come back, made visible: what is held, what
  is fading, which part, at a glance, never guilt.
- **Progress**: what needs the student now (what is fading, where the
  mistakes are) and the way to it, before figures about the past.
- **Browse**: the whole lecture to read straight through and to correct any
  card.
- **Glossary**: any term of the lecture, found in a second, with its
  neighbours to tell it apart from.
- **Diagrams**: the lecture's figures to look at in one place, each with
  what it shows, what to look at in it, and whether it is to know or just
  to picture it. A figure the app has no drawing of is still a plate: it
  says where the real one is in the student's own notes.
- **Help**: the answer to what a student wonders while studying, short,
  found without reading the rest.
- **The first run**: from opening the app for the first time to studying a
  first lecture, with no confusion and nothing to learn about the app.
- **Sync**: the same library, progress and log on every device, nothing
  ever lost or overwritten unseen.
- **Backup and export**: a student's work is theirs and can never be lost,
  even without sync.
- **Share links**: a lecture passed to a classmate in one step, safely.
- **Studies**: where a class's exams ask about empirical studies, every
  card on them found together; where they do not, out of the way.
