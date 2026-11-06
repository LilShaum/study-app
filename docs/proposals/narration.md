# The teacher's narration: giving back what the map knows

The owner, 2026-11-03 (docs/ASKS.md, in full there):

> "the format of slides forces the info to be brief and in bullet points or
> complex diagrams with no explanations. The teacher and lecture fill these
> gaps by narrating it for the students and helping guide the thought
> process … the ai needs to be able to think why certain diagrams were
> shown, as examples to help paint the picture, sometimes to learn/memorize
> and other times just as an example … the bullet points give pieces of the
> picture, but the picture is only really painted when these various details
> are used together to describe something bigger … we want the app to be
> universal"

## 0. How this is decided

1. **What it is for.** A student who never heard the lecture has the
   bullets and the figures, not the sentences that joined them. The file
   and the app say, in the teacher's place: where the lecture and each run
   of slides are going, why a figure is on the screen and how to read it,
   and which two things the slides quietly set against each other.
2. **Who meets it.** Every student, on the Read side of Learn and on the
   section and lecture pages. Read, never answered: it costs attention, not
   taps, so it must be short and never push a question away.
3. **Evidence.** `docs/evidence.md` has nothing for or against framing a
   passage before it is read. A PubMed search (2026-11-05) found nothing
   usable; the one near study gave readers the question stems in advance
   and found no help, and once harm (Kreiner 1996,
   [10.1080/00221309.1996.9921287](https://doi.org/10.1080/00221309.1996.9921287)).
   So the case rests on the owner's reason and on a real lecture, and the
   evidence the app already stands on sets one limit: reading must never
   replace or delay retrieval.
4. **What exists.** The generator already works all of this out in Pass 1
   ("the map") and threw it away: "the map is not part of the output".
5. **Built for any class.** Nothing switches on from one subject. A lecture
   with no figures gets no figure notes and loses nothing.

## 1. What a real lecture showed

The owner's annotated slides of one 44-slide lecture were made into a file
with the prompt as the app hands it out, on Opus 5.5 at high effort
(CLAUDE.md, Models), before any change. The handwriting on the slides is
the teacher's talk, so it served as the answer key: 74 things the notes say
that the slides do not (reasons, everyday cases, how to read a figure,
connections, caveats, extra facts).

- **With the handwriting in front of it, the old prompt already carries
  most of it**, in its explanations: by a keyword check about nine in ten
  of the 74 appear somewhere. The explanations work.
- **What had nowhere to go**, in the generator's own words: the thread
  through the whole lecture; why a slide is built up in two stages and the
  second stage is the point; a set of hypotheses that each re-read the one
  before; a summary slide shown twice as a hinge; how to read a results
  graph the notes say a student should be able to read. The file had two
  diagrams for a lecture that turns on a dozen figures.
- **A student who never went has no handwriting.** That is the case the ask
  is about, and the old prompt has no way to supply the talk at all.

## 2. What the lecture and each section build to

- **A. Reuse `description`.** It already exists, but it is shown as a list
  of contents and written that way; one field with two jobs.
- **B. A field, `builds_to`, on the section and on the lecture.** One
  meaning, shown where it belongs.
- **C. An `explain` pinned first.** No schema change, but an explain is an
  item: counted, set aside, matched to cards by its words, shuffled into
  any mode that takes the section's items. A section's framing is none of
  those things.

**B.** The real lecture's file is why the lecture level is here too: its
thread was the first thing the generator said it could not place.
`builds_to` also carries how a section follows from the one before, which
is the first half of `understanding.md`'s step 3 at no extra cost.

## 3. Figures

- **What to see in it**: a `why` on the figure (one to three sentences:
  why it is shown, what to look at, what its axes and colours stand for).
  Not `caption`, which names the drawing.
- **To know or to picture**: `purpose`, `know` or `picture`, which Pass 1
  already decides. A diagram is read, never scored, so `know` is what lets
  the lecture check say "marked to know, and nothing asks about it".
- **Figures the app cannot draw**: most of a real lecture's (labelled
  plates, photographs, plots). A `graphic` may now stand without an `svg`,
  with `where` saying where it is in the student's own material, by number
  or, with no numbers, by the slide's title. "No diagram provided" is gone.

## 4. Comparisons the slides only imply

Prompt only: an implied comparison gets an `explain` that sets the two side
by side and a question that turns on the difference. A new item type was
rejected: it would ripple through every mode to carry what `explain`
already holds.

## 5. Grounding: the reason, labelled

From bare slides, the talk the owner wants is mostly *why*: the reason a
bullet holds, an everyday case. The rule was "nothing from outside the
source", so it could not be said.

- **Strict**: no reasons. Safe, and the student who never went gets none
  of the why.
- **Free**: the model explains as it likes. The student cannot tell the
  slides from the model, and a wrong reason would be scored.
- **Labelled, never scored** (chosen): a reason, an everyday case or a plain
  gloss of a word the slides use, in an `explain` only, its excerpt opening
  `Outside the slides:`, which the app shows as "Not from your notes". No
  question, flashcard or definition may rest on it, so nothing a student is
  marked on comes from outside their material.

The test: the bare slides alone, new prompt, Opus 5.5. 22 labelled
additions; read against the handwriting, none contradicted what the teacher
said, and several said what the teacher said nearly word for word. The
figure notes read the graphs the way the notes do. This is the owner's
call to reverse if it should be.

## 6. Where the student meets it

- **Learn**: the card that already opens a section with its slide range now
  leads with what the section builds to, and the lecture's first section
  with what the lecture builds to. One card, read once in the section's
  first step, in Learn and in Today's new material; never in a review,
  Practice or the test; Skip the reading leaves it out. An earlier draft put
  it on the end-of-section pause; rejected, because a student who stops
  there reads the framing a day before the material.
- **The section page** leads with it; **the lecture page** shows the
  lecture's.
- **A figure's card and the Diagrams page** show the `why`, the purpose,
  and where the figure is when there is no drawing.

## 7. Cost

- **Reply length**: in the bare run, a section's `builds_to` was about 390
  characters, a figure note about 370. A few per cent of a lecture.
- **Study time**: one more card per section. The simulator found no
  measurable cost under either memory model (sim/FINDINGS.md, 2026-11-05).

## 8. Also decided here: the rest of understanding.md's step 4

- **How each section follows from the last**: in `builds_to`, above.
- **A check for a lecture whose questions are mostly recall**: to be built
  only if a real lecture shows the problem. It did not: of 26 questions
  drawn at random from the real lecture's file, about two thirds made the
  student apply, predict or explain. And the app's own measure of this
  counted only 27% as beyond recall, so a lecture-wide check built on it
  would have flagged a good lecture. Not built; the measure itself is the
  thing to look at, for the grading session.

## 9. Before and after, on the real lecture

Both files from the owner's annotated pages, Opus 5.5 at high effort, the
prompt as the app hands it out, one run each; scored against the 74 things
the handwriting says that the slides do not.

| | Before | After |
|---|---|---|
| Of the 74, somewhere in the file | 66 | 67 |
| On a card the student reads | 50 | 55 |
| How to read a figure, on a reading card | 3 of 15 | 12 of 15 |
| Figure notes | 2 | 24 |
| Questions (multiple choice and flashcards) | 117 | 73 |
| Questions asking the same fact twice | 14 | 5 |
| Reading share of a Learn walk | 40% | 51% |

The narration does what it is for. The cost is the question count: the
after file asked a third fewer, and Learn became half reading. One run each
cannot say how much is the prompt and how much is chance, so a rule went in
that narration comes on top of the cards, never instead of them, and a
second after run is what would show whether the questions came back.

## 10. What would change this plan

- If students skip the opening card, it moves onto the section's first
  reading card.
- If `know` turns out guessed rather than known, the check goes; `why` stays.
- If a labelled reason is ever found wrong where it matters, the rule goes
  back to strict.
