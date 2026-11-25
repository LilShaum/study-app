# Continuous adaptive quiz: the master prompt as a way to study

For the owner. Questions at the bottom.

The ask (2026-11-20): "a zen/continuous/mahoraga mode that gives questions
in batches of 10 and adapts to give questions that are things you haven't
learned yet, things you got wrong on the last quiz, or things gotten wrong
in the past or things that need to get reviewed: based on quiz prompt."
The quiz prompt is the owner's "AI Quiz Master Prompt" (the Adaptive
Mastery Tutor v2.0), the last of many versions from their first year of
studying with AI. It is where Arborous came from (CLAUDE.md: "grown from
the owner's first-year master prompt"), so its rules are the owner's
tested choices, not a first draft.

## How to decide

1. **What it is for.** Study for as long as you have, with no plan to
   keep to: the app picks the next ten from where you are, the way the
   master prompt did in a chat. Test first, with the lesson in the
   feedback.
2. **The test it must pass.** "Every way to study has one clear use"
   (2026-10-21). Two modes doing one job is a gap. So it must be clear
   what Zen does that Today, Learn and Practice do not, or it must become
   part of one of them.
3. **Evidence.** The master prompt itself; what the app already does
   (Today, Learn, Practice, the memory model); the simulator's findings
   (sim/FINDINGS.md); the learning science already in docs/evidence.md.
4. **Who meets it.** A student with an evening and a lecture or class to
   get through. They may never have opened the slides. They may be on a
   bus with ten minutes.

## What the master prompt does, and what the app has for it

| Master prompt | In the app today | Gap |
|---|---|---|
| A Learning Map: chunks in the slides' order, foundational to complex | Sections in order, the tree | None |
| Stage 1 (what, which) then Stage 2 (why, how, what if) per chunk; mastered = both passed | Learn's Recall then Apply phases (`phaseOfItem`) | No per-section "stage passed" state |
| Batches of 15, evaluated, then a map and weak spots, then "ready" | Learn's steps of up to 12 with a pause | Learn's steps teach first; no map at the pause |
| Re-test last quiz's misses first, freshly rephrased, on top of the quota | Learn re-asks a miss a few cards on, same card | Not in the next batch; not rephrased |
| Forward progress: current chunk, then its Stage 2 (vertical pull), then the next chunk (horizontal pull) | Learn goes section by section | Learn finishes a section before the next |
| Part B: up to 5 slots of Stage 2 questions from mastered chunks, SR-Due first | Today's review, by the memory model | Today puts review first, not mixed into new |
| `~` hunch, `idk` (teach if unseen, a miss if it should be known) | Not sure, I wasn't sure, I don't know | None |
| Never move backward; hammer the weak spot | Misses come back until right; Mistakes | None |
| No hand-holding: even option lengths, plausible distractors, no telegraphing | The generator prompt and the lecture check | None |
| Commands: !skip_chunk, !repeat, !explain, !weak_spots, !status | Set aside, the lecture page, Progress | Mostly covered; "I know this section" is not |

So almost every piece exists. What does not exist is the **loop**: test
first, in batches, new and review mixed in one batch, the map between
batches, with no end.

## The options

**A. A fourth way to study, Zen, beside Today, Learn and Practice.**
- For: it is exactly the asked thing, and its own door says what it is.
  The batch rhythm and the map between batches are a different feel from
  Today's single planned sitting.
- Against: it overlaps Today most of all. Today already mixes "what is
  fading" with "new material", and its "Keep going" carries on after the
  plan. A fourth door is a door more on every lecture page.

**B. Today, run as Zen: batches of ten with the map, and "Keep going" as
the next batch.**
- For: no new door. Today becomes the master prompt, which is where it
  came from.
- Against: Today's job is "the best use of the time you have today". It
  is planned in minutes and stops on purpose, because the simulator found
  extra same-day review buys almost nothing. Zen's job is the opposite: no
  plan, keep going. Putting both in one button muddies both. Today also
  teaches new material through Learn's steps, reading first, and Zen is
  test-first.

**C. A ready-made sitting in Practice ("Continuous").**
- For: Practice is "study what you choose, outside the plan", and a
  continuous mix fits under it. No new door.
- Against: Practice sittings are fixed lists picked from ticks. Zen
  adapts between batches and carries a map, which a fixed list cannot.
  It would be the most hidden place for it, and "having it hidden is bad"
  (2026-11-03).

**D. Zen replaces Learn's "Skip the reading" setting.**
- For: that setting is already "test first", and it overlaps the "I've
  read it" button (the owner asked about this on 2026-11-17). One
  test-first place, one teach-first place, is cleaner.
- Against: it is a change to Learn, and Learn should not change
  drastically (2026-10-21). On its own it does not give the batches or
  the review mixed in.

## The choice: A, with D as a later question

Zen gets its own door, and its one clear use is written on it: **test
first, until you stop**. The app picks each batch from where you are.

Why A beats B: Today and Zen answer different questions. Today: "I have 30
minutes, what is best?" Zen: "I have the evening and want to work through
this, adaptively." Merging them breaks Today's planned stop. Why A beats
C: Zen adapts between batches, and Practice is for fixed choices.

The four ways, each with one use:
- **Today:** a little every day, planned. What is fading, then what is new.
- **Learn:** the lecture taught in order, reading first, beside your notes.
- **Zen:** test first, until you stop. New, misses and review mixed, in batches.
- **Practice:** exactly the cards you pick.

D stays a question: once Zen exists, Learn's "Skip the reading" may be
redundant. That would leave Learn as teach-first only, but that is your call.

## The owner's answers (2026-11-22)

- **Marked as you go.** "one of the things that would take the most time
  with the prompt was the time it took reviewing all the answers, plus I
  think it would be easier to do that implementing a way to see them all
  at once."
- **Name:** "Continuous adaptive quiz is the most descriptive name."
- **No batches to stop at:** "what if there are no batches because if we
  hypothetically arent stopping at the end of the batch to show the user
  their results … infinite questions … the order of them adjusts …
  maybe it should be continuous but the method of deciding what questions
  show up still thinks of it in batches of 10."
- **Learn keeps Skip the reading** (D is dropped): "learn is meant to be
  paralell to the lecture notes whereas zen will just be mixed
  essentially when a lot of content has been covered."

## Second round: marking, batches, the name

**Marking as you go or at the end.** For the end: delayed feedback has
done as well or better than immediate in some lab studies of
multiple-choice learning (Butler, Karpicke & Roediger 2007), and a batch
marked together feels like a test. Against: in an adaptive loop the next
card depends on the last answer, and a re-test of a miss means nothing if
the student has not yet learned it was wrong; a misconception left
standing for nine more questions is practised nine more times; and the
owner names reviewing all answers at the end as the slowest part of the
master prompt. The practice test already rehearses end-of-test marking.
**As you go wins**, with the misses gathered so they can be seen at once
(below). No pushback.

**Batches or a stream.** Three ways:
1. *Stops every 10* (the master prompt): a natural place to put it down,
   and a map. But it is the break in the flow the owner no longer wants,
   and every stop is a chance to quit.
2. *A pure stream, the next card picked after every answer*: the most
   adaptive. But a miss could come straight back, which teaches nothing
   (the app's rule: never straight after itself), and nothing guarantees a
   mix: a run of ten misses' re-tests, or ten new cards in a row.
3. *A stream planned in windows of 10*: the next ten are planned with the
   mix (re-tests, review, new); a miss changes the plan of the window
   still ahead (its re-test placed 3 to 6 cards on, by another card on the
   same idea); when a window is used up the next is planned from the
   state then. The student sees no seams.

**3 wins**: the stream the owner asked for, the mix of the master prompt
kept, and the spacing rules the app already has.

**The name.** "Continuous adaptive quiz" is the clearest, and long for a
button on a phone. The row's title: **Adaptive quiz**, with "Continuous:
questions keep coming, picked for where you need them" under it. The
mode's heading in a sitting: "Adaptive quiz". (A question below.)

## How it works (the build plan)

**Where.** A row on a lecture's page and on a class's page, under Today
and Learn. For a class, its lectures are drawn from together: it is for
once a lot has been covered.

**What it draws from**, every window of 10 planned in this order:

1. **Re-tests of misses** from the window before, each by another card on
   the same idea where there is one (the same term, the same concept, the
   same study), else the same card; placed 3 to 6 cards after the miss,
   and once more in a later window. "I wasn't sure" on a right answer
   counts as half a miss: re-tested once, later. At most 4 a window.
2. **What is fading and past mistakes**, by the memory model (most faded
   first), then cards marked unsure before: about 3 of 10, more as an
   exam nears (as Today shifts).
3. **What is not learned yet**, the rest: cards never answered, in the
   slides' order, a lecture's easier questions before its harder ones on
   the same idea (Stage 1 then Stage 2). Only from sections already met
   in Learn, or all of them if the student picks "include what I have not
   learned" (a question below).
4. **Never** the same idea twice in a row, a card twice in one window
   unless as its re-test, or a reading card.

**Stages.** Each section's Stage 1 (Recall cards) and Stage 2 (Apply
cards) are passed when every card in them has been answered right once.
They show on the map. A miss never moves a stage back; it goes to the
re-tests.

**I don't know** shows the answer, the why and the passage, as now, and
counts as a miss for the re-test.

**Seeing it all at once** (the owner's "a way to see them all at once"),
without stopping:
- The side rail (a phone: a line above the card): "34 answered · 27
  right", and a **Missed (7)** button.
- Missed opens a list of every question missed or marked unsure in this
  sitting: the question, your answer, the right one, and the why, one tap
  each to open. It closes back to the card where you were.
- Every 10 answered, a quiet line on the card's top edge for a moment:
  "10 more · 8 right". No stop.
- The map (sections with S1 and S2) is on the lecture page and in the
  rail, not between questions.
- Stop at any time: the sitting ends on a summary like any other, with
  the misses list and the tree.

**Coming back.** The stages and the misses' re-tests are kept per
lecture, so tomorrow it carries on where the plan was. Nothing to resume
beyond that: the next window is planned fresh.

## Before building

- **The simulator** (CLAUDE.md): the stream as a policy against Today and
  Practice over a month: does mixing review into new cost what lasts, and
  is 3 of 10 the right share? The share is retuned before the build if
  not.
- **Cost.** The simulator policy and the build are each about a session.
  Sonnet 5.5 builds the window planner and the Missed list to an exact
  spec; Opus 5.5 judges the simulator results, reviews the diff and
  writes the copy.

## Questions for the owner

1. **The button:** "Adaptive quiz", with "Continuous: …" under it, or the
   full "Continuous adaptive quiz"?
2. **What it draws new cards from:** only sections already met in Learn
   (your "when a lot of content has been covered"), with a tick to include
   the rest? Or everything from the start?
3. **Go ahead** with the simulator, then the build?

## 2026-11-25: the Missed list taken out

The plan above has a Missed list, from reading the owner's "a way to see
them all at once" as a request for one. In context it was about the other
option, marking at the end, which would need every answer shown together.
Each answer is already marked as it is given, with its why and passage, so
the list only repeated it, with less. It was built, shown, and taken out.
