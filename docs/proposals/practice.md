# Practice, the practice test and flashcards: one job each

The owner, 2026-11-03, on the class Practice page: boxes to tick instead of
one-of choices, sections ticked in or out, a Practice that is easy to find,
and Practice and the test repositioned against each other (a test that
"doesn't show u answers right after and maybe it has u timed", and a
Practice to "study whatever you want however you want"). "I'm not 100% sure
about my suggestions so think it through." On 2026-10-29: a flashcards-only
section like Anki, with its spaced repetition, its card structures, and
"say how sure you were about ur answer or how fast u got it". On the
test's default: "depends how you pull all this off".

## 0. How this is decided

The plan of the plan, before any option:

1. **Name the jobs a student brings**, apart from the daily plan. A door
   is justified by a job, never by a feature.
2. **Give each job one door.** The owner's rule (CLAUDE.md): two ways to
   study that do the same job are a gap.
3. **Then design each door**: its choices, defaults and where it is found.
4. **Judge every option against the same things**: one clear use; built
   for any class; what the evidence says (docs/evidence.md); phone first,
   easy as Duolingo; adaptive; Learn unchanged.
5. **Anything that changes the memory model goes through the simulator
   first** (sim rule 8: if the policy does not move the numbers, the screen
   will not either).

What exists now, read from the code (2026-11-03):

- A lecture's page lists Today, Learn and Practice, with one-tap links under
  Practice (Multiple choice, Flashcards, Terms, Problems, Practice test).
- A class's page lists Today; Practice is a link inside a sentence under it,
  and the practice tests are links beside the exams. This is the "hidden"
  the owner meant.
- The Practice page: Cards (due, weakest first, mistakes, everything), Kind
  (all, or one of multiple choice, flashcards, terms, problems), From (one
  section, or a study), Lectures (one at a time, mixed). Every row is one
  choice.
- The practice test: medium and hard multiple choice, written answers and
  problems when chosen, 20, 40 or all, answers as you go (default since
  2026-10-26) or at the end, adaptive draw (misses first).
- Flip cards are graded Got it or Missed it, in every mode.

## 1. The jobs

| Job | When | Door now |
|---|---|---|
| Keep up, a bit every day | Every day | Today |
| Meet a lecture for the first time, in order | After the lecture | Learn |
| Study this, now, my way: before a quiz, a part that feels shaky, only problems, only flashcards on a bus | Any time | Practice |
| Find out whether I am ready, as the exam will ask | Days before an exam | Practice test |
| Drill flashcards the Anki way: quick, rated by how well I knew it | Any time | none |

## 2. Which door for which job

**A. Keep the doors, add ticks to Practice.** Least change. But Practice
and the test keep doing one job: pick questions, get right or wrong after
each. The owner noticed exactly this. Fails the one-use rule.

**B. Practice studies, the test rehearses.** Practice takes every
study-now use, with each answer marked as it is given (studying wants the
answer at once). The test becomes the exam rehearsal: no answers until it
ends, a timer if wanted, its content still chosen. What argues for it:

- It ends the overlap: as-you-go marking is Practice's job; the test is the
  one door that behaves like the exam.
- It costs no learning. Feedback held to the end of a test taught as well
  as feedback after each answer, or better (Butler, Karpicke & Roediger
  2007; Metcalfe, Kornell & Finn 2009: better for children, equal for
  students once the gap to the final test is equal), and either beats none
  (Butler & Roediger 2008). docs/evidence.md.
- The owner's 2026-10-26 ask ("tell you right away") was made when the test
  was the only door to exam-style questions marked as you go. Practice now
  gives that, with the test's strengths moved in: harder questions,
  problems, the weakest first, a score at the end.

Against: it takes "as you go" out of the test, which the owner asked for.
The test setup says where that went ("Marked as you answer? That is
Practice.") and carries the same choices there.

**C. One page with a Study / Exam switch.** One door to find. But a switch
that changes everything about a sitting is two doors behind one, and it
buries the test, which a class page now offers per exam ("Midterm 2"),
the most useful entry it has.

**Decision: B.** And flashcards are not a third scheduler (section 5).

## 3. Practice

### What can be chosen, and which become ticks

The owner asked for ticks "for certain parameters". A tick makes sense where
the choices combine into a bigger set; a one-of choice where they are ways
of doing one thing.

| Choice | Ticks or one-of | Why |
|---|---|---|
| Where: the sections (a lecture), the lectures and their sections (a class) | Ticks | "tick off specifically which sections to do or not" |
| Kinds: multiple choice, flashcards, written answers, terms, problems | Ticks | "choosing which question types you want" |
| Which cards: due now, mistakes, new, already strong | Ticks | They combine: due and mistakes; due and new is Anki's day |
| Order: mixed, in order, weakest first | One-of | Ways of ordering one list |

Weakest first was a kind of card; it is an order. "Lectures: one at a
time / mixed together" is the same question as order (in order, mixed), so
it folds into Order and the class page loses a row. Mixed stays the default
in the last week before one of the class's exams, as now.

Written answers become their own kind, apart from flashcards: a student
asking for flashcards does not want "write the answer" cards (the owner:
"I NEVER TOLD YOU TO ADD WRITTEN ANSWERS", about the test).

### How it is laid out on a phone

Two ways to lay out many choices:

1. **Every row open.** Everything visible, but a class with 5 lectures and
   40 sections is a page of ticks before Start.
2. **Ready-made sittings on top, the rest folded.** One tap for the common
   cases, the full set open below.

Option 2, with Where folded behind one line ("All 5 lectures ▸", "3 of 12
sections ▸") and Kinds, Which and Order as short rows of ticks. Start is
pinned at the bottom with the count of cards it gives, so a change shows
its effect at once.

Ready-made sittings: Due now · Mistakes · Flashcards (section 5) ·
Problems (when there are any). A tap starts it; holding the choices it set
means "Choose it yourself" opens on them.

### Where it is found

The class page lists Practice and the practice test as rows under Today,
each with its one line of use, as the lecture page does. Wider navigation
(a bar across the app) belongs to the design audit, not here.

## 4. The practice test

| Choice | Decision | Argued |
|---|---|---|
| Answers | At the end, always | Section 2 |
| Timer | Off, or a time | Exam pacing is part of being ready, but nobody's exam has the same pace, so the time is the student's (suggested from the questions: 1¼ min a question, 3 a problem, 5 a written answer). Run out: the test ends and is marked, as an exam is. A soft timer that never ends was weighed and dropped: a rehearsal that does not stop is not timed |
| What goes on it | Ticks for where (as Practice) and kinds (multiple choice, problems, written answers) | Same component as Practice; multiple choice alone by default, as the owner set |
| Length | 20, 40, all | Unchanged |
| Order of questions | Adaptive, as now | Misses first, then never on a test |

The end is unchanged: score, by section, every miss with why, retake the
missed. A test left and reopened keeps its time left.

## 5. Flashcards, the Anki way

What Anki has that the app lacks, from the owner's words: (1) "how sure you
were … how fast you got it": four buttons after the answer; (2) its card
structures; (3) a deck you just drill, the due ones and a few new.

**Its own scheduler (an Anki deck inside the app).** Rejected: the same
card would be due by two schedules, and Today would plan around a review
the deck had already done. Today already is spaced repetition across every
kind of card.

**The four buttons everywhere a card is flipped.** Got it now covers
"knew it cold" and "got there in the end", the kindest grade in the app
(docs/ASKS.md). Missed it · Hard · Got it · Easy, each with when the card
comes back ("tomorrow", "4 days"), as Anki shows. Hard grows the card's
memory less than Got it, Easy more. In Learn too: it does not change how
Learn teaches, only how a flip is scored. This changes the memory model,
so it is modelled in the simulator first: a student who grades well, and
one who calls a shaky recall Easy. It is built only if the well-graded one
gains and the over-confident one loses little.

**The flashcards sitting** is a ready-made Practice: flashcards only, due
first, then new ones up to ten a sitting (Anki's daily new limit, per
sitting so a second sitting can take more), the four buttons. One memory,
one schedule, the Anki way of using it.

**Card structures.** Anki's basic, reversed and cloze cards. Basic and
reversed exist (a flashcard, and a definition asked by typing the term).
Cloze, a sentence with a blank, is a flashcard whose front has the blank;
the generator can write those now. A typed cloze card (checked like a
term) is left for later: it is a new item type, and nothing yet shows the
flip cards fall short there.

Response time ("how fast you got it") is already recorded per card. Using
it to temper Easy (Mettler et al. 2016 scheduled on time as well as
accuracy) waits on the study log.

## 6. Build order

Each phase ships on its own, tested and live:

1. **Practice**: ticks for where, kinds and which; order; written answers
   as their own kind; ready-made sittings; Start pinned with its count; the
   class page's rows. The old Practice links keep working (`/practice`, the
   kinds under a lecture).
2. **The test**: answers at the end; the timer; ticks for where and kinds;
   the line pointing to Practice.
3. **Graded flips**: simulator first; then the four buttons and the memory
   model.
4. **The flashcards sitting** as a ready-made Practice.

## 7. What would change this plan

- If the owner misses as-you-go marking in the test after trying Practice,
  it comes back as a choice, not a default.
- If the simulator finds graded flips cost an over-confident student much,
  the buttons stay two and Easy is dropped.
