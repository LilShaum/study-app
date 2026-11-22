# The ways to study, as one system

For the owner. Questions at the bottom.

The ask (2026-11-22): before the adaptive quiz is built, audit the whole
app so every way to study "has its own place and use case" and nothing
feels "staple[d] on one after the other with overlap causing confusion of
which to use when", in how each works and how it looks. And the owner's
complaint about earlier audits: they "kept focusing on the smallest things
that didnt matter". So this audit is about the shape only: which doors
exist, which job each does, and where a student is unsure which to press.
Spacing, wording and colours are out of scope here.

## How to decide

**The test.** Follow one student through a term and ask, at each moment,
"which button do I press?". If the answer is not obvious, or two buttons
answer it, that is a fault. The moments:

1. **After a lecture**: I have new slides and want to learn them, beside my
   notes.
2. **Most days**: I have twenty minutes on a bus and want to keep what I
   have learned.
3. **A few days before an exam**: I want to be tested across the exam's
   lectures, adaptively, until I stop.
4. **When I have a specific need**: only flashcards, only one section, only
   my mistakes, only problems.
5. **Rehearsal**: an exam-like test, marked at the end.
6. **Opening the app**: what should I do today?

**The evidence.** The owner's words (CLAUDE.md, ASKS), the app as it is
(below), and what the simulator found about daily study (extra same-day
review buys little; review is worth most when it is due).

## What there is now

| Door | Where | Its job as built |
|---|---|---|
| Today (library) | One Start "All N lectures", then a row per lecture | The day's minutes split across every lecture by how soon each exam is; review first, then new material through Learn's steps |
| Today (class page) | Class page | The same, for one class |
| Today (lecture page) | Lecture page | The same, for one lecture |
| Learn | Lecture page | A section at a time, in the slides' order, beside the notes |
| Practice | Lecture and class pages | Ready-made sittings (Due now, Weakest first, Mistakes, Everything, Flashcards, Problems) and "choose it yourself" ticks |
| Practice test | Lecture and class pages, and in Practice | Exam rehearsal, marked at the end |
| Adaptive quiz (planned) | Lecture and class pages | Continuous: new, missed, faded and unsure mixed, planned in tens |

## What is wrong, in order of how much it matters

**1. Today is three things at once, and the library's version helps nobody.**
The library's Today asks the student to study every lecture they own, every
day. The owner: "there will never be a day when I need to review everything
I have, or even want to do so." Its row per lecture splits one daily time
across all of them, so each lecture's share shrinks as the library grows:
"the more lectures you have the less time it is per lecture, which is
stupid." And Today's new material is Learn's steps under another name, so a
student who wants to learn a new lecture has two doors that do it.

**2. The daily habit has no clear home.** The owner's picture of Today is
Duolingo: open it anywhere, study a bit, come back for what is fading. That
habit is review. Today mixes review with new material and a minutes plan;
Practice's Due now is review alone; the planned quiz mixes review with
misses and new cards. Three doors answer moment 2.

**3. Practice's ready-mades overlap the quiz.** Due now, Weakest first and
Mistakes are each one ingredient of the adaptive quiz. Once the quiz exists,
they are three more doors to the same place.

**4. The library tells you nothing about what to do.** It lists classes and
a Today that is wrong for most days. Moment 6 has no good answer.

What is not wrong: Learn has one clear job (moment 1) and the owner likes
it; the practice test has one (moment 5); Practice's "choose it yourself"
has one (moment 4).

## The options for the daily habit and the quiz

**A. The adaptive quiz becomes the way to keep what you have learned, and
Today becomes a suggestion, not a mode.**
- Learn: new material, beside the notes (moment 1).
- **Quiz** (the adaptive quiz): everything already met, faded and missed
  first, the rest mixed, as long as you want (moments 2 and 3). On a day
  with nothing new met, it is pure review; near an exam, it draws across
  the exam's lectures.
- Practice: exactly what you pick, and the practice test (moments 4, 5).
- **Today on the library**: a short list of suggestions, each one tap into
  one of the above (moment 6). See below.
- For: one door per moment, and the Duolingo habit gets the mode built for
  it. Today's split-minutes problem disappears because Today no longer
  plans minutes across lectures. Practice's Due now, Weakest first and
  Mistakes go, since the quiz does all three.
- Against: the most change. The simulator found Today's planned stop
  matters (more review on the same day buys little), and a quiz with no
  end invites over-reviewing. Answer: the quiz says when what is due is
  done ("Everything due is done. Carry on, or stop here") and its review
  share falls once nothing is due.

**B. Today stays the daily mode; the quiz is the pre-exam mode.**
- For: least change; Today's minutes plan is kept.
- Against: the library's Today problem stays unless Today is reworked
  anyway; moment 2 keeps two doors (Today and Practice's Due now); the quiz
  overlaps Today whenever something is due.

**C. The quiz goes inside Practice, as its default.**
- For: no new door.
- Against: the owner, 2026-11-03: "having it hidden is bad". And Practice's
  job is choosing exactly; the quiz's job is not having to choose.

**A wins.** It is the only one that gives each moment one door, and it
fixes the library's Today at the root (Today stops being a minutes plan
across lectures) rather than patching the split. B keeps the overlap the
owner named; C hides the mode the owner asked for.

## Today on the library, as a suggestion

Not a Start for everything. Two to four lines, ranked, each a link into a
mode, chosen from what the app already knows (exams, what is fading, where
Learn left off, what is new):

- "BIOL 365: 23 fading, midterm in 4 days. **Quiz**, about 15 min"
- "PSYC 351: Lecture 6, section 3 of 5. **Carry on in Learn**"
- "PSYC 351: Lecture 7 not started. **Learn**"
- (near an exam) "BIOL 365 midterm Friday: **Practice test**"

Rules:
- An exam soonest comes first; within a class, what is fading before what
  is new.
- A class with nothing fading and no Learn under way is not listed.
- Time is an estimate per line, never a share of a daily total.
- The daily time setting goes from the library; a suggestion's estimate
  comes from the measured pace.

The class page gets the same idea for one class; the lecture page keeps
its three doors (Learn, Quiz, Practice) with the lecture's own line on top.

## What changes, in order

1. **The library's Today becomes suggestions** (the owner's most direct
   complaint; small, and useful before anything else changes). The class
   page's Today the same.
2. **The adaptive quiz** is built (docs/proposals/zen.md), named **Quiz**
   on the pages, with "Everything due is done" when what was due is
   finished. The simulator checks it against Today on what lasts.
3. **Today's sitting retires** once the quiz holds its review part: a
   lecture's page offers Learn, Quiz, Practice. Practice's Due now, Weakest
   first and Mistakes go; Flashcards, Problems and "choose it yourself"
   stay.
4. **Copy and layout pass** on the three pages so each door says its one
   use in a few words, no more (the explainer-text cut, applied to the new
   shape).

Each step ships on its own and is checked on a phone as a student uses it.

## Questions for the owner

1. **The shape**: A (Learn, Quiz, Practice, with Today as suggestions on the
   library), or B or C?
2. **The name**: on the pages, "Quiz" (short, and the job is clear from the
   three together), or "Adaptive quiz"?
3. **Step 1 first**: rework the library's Today into suggestions now, before
   the quiz is built?
