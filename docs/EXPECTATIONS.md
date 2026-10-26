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

**How it works.** The app hands out `prompts/generator.md` plus the
student's notes on what their teacher stressed and, optionally, the lecture
it follows on from. The student attaches their slides to the same message.
The AI reads everything, maps why each slide is there, builds an inventory,
weights each idea, writes items, audits itself, and returns JSON. The app
reads the reply even if it is wrapped in text or cut off.

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
- Every item about an empirical study carries `study:<author> (<year>)`.
- Each wrong option is a mistake a student who studied would make (the
  neighbour, the reversal, the wrong step, another case's answer), from the
  lecture's own terms; at least one is as long as the right answer.
- If the AI can see only the text of the slides, it says so and asks for
  the file attached, rather than generating without the figures.

**Not wanted.** Over-taught basics (twenty cards from one slide), skipped
figures and pathways, definitions of things only named, trivia about how a
figure was drawn.

### Add material

**Goal.** Add later slides to a lecture the student already has, without
repeating it and without dropping what the new slides teach.

**How it works.** The prompt carries the whole generator spec, every item
already in the lecture, its sections, ids and tags. The AI writes only what
is new and returns a fragment the app previews and merges.

**Working means.** A fact is skipped only when an item already tests it at
the same depth. A known topic taught in more depth (steps explained, a
mechanism, exceptions, new parts) is new content and gets the items the
spec asks for. New items join the right existing section.

### More practice

**Goal.** New questions on material the student already has, when the
existing ones are known.

**How it works.** A prompt with the lecture's excerpts and the course
check's gaps as priorities: sparse sections first, thin key terms, an MCQ
mix that is too easy, too few gradable items.

**Working means.** New angles on the same material, never rewordings of
existing cards, and nothing that is not in the notes.

### The lecture check and Fix

**Goal.** Show the student what is wrong or missing in a lecture file,
and get it corrected by the AI that wrote it.

**How it works.** `lib/courseHealth.ts` checks structure (ids, answer
keys), answer-shape give-aways, definitions that name their own term, the
same fact asked twice, MCQs that restate a definition, wrong options with
no reason (`rationale-missing`: Fix writes the reason, or replaces an
option that has none), terms never defined, sections that only test recall, figures the AI could not read,
and sections with far fewer or far more items for their slides than the
rest of the lecture (`lib/sectionDensity.ts`). Fix turns the findings into
a prompt for the same chat, which judges each one against the notes.

**Working means.** Findings are plain, each says what to do, and none
blocks studying. They are grouped by what they ask (`findingGroup`): to
fix (a question answerable without the material), to check on the slides,
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

**How it works.** Steps of at most 12 cards: read a few definitions, type
each term from its meaning, then the flashcards and MCQs on them. Two cards
on one fact are at least 5 cards apart; at most 3 cards on a term at its
first meeting, the rest in a second look at the next sitting (never in the
sitting that taught it). A miss comes back later in its step with the
passage from the notes. A term defined the same way in two lectures counts
once. A section with a slide range can start with "read these slides", then
everything is asked first. "Skip the reading" asks every card first, for
material already met in class. At the end Learn offers the next section.

A card that practises a worked example (most of its words in the example)
comes after the example, never a step before it. Every card asked as
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

**Goal.** Drill outside the plan: before a quiz, or on a section that feels
shaky.

**How it works.** One page: which cards (due now, weakest first,
mistakes, everything) × which kind (questions, flashcards, typed terms) ×
which part of the lecture: a section, or its studies (every card about an
empirical study, or one study; `lib/studies.ts`). A class page has the same
Practice across all its lectures, where the part is a lecture or a study.
Over several lectures, Lectures chooses how: One at a time runs them in
turn, each end offering the next; Mixed together puts them in one sitting,
each lecture's cards in its own order spread through it
(`lib/mixLectures.ts`), for telling apart ideas from different lectures.
Mixed together is the default in the last week before one of the class's
exams (the owner, 2026-10-19; `lecturesFor`, `examSoon`), and the line
under Start says so ("Mixed because Midterm 2 is in 3 days"); One at a
time otherwise, since the evidence favours mixing for alike material and
not for unrelated material or words (`docs/evidence.md`). The simulator,
whose student cannot confuse two ideas, finds mixing level over a finished
sitting and reaching every lecture in a short one (`sim/FINDINGS.md`,
2026-10-18). A pick holds in the situation it was made in: one made weeks
before does not keep exam week one at a time, and one made in exam week
does not outlast the exam.
On the lecture page, Today, Learn and Practice each carry one line on what
they are for, and under Practice, and under a section page's Practice this
section, are direct links: Multiple choice, Flashcards, Terms (every card of
that kind in the lecture or section, started at once) and Practice test
(the owner looked for "just flashcards" and "just multiple choice" for
weeks; they were a Kind choice inside this page). Multiple choice chosen as
the kind is always asked with its options; elsewhere a question answered
right before comes back typed.
Under the Cards row, a line says what the picked choice is for (`CARDS`
use): each has one use the others lack. Due now is Today's review alone;
Weakest first is every card, least known first, for extra time; Everything
is every card shuffled, studied or not, for a student who reads the slides
and then answers (a first miss counts like reading, sim/FINDINGS.md
2026-10-12).
Mistakes holds a card from its miss until it is got right on a later day
(`isMistake`): a right answer minutes after the miss used to clear it, and
in the simulator such a retry kept nothing for a later day (sim/FINDINGS.md,
2026-10-12). A miss is not asked again within a Practice sitting for the
same reason; Review brings it back a few hours on.
Choices are remembered per lecture and per class. It says plainly that
cards not yet fading gain little. The count beside each choice is cards to
answer; under Start, a line says what the sitting holds when that differs
(cards to read along the way, such as worked examples, and Due now fitted
to the daily time, the end offering the rest), worked out by the same call
the session makes (`lib/practice.ts` sittingSize).

**Working means.** A study is found by the generator's `study:` tag or, in
older lectures, a citation in the card's question or answer (never the
slide excerpt, where image credits live). Progress stays on the lecture's
own cards: in a mixed sitting every card carries its lecture, and its
answer, time, set-aside, mix-up and bookmark go to that lecture; the end
shows each lecture's tree and score. A sitting cut short has reached every
lecture.

### Practice test

**Goal.** Check understanding the way an exam does.

**How it works.** Only medium and hard MCQs and written questions (see
Written answers; a question with no difficulty counts as medium), drawn at random from a lecture, a section, a lecture's
or a class's studies, everything an exam covers, or a whole class; 20, 40
or all. Over several lectures, 20 or 40 are shared by each lecture's size,
or equally if the student picks Each the same. No feedback until the end;
then the score, each section weakest first, and every miss with the
answer, why the pick was wrong, and the explanation. With written
questions, ending the test first lists each one's answer beside the model
answer's points to tick (right only with every point); the score follows,
and a missed one shows each point ✓ or ✗. A written question left blank
with nothing ticked is not recorded, like a blank MCQ. Retake the missed
ones.
A test in progress, and its results, survive leaving and a reload (a phone
reloads the app after switching away) until the student starts a new one.
Answers count as practice once, when the test is marked, so Today knows
what the test found.

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

### The memory model and review

**Goal.** Bring each card back when it is about to be forgotten.

**How it works.** Each card's memory is R = exp(−t/S); it is due below
0.75. A miss resets to the strength of first learning and is due again
after about 3 hours. The forgetting rate is fitted to the student's own
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
  drawing rules).
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
