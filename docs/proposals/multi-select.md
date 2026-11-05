# Multi-select questions ("select all that apply")

The owner, 2026-11-04: "i had an idea i really want implemented … multi
select questions". On 2026-11-05: "Ready".

## 0. How this is decided

1. **What it is for.** A question with several right answers makes each
   option a judgement of its own: true or false, about this idea. A
   student cannot strike out three options and take the fourth; they must
   know each statement. That is the owner's "everything but one little
   detail right" and their misconceptions (CLAUDE.md, Understanding), one
   statement at a time. Evidence: multiple true-false questions "allow a
   more detailed assessment of student understanding than the traditional
   multiple-choice format", and showed students holding wrong conceptions
   single-answer questions missed (Couch, Wood & Knight 2015,
   [10.1187/cbe.14-04-0071](https://doi.org/10.1187/cbe.14-04-0071)).
2. **Who meets it.** Every way a question is asked: Learn, Today, Review,
   Practice, the practice test; with I don't know, Not sure and Why.
3. **What bears on it in the code.** Multiple choice is handled in about
   90 places across 30 files, each assuming one right answer. A lecture
   file with an item kind the schema does not know is refused whole.

## 1. The item: a new kind, or multiple choice with several answers

- **A. Extend `mcq`** with a list of right answers. Most paths keep
  working, but every one of them assumes a single answer (the lecture
  check, Even out, option order, mix-ups). An old copy of the app (an
  iPhone keeps one) would mark the question as if `correct_index` were the
  only answer: wrong marks, silently.
- **B. A new kind, `multi`.** Paths that do not know it leave it alone
  until taught. An old copy refuses the lecture until it updates, which the
  app does when it comes back into view (lib/appUpdate), as when `problem`
  was added.

**B.** A refusal that fixes itself on update beats wrong marks nobody
sees.

```
{ "id", "type": "multi", "question", "options": [4–6 statements],
  "correct": [indices of the true ones], "option_rationale": [one per
  option: why it is true, or why it is false], "explanation"?,
  "difficulty", "tags", "source_excerpt" }
```

## 2. How it is marked

- **All or nothing for the memory model.** Got it only when every
  statement is judged right: the true ones picked, the false ones not.
  The app already asks that of a written answer (got it only with every
  point), and a part-right answer to a question about one idea means part
  of the idea is not known. The simulator's lectures have none, so the
  suite does not move.
- **Each statement marked for the student**: picked and true ✓, picked
  and false ✗, true but not picked ("also true"), each with its reason;
  and "3 of 4 statements right" so a near miss reads as one.
- **The number of true statements is not given.** "Select all that
  apply", as exams ask. Giving the number turns it back into elimination.
- **I don't know, Not sure, Why** as for multiple choice. In the practice
  test, marked at the end, with the "?" as Not sure.

## 3. Where it goes

- **Learn**: Apply, with the medium and hard multiple choice: judging
  several statements is harder than picking one.
- **Practice**: under the Multiple choice kind (one kind of thing to the
  student: options to pick from), and in the test's On it.
- **Making a lecture**: its own tick ("Select all that apply") on the New
  lecture and Add questions screens, ticked by default, so a student who
  does not want them gets none (CLAUDE.md, Making a lecture).

## 4. What the generator writes

A `multi` where an idea has several things true of it that a student
could confuse: the properties of one structure, what a mechanism does
and does not do, which of a set apply to this case and not its
neighbour. Each false statement is one of the wrong-option kinds
(section 3 of the prompt): the neighbour's property, the reversal, the
qualifier swap, the one detail off. Four to six statements; vary how many
are true across a lecture (never always two), at least one true and at
least one false. One reason per statement. Where the source gives only
one fact to know, an `mcq`, not a `multi`.

## 5. Build

1. Schema, the card (checkboxes, Check answer, Not sure, I don't know,
   each statement marked with its reason, Why), every session mode, the
   practice test (answer kept as a list, marked at the end, its review),
   Learn's placement, Practice's kind, the New lecture tick, a made-up
   test lecture with some, tests.
2. The generator prompt (section 4 above) and the lecture check (a `multi`
   whose `correct` is empty, names no option, or covers every option; a
   lecture whose multis always have the same number true).
3. Docs: EXPECTATIONS, Help.

The app code (1) goes to one agent on Opus 5.5 with this plan as its spec;
the prompt and the check (2) are written alongside, then everything is
reviewed together, checked and shipped.

## 6. What would change this plan

- If the owner wants part credit, the score shows it but the schedule
  stays all-or-nothing unless the simulator finds otherwise.
- If "never always two true" turns out a cue in real lectures, the
  lecture check counts it.
