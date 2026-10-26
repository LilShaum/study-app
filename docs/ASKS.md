# What the owner has asked for

Every request the owner makes goes here the moment it is made: dated, in
their words where possible. It moves to Done only once it is live (pushed,
merged to `main`, the live site checked), with where it lives. Something
dropped says who dropped it and why. The Open list is printed at the start
of every session (`.claude/hooks/session-start.sh`): work it before
proposing anything new.

This list exists because asks were lost between sessions: the owner asked
long before 2026-10-14 for multiple-choice options to be shuffled, it was
never written down, and on 2026-10-21 one generated lecture had every right
answer in position A. History before 2026-10-14 is not on record; anything
the owner remembers asking that is not here goes in when they say so.

How the owner wants the app to work, as standing rules, is in CLAUDE.md
("How the owner wants it to work"); this file is for things to get done.

## Open

- **"I don't know" on every question** (2026-10-26: "there should be an
  option to select for I don't know the answer that way if you don't know
  you aren't forced to make a guess or type something random"). With Skip
  the reading, a don't-know shows the definition or an explanation next.
- **Related terms on definitions: what are they for?** (2026-10-26: "I have
  never found it useful tbh but maybe I just don't see the vision"). Answer,
  and make them useful or take them away.
- **Study and learning modes keep improving, effectiveness first**
  (2026-10-26: "more important than QOL is making sure the way the app
  teaches is actually effective … I don't want to have to spell everything
  out for you"). Brainstorm and test properly before building; think of the
  obvious QOL basics without being asked (shuffled options and "I don't
  know" were missed for weeks).
- **Item counts follow importance** (2026-10-14). Prompt and check
  shipped 2026-10-15; waits on a lecture generated with the current prompt
  to confirm. Go given 2026-10-26 ("start pushing the other things I asked
  u for too") on: "mentioned" only for names never explained; Add material
  skips only facts already tested at the same depth (docs/HANDOFF.md §0).
- **Nutrition lectures (EPHE 155)** (2026-10-20: "let me know if … i
  should regenerate"). Answered: yes, regenerate per lecture with the
  current prompt. Waits on the owner; do not upload the old EPHE 155
  even-out file to the new lectures.
- **ASTR 201 midterm** (2026-10-20). Lectures 2–6 delivered. Lecture 7 is
  not on it (the teacher: up to the Cambrian explosion, lecture 6 page
  40). Lecture 1 was never sent; ask if it is wanted. Captions of the
  teacher's videos, if sent, can be folded in.

## Waiting on the owner (do not start)

- Anything that needs a real study log (2026-10-15: "put anything that
  requires my real study logs on the back burner"): calibrating the
  simulator, the three-cards-per-term limit, weighting by importance.

## Done

- 2026-10-26 A missed question that comes back has its options in a new
  order, its right answer in a new place (2026-10-26: "when it came back
  it's multiple choice options were in the same order"). (orderForShowing)

- 2026-10-21 Wrong options that teach (2026-10-17, 10-20): a wrong pick that
  is another term of the lecture is kept as a mix-up and asked beside the
  question in Review, listed on Progress (lib/mixUps); the generator has a
  qualifier-swap wrong option (never for rarely, only for mostly); the
  lecture check flags wrong options with no reason, and Fix repairs them.

- 2026-10-21 Multiple-choice options shuffled at every showing, in
  sessions and the Practice test (asked before 2026-10-14, again
  2026-10-21). (lib/optionOrder, McqCard, TestRoute)

- 2026-10-21 Each way to study has one clear use, checked against the
  owner's picture; Practice says what each choice is for. (CLAUDE.md,
  EXPECTATIONS "Practice")
- 2026-10-21 Written answers: short and long answers are written and
  ticked point by point, in sessions and in the Practice test.
  (lib/answerPoints, FlashcardCard, TestRoute)
- 2026-10-21 Mistakes: a miss stays until right on a later day. (isMistake)
- 2026-10-21 The owner's picture of the app, in CLAUDE.md, for future
  sessions to check the app against (2026-10-21: "there should be an area
  where u describe everything i tell you about how we want the app to work").
- 2026-10-21 Lecture 7 question answered from the teacher's reply.
- 2026-10-21 ASTR 201 lectures 2–6 as course files, assignments as the
  guide to question style, concepts over niche values, maths notes folded
  in (handed over, not in the repo).
- 2026-10-20 Nutrition regeneration verdict, checked properly per lecture.
- 2026-10-19 Mixed lectures closer to an exam: mixed by default in the week
  before one. (lib/practice examSoon)
- 2026-10-18 Better systems suggested and tested: mixed-lecture class
  Practice, modelled in the simulator first.
- 2026-10-17 Audit of the app's weak points. (docs/audits/2026-10-17)
- 2026-10-17 iPhone header: dropped by the owner ("stop wasting time on
  it"). Do not try again unless asked.
- 2026-10-15 Practise every lecture of a class together, and a class
  practice test. (class Practice, TestRoute)
- 2026-10-15 Studies easy to reach: practise only the study cards. (lib/studies)
- 2026-10-15 Unflip a flashcard ("Flip back").
- 2026-10-15 Slides explained only in class: a cited study may be filled in
  from outside the slides, labelled. (generator.md)
- 2026-10-15 Expectations for every feature written out. (docs/EXPECTATIONS.md)
- 2026-10-14 Practice test of medium and hard questions. (TestRoute)
- 2026-10-14 The generator reasons about why the teacher showed each slide:
  objectives, summaries, titles, bullets, studies, what comes before and
  after. (generator.md, pass 1 reading map)
- 2026-10-14 Basics keep their definition cards.
- 2026-10-14 Diagrams the AI cannot read: listed as unclear figures, and
  the PDF attached. (generator.md, lecture check)
