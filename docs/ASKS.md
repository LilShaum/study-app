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

- **Teach before testing, for a student who has not been to lecture**
  (2026-10-26: "it needs to not only be able to test those last things but
  also help the user achieve them in the first place, even if the user has
  never been to lecture or hasn't gone over the slides"). Proposed
  2026-10-26, waiting on the owner's go (it changes what every lecture
  generates and costs usage): Learn teaches terms (definitions), processes
  (examples) and pictures, but every connection between ideas (the
  mechanism, the why, how one slide leads to the next) is only in the MCQs
  and their explanations, asked cold. Proposal: a short "explain" reading
  card per key idea, written the way a tutor would say it in class (2 to 4
  sentences, what it is, why, how it links to what came before), placed in
  Learn just before the questions on it, left out with Skip the reading and
  in Review; plus an "Add explanations" prompt to give existing lectures
  theirs cheaply, without regenerating.
- **Look at the regenerated nutrition lectures** (2026-10-26). Waits on the
  owner sending the files here: this session cannot reach other chats.
- **Study and learning modes keep improving, effectiveness first**
  (2026-10-26: "more important than QOL is making sure the way the app
  teaches is actually effective … I don't want to have to spell everything
  out for you"). Brainstorm and test properly before building; think of the
  obvious QOL basics without being asked (shuffled options and "I don't
  know" were missed for weeks). Standing, never closed.
  Round 1 (2026-10-26, live): from reading a real Learn sitting, a worked
  example now comes before the cards that practise it, exam answers to
  write come last in their section, and long answers are asked and scored
  instead of only read. Next, from the same reading: a one-term step asks
  the term straight after showing it (the weakest first test); an MCQ can
  still land before the idea it needs when it names only an earlier term
  (a decay-chain question in step 1); a plain flashcard's "Got it" is
  still the kindest grade in the app (type or write the short ones?).
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

- 2026-10-26 Export works on an iPhone (2026-10-26: "they won't download to
  my iPhone files"): a lecture's Export opens the share sheet on a phone
  (Save to Files, AirDrop, another app), as a backup does.

- 2026-10-26 From the owner's nutrition screenshots: "Name three" of five
  listed is full marks at three (it demanded all five); a list question is
  judged by whether its points explain anything, not their length (the
  design-questions and credentialed-experts cards were missed); at most two
  cards to write per section in a sitting, the rest the next.

- 2026-10-26 Write the answer only where it belongs (2026-10-26): the
  generator has a "which type for what" table and a strict rule for written
  questions (rare, a key idea the lecture explains in connected points,
  each point a sentence with its reason, never a list); the "give three"
  wording that invited lists is gone. In the app, a written answer is not
  asked again within the sitting; the lecture check flags list questions
  and crowded sections, and Fix turns them into multiple choice.

- 2026-10-26 Written questions after multiple choice, as the final, more
  thorough test (2026-10-26: "these long written questions should usually
  come after multiple choice since they are harder"): every Write the
  answer card goes in its section's last step and last in any step,
  including the next sitting's second look, which used to open with them.

- 2026-10-26 Learn picks up where it was left (2026-10-26: "if you leave in
  the middle of learn mode to go check the glossary or whatever that when
  you come back it doesn't restart"): on Back, on Learn again, and after a
  reload; Today within the same day. (store/resume resumesOnOpen)
- 2026-10-26 Nothing in the app assumes one class's exam (2026-10-26: "This
  app is supposed to work for essentially any class"): today's changes all
  switch on from what a lecture contains; three class-specific phrasings
  (generator prompt, a code note, CLAUDE.md) made general; the rule is in
  CLAUDE.md.

- 2026-10-26 Just flashcards or just multiple choice, by section, easy to
  find (2026-10-26): under Practice on the lecture page and under a
  section's Practice this section, direct links to Multiple choice,
  Flashcards, Terms (every card of that kind, started at once) and the
  Practice test. Today, Learn and Practice each say what they are for.
  Multiple choice chosen as the kind always comes with its options.
  Session headers renamed to match (Multiple choice, Everything, Mistakes).

- 2026-10-26 Written answers taught before they are asked (2026-10-26):
  with Read first, a section opens with each short or long answer it builds
  to and its points; the cards teach the parts; the answer is written last
  (in a one-step section, the next sitting). Skip the reading asks it cold,
  with I don't know. Review, Practice and the test ask it straight.

- 2026-10-26 "I don't know" on everything that tests you: flashcards and
  written answers too, in sessions and the practice test (2026-10-26). The
  answer or the points to make show, it counts as a miss, Next moves on.
  Fixed with it: a flashcard's answer longer than its question ran over the
  card's rules (the back was pinned to the front's height).

- 2026-10-26 Item counts follow importance (2026-10-14): the weight table
  and per-section density check (2026-10-15), "mentioned" only for terms
  the slides name or cover another way, and Add skipping only facts tested
  at the same depth (commit 23e637b) were all already live; confirmed on
  ASTR 201 lectures 2–6, made with the current prompt.

- 2026-10-26 Related terms answered and made useful: they are the
  neighbours to tell a term apart from; only those the lecture defines
  show, as "Compare with", and a tap opens the neighbour's meaning beside
  it (definitions, and typed terms once answered). (RelatedTerms)

- 2026-10-26 "I don't know" on multiple choice, typed terms and the
  practice test: the answer, every option's reason and the passage from
  the notes show, and it counts as a miss (2026-10-26). With Skip the
  reading, the definition and passage show at once. (McqCard, RecallCard,
  TestRoute DONT_KNOW)

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
