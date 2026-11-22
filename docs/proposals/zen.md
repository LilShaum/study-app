# Zen: the master prompt as a way to study

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

## How Zen works (the build plan)

**Where.** A row on a lecture's page and a class's page, under Today:
"Zen: test first, until you stop". For a class, its lectures are taken in
order, or mixed in the last week before an exam, as Practice does.

**A batch** is 10 questions plus the re-tests, built in this order (the
master prompt's §3, with the app's memory model in place of counting
quizzes):

1. **Re-test (on top of the 10).** Each miss from the last batch, asked
   by a different card on the same idea where the lecture has one (the
   same term or concept), else the same card. This is the master prompt's
   "freshly rephrased". At most 4, so a bad batch does not snowball.
2. **Review slots: min(sections mastered, 3) of the 10.** Cards whose
   memory has faded most (the memory model), then past mistakes, from
   sections already mastered, Apply-phase cards first (the master prompt's
   Part B is Stage 2).
3. **Forward slots: the rest.** In the slides' order: the current
   section's Recall cards (Stage 1), then its Apply cards (Stage 2:
   vertical pull), then the next section's Recall cards (horizontal pull).
   Reading cards are not asked; a definition is asked as its term.

**Stages.** A section's Stage 1 is passed when every Recall card in it has
been answered right once (a miss comes back in the next batch's re-test
until it is). Stage 2 is the same for its Apply cards. Mastered = both. A
section never goes back a stage (the master prompt's "never move
backward"); a miss goes to the re-test instead.

**Marking.** Each answer is marked as it is given, with the why and the
passage, as Practice does. The master prompt marked the batch at the end,
but that was a limit of a chat. The question below asks if you want
end-of-batch marking anyway.

**I don't know.** As in the master prompt: on a card never met, it shows
the answer, the why and the passage, and it is not counted against a
stage; on a card from a passed stage, it counts as a miss.

**Between batches**, a pause like Learn's:
- "7 of 10 right", and the misses by name ("Not yet: …").
- The map: each section with S1 and S2 marks (passed, under way, not
  started), and a "due" mark for a mastered section that is fading. The
  tree beside it, the current section lit.
- Buttons: Next 10, ← Back, Stop here.
- On a map row: "I know this" (the master prompt's !skip_chunk: marks the
  section's stages passed, and its cards still come back in review).

**Leaving and coming back.** Zen keeps the map's state (the stages passed)
per lecture, so the next evening it carries on. The batch itself is not
resumed: the next one is built fresh.

## Before building

- **The simulator** (CLAUDE.md: a new way to study is modelled as a policy
  first). Zen as a policy against Today and Learn for a month: does it
  reach new material as fast, and does what it teaches last as well when
  review is mixed in rather than first? If Zen does worse on what lasts,
  the review slots are retuned before anything is built.
- **Cost.** The simulator policy and the build are each about a session's
  worth of work. Agents: Sonnet 5.5 for the batch builder and the map
  component to an exact spec; Opus 5.5 reviews, judges the simulator
  results and writes the copy.

## Questions for the owner

1. **Marking:** each answer as it is given (as Practice), or the whole
   batch at the end (as the master prompt did in a chat)?
2. **The name:** "Zen" or something else ("Continuous", "Keep going")? On
   the page it would read "Zen: test first, until you stop".
3. **Batch size:** 10 as asked, with up to 4 re-tests on top?
4. **D:** once Zen is in, take "Skip the reading" out of Learn, so Learn
   is teach-first only and Zen is the test-first way? (Later.)
5. **Go ahead** with the simulator first, then the build?
