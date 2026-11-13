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

- **Keep going until the list is clear, then check, then report**
  (2026-11-03: "dont stop until you run out of limit or the to do list is
  cleared. and even after its cleared, if there are any follow up checks or
  tests … do those too and only then stop and give me a report on the state
  of the app, what was changed/fixed, and what should be worked on next").
  Standing for this run.
- **Work through every ask, planning before building** (2026-11-03: "just
  work through the things i have asked you to do so far … if im asking you
  to reimagine something about the app or audit it or improve it, please
  make well thought out plans, and plan the plans"). Standing; the method
  is in CLAUDE.md, the plans in docs/proposals/.
- **Friends** (2026-11-11, from the account plan: "do friends separately
  cuz i dont have too many people using it rn so its not pressing but its
  def a cool feature I wanna have"). Ideas in docs/proposals/account.md
  (invites, sending lectures, class groups sharing lectures, fixes that
  travel, friends' days of study); a plan of its own when the owner wants
  it.
- **The first run, reworked: how it looks and what it covers** (2026-11-11:
  "i think the onboarding could definitely be updated in terms of both
  ui/ux (first impressions matter) but also in terms of the information
  that would be useful. i feel like making an account would be an obvious
  thing, i need you to brainstorm others. here is one suggestion I want
  you to take as food for thought instead of immediately accepting but
  like getting them to pre input the courses they will be using for the
  app and that way when u are generating a new course u can tick that
  classes box so that way if ur notes dont say what class they are from
  and the ai doesnt put it in the lecture file so it doesnt end up with ur
  other lectures, it would now know no matter what cuz of the ticked
  course … idk if there are better ways to solve the same issue so thats
  always for u to explore"). To plan first, options argued, in
  docs/proposals/. Planned 2026-11-11 (docs/proposals/onboarding.md). Then
  (2026-11-11): "I think a tour for the onboarding could be good if done
  right. like it really has to be clean and pulled off elegantly … a new
  user should know of some of our important QOL features and where they
  can find things … for example where to go to update/fix an already
  generated and uploaded course". Owner's decisions 2026-11-11: no sample
  lecture ("using the study stuff is the more intuitive part … we dont
  want the onboarding to take too long"); the account optional; the class
  fix built together with the first run, not first. On hold (2026-11-13: "leave
  the onboarding for now").
- **A fresh ultracode session that grades the whole app against its goals**
  (2026-11-03: "I want to eventually start a fresh ultra code session for
  this project that will go through and grade the app and every component
  of it relative to the goals of the app and each of those components and
  how much we are hitting those marks or missing them … It would then go
  through and suggest changes/fixes/improvements that would help bridge
  the gaps, even to the point of suggesting overhauling certain things if
  necessary. Idk how I should do this tho. If I just need you to make me a
  prompt and that's enough or if there is more prep required"). Prepared
  2026-11-03: the prompt in docs/prompts/grade-the-app.md, drafted goals
  for the components EXPECTATIONS lacked (to confirm). Not yet: the owner
  will run it after the open changes are built (2026-11-03: "I want to do
  it after you have finished doing a bunch of the changes I've asked you
  for"). Then it waits on the owner to start it, with the slides of one
  or two real lectures; the session makes their files itself.
  2026-11-10, on Fable 5.2 ("fable 5.2 just dropped and I wanna ask you
  how we should use it"): it runs on Fable 5.2 at high effort, a fresh
  session. And widened: "include in the info we give the fable session
  all the previous like grades and stuff that has been looked at and
  changed so it can see the evolution and see if shit could have been
  better to do another way … or look at shit that humans notice and care
  about making good in an app that usually our ai app improvement
  sessions miss, because they tend to focus on more technical things … I
  want it to really give good insight in actual app ui/ux design and how
  the code should be written and organized and like the different systems
  of the app and how they were built and seeing if things can be improved
  at deeper more fundamental levels whereas usually its like little tweaks
  … i def want fine tunning too or just any improvements it can argue".
  The prompt rewritten for it the same day. The design audit's five
  directions and the tree are live, so it can run now; the second pass's
  screens are graded in it. Also 2026-11-10: tell it every feature
  shipped and what each was for ("i did a pass of the app trying to make
  two different views for the phone and for the desktop … telling it
  about all the current features and things we have shipped on the app
  and what the goal was with them so it can check them out and see if
  there was a better alternate solution ro way to pull it off or if there
  are just ways to improve it and help it better hit our mark or to exceed
  expectations and take the idea to a whole other level"), and "maybe
  double check those too": the goals in EXPECTATIONS checked against
  what shipped. And: "emphasis on design for things to be intuitive to
  find and use otherwise they wont be used properly or taken advantage
  of". Done the same day: EXPECTATIONS checked against the code and the
  Done list (three design changes marked live, a Layout and devices
  section, drafted goals for the parts with no entry), and the prompt now
  lists every feature with its goal, asks of each for a better way and how
  to take it further, and grades whether each can be found and understood.
- **Slides are the skeleton of a narrated lecture: the file and the app
  must fill in the narration** (2026-11-03: "the format of slides forces
  the info to be brief and in bullet points or complex diagrams with no
  explanations. The teacher and lecture fill these gaps by narrating it
  for the students and helping guide the thought process … the ai needs to
  be able to think why certain diagrams were shown, as examples to help
  paint the picture, sometimes to learn/memorize and other times just as
  an example … the bullet points give pieces of the picture, but the
  picture is only really painted when these various details are used
  together to describe something bigger or something complex or maybe
  even the differences/to compare different things … we want the app to
  be universal"). What exists: the generator maps every slide's purpose
  and where runs of slides build to, but "the map is not part of the
  output"; only explanations and questions carry it. To plan, and the
  grading session's main lens for the generator. Whatever is built must
  reach lectures made before it without losing their progress, as Add
  explanations does: the owner is generating courses now rather than
  waiting (2026-11-06: "I'm waiting for all these changes we are working on
  to go through before generating my new courses and studying for upcoming
  stuff"). Planned and built 2026-11-06 (docs/proposals/narration.md),
  live: what the lecture and each section build to (`builds_to`), opening
  each section in Learn and Today's new material and on the section and
  lecture pages; a note on each figure the lecture turns on (why it is
  shown, what to look at, to know or just to picture it, where it is in
  the student's own notes when the app has no drawing); an explanation and
  a question for each comparison the slides only imply; every handwritten
  note that says more than its slide carried into the file; a reason the
  slides do not give allowed in an explanation, labelled "Not from your
  notes", never under a scored card. Lectures made before it get it from
  Add explanations, scores kept. Tested on a real lecture, Opus 5.5 at high
  effort: figure-reading notes reached a reading card 10 times against 3,
  with as many questions as before once a rule kept narration on top of the
  cards. Waits on the owner's look at a lecture made with it.
- **Teach understanding, not memorising: use the explanations, and
  questions that test application, everywhere** (2026-11-03: "perhaps you
  could use the new like explanation things that are part of the new
  prompt to help explain different things in the app … its a new type of
  thing the generating ai is giving us and we gotta think of clever ways
  it can be used in the app to help the user learn and understand better.
  i am a firm beliver that people shouldnt memorize, they should learn,
  meaning understand why exactly the thing they are being taught is that
  way, and by being curious and learning the actual reason why things are
  ways or by making connections … thats what i want our app to focus on.
  one of the best ways i think to help with this are those multiple
  choice questions that test application, either by combining different
  or multiple concepts so they need to be integrated, or testing them on
  the nuanced details that differentiates something from something else
  that is similar, or having those tricky answers that are common
  misconceptions or the opposite of the right answer or are like mixed in
  similar terms or that test nuanced understanding of something by having
  everything but one little detail right in an answer … use it as a guide
  or inspiration to help make the app better at actually teaching").
  Standing direction as well as work: to plan first, with the ask above.
  Planned 2026-11-03 (docs/proposals/understanding.md): the explanations
  after a miss, in the test's review and folded behind a "Why?"; the
  generator to name two more kinds of question (two ideas integrated,
  right but for one detail); the lecture check to see a lecture of
  recall only. Built 2026-11-03, live: each question's explanation as its
  Why, open after a miss, folded after a right answer, in every mode and
  the test's review; the generator's two new kinds (two ideas together,
  the one detail off). Decided 2026-11-06 (docs/proposals/narration.md,
  section 8): how each section follows from the last is in its
  `builds_to`, live; the check for a lecture of mostly recall is not built,
  because the real lecture read showed no such problem (about two thirds of
  a sample applied, predicted or explained) and the app's own measure of it
  counted far too few, which is for the grading session to look at.
  Was: the lecture check for a lecture of recall
  only, after reading a real one; explanations of how each section
  follows from the last.
- **A UI/UX and design-language audit, soon** (2026-11-03: "pretty soon we
  will need a big ui/ux audit and like design language audit because we
  haven't worked on that stuff in a long time … the main use of the app …
  is good and should continue"). After the study work in hand.
  First pass done 2026-11-03 (docs/proposals/design-audit.md): the book
  language kept, the structure tightened. Faults fixed and live: a
  section's end scored the last step alone; "More practice" read as
  studying (now Add questions); class rows that looked like text; a
  repeated link; a centred back link; the screenshot check missing three
  weeks of screens. Waiting on the owner's eye, each argued there: one
  Start for the day on the library, the lecture page's first screen,
  Progress leading with what is fading, a lighter first reading card, and
  versions of the tree. Worth the highest effort setting.
  Chosen by the owner and live 2026-11-06 ("yes to all 5"): one Start for
  the day, the lecture page's first screen, Progress leading with what is
  fading, the lighter first reading card, and the tree's large version
  (the switch and the other two versions gone). Second pass not started.
- **Say when a higher effort setting is worth it, before starting a task**
  (2026-10-29: "I'm wondering if there is a certain time it would be
  beneficial to put you on ultra code mode and maybe if you could suggest
  when I should do so before starting a task"). Standing: flag it before a
  task that needs it. The settings, low to high: high, extra, max,
  ultracode (2026-10-29: "max … is only one step higher than extra and
  it's one step below ultracode"). Worked problems started on max.
- **Answers in a new place from the very first showing** (2026-10-26: "I'm
  doing multiple choice problems for the first time and they all had the
  answer A. Make sure the answers are shuffled whenever the question is
  shown even the first time"). The live app shuffles at every showing,
  the first included (checked on the live site 2026-10-26: right answers at
  B D C D B B B A A C B A A in one sitting). The owner's phone was running
  an old copy: an iPhone home-screen app keeps the page it loaded. Fixed
  (lib/appUpdate): the app looks for a new version whenever it comes back
  into view and reloads where that loses nothing; Help shows the version.
  Live; waits on the owner checking Help's version after reopening.
- **"I don't know" on a name-the-term card with Read first** (2026-10-26:
  "I'm doing a name the term question and don't see a don't know option.
  Is it because I am on the not skip the reading mode?"). It is there in
  both modes on the live site (screenshot at phone width); the same old
  copy. Waits on the same check.
- **The order in a step, with the write-the-answer cards on an unfixed
  lecture** (2026-10-26: "they now show up as flash cards but after the
  multiple choice questions … there is now another multiple choice after it
  so now I'm confused on what's happening with this order"). Nothing in the
  app turns a written question into a flashcard; an old copy shows written
  questions as plain flashcards. The multiple choice after it was a missed
  question coming back ("Again, from earlier"); it now comes back before
  the step's question to write, so writing stays last (store/session
  requeue). Live; waits on the owner's look.
- **Say when to regenerate the lectures or use Fix** (2026-10-26: "Let me
  know when I'm good to regenerate the lectures or use the fix mode").
  Answered 2026-10-26: now, once the app on the phone shows the current
  version (the prompt it hands out is part of the app). Barely studied:
  regenerate. Studied: Fix, then Add explanations, which keeps the scores.
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
  instead of only read. Next, from the same reading: (done 2026-10-26: a
  term is named after the questions on it, not straight after reading it);
  (done 2026-11-03: an MCQ that names only an earlier term but quotes a
  later passage waits for that passage's step; a question whose passage is
  not a definition's is not caught, as the app cannot see what it needs);
  (done 2026-11-03: a plain
  flashcard's "Got it" was the kindest grade in the app; Hard now sits
  between it and Missed it, see Done.)
- **Nutrition lectures (EPHE 155)** (2026-10-20: "let me know if … i
  should regenerate"). Answered: yes, regenerate per lecture with the
  current prompt. Waits on the owner; do not upload the old EPHE 155
  even-out file to the new lectures.
## Waiting on the owner (do not start)

- Anything that needs a real study log (2026-10-15: "put anything that
  requires my real study logs on the back burner"): calibrating the
  simulator, the three-cards-per-term limit, weighting by importance.

## Done

- 2026-11-11 Your own page with the heatmap (2026-11-10 heatmap ask;
  2026-11-11: an account page "organized by class", "probably the users
  name … if not then just account", leaves "fuck it do the leaves",
  friends later), live: #/account, linked from the foot of every page by
  the student's name or Account; days of study as leaves, the figures,
  time by class; Sync and Back up. A removed lecture keeps its days, class
  code and title (2026-11-11: "only make the sacrifice if we need that
  extra storage"), synced.
- 2026-11-11 Questions and decisions at the bottom of every reply
  (2026-11-11: "if there is a little question hidden in there or some
  liberty you took/decision you decided to make on your own, please make it
  so they are outlined at the bottom … this is something I want for all
  sessions"). In CLAUDE.md, so every session on this repo does it. A cloud
  session cannot write the owner's account-wide memory; for other
  projects the same line goes in the PC's ~/.claude/CLAUDE.md.
  Added 2026-11-11: a question the owner's reply leaves unanswered is
  asked again at the bottom of the next reply ("sometimes ill be partway
  through reading a message when ill read something i need to reply to …
  if I dont address something that I need to address then make sure to
  bring it up again").
- 2026-11-11 The phone sideways is no longer cut off; an iPad on its side
  gets the desktop view (2026-11-10: "make it so the app cant rotate on the
  phone"; then "adding a message overtop doesnt help because its already
  obvious … when it does the view is very cut off"). iOS gives a web page
  no rotation lock, so a phone on its side now gets the wide layouts: the
  lecture page in two columns, a sitting with the side column and its
  section picker there, no running head over a sitting; the card is on the
  first screen at 750x340 and 844x390. The iPad already had the desktop
  layout from 1024px. Real iPhone and iPad not yet tried by the owner.
- 2026-11-10 A lecture opens at the top, the tree first (2026-11-10: "make
  it so when u open a lecture u start at the top so u see the tree right
  away"), live: a page opened from a link starts at its top and Back
  returns to where you were (RootLayout ScrollRestoration). Checked on the
  build: a library scrolled 1024px down opened a lecture at 0 with the
  tree on screen; Back came back to 1024.
- 2026-11-10 Share the app with a QR code in Help (2026-11-10), live:
  Share Arborous under the welcome replay, the code dark on light paper
  in both themes, the address, Copy link and the share sheet. Decoded
  from screenshots in both themes to the right address. (ShareApp)
- 2026-11-10 What's new in Help (2026-11-10: "really concise and only
  really things that the user would care about"), live: the last section
  of Help and a link beside the version; the lines in lib/whatsNew.ts,
  added with each change a student would notice (CLAUDE.md).
- 2026-11-10 The tree: numbers on a touch, and look C, live (2026-11-06:
  "can we make it version 1 by default but if u do something the numbers
  pop up cleanly … when u press ur finger on a branch or swipe across them
  … and then they pop up and move with the branches"; "how its generated,
  how it moves and is interacted with and presents info, and how it looks
  (ai slop svg vs clean app defining feature)"). Planned in
  docs/proposals/tree.md. A tap, a held press or a sideways swipe on the
  lecture page's tree raises a number on every branch, each riding its
  branch; the branch under the finger is named under the tree with Open,
  and the rest set back in a flat paler ink with the touched branch drawn
  in front (the owner saw the pale leaves covering it: "it almost looks
  like the leaves stay on top of the branches"). A rest before a slow
  scroll lets the page scroll; a sweep is never a tap. Look C, chosen from
  stills ("yes, c", 2026-11-07): fewer, larger leaves each with a vein,
  limbs at uneven angles with the low ones reaching out, one hand-drawn
  ground line with the litter in a band along it. Not yet tried on a real
  iPhone.
- 2026-11-05 Multi-select questions ("Select all that apply"), live.
  Planned in docs/proposals/multi-select.md: a new item kind `multi`, marked
  all or nothing, each statement shown with why it is true or false and how
  many were judged right; the number true never given. In every mode, the
  practice test, Practice's Multiple choice, Learn's Apply; its own tick
  when making a lecture; the generator writes them where an idea has
  several things true of it, false statements built from the wrong-option
  kinds; the lecture check flags a broken key, all true, and the same
  count every time.
  - **Multi-select questions** (2026-11-04: "i had an idea i really want
    implemented but dont work on it rn since im low on usage but just mark
    it how u usually do. multi select questions"). Not started, on the
    owner's word. When it is: plan first (CLAUDE.md method). Questions to
    settle then: how one is marked (all right only, or part credit), how
    the memory model scores it, the generator's rules for writing them (what
    a "select all that apply" tests that one answer cannot), and every place
    a question is asked (Learn, Today, Practice, the practice test, Why, Not
    sure).

- 2026-11-04 The right model for each job (2026-11-04: "when it was
  generating the course to test with it used sonnet 5.5. and i think
  another one of the agents was using opus 5 instead of 5.5. how do i make
  sure it uses the right models … i feel like generating the course should
  be done how i do it"; "i genmerate courses with opus 5.5 on high effort
  or higher"). In CLAUDE.md (Models): sessions on Opus 5.5, checked before
  the first message; every agent's model named, never inherited; Sonnet
  5.5 for scoped coding, Opus 5.5 for judgment; test courses on Opus 5.5
  at high effort or more. Both session briefs say so.
- 2026-11-03 No conclusions from the owner's own study data (2026-11-03:
  "i dont use the app enough, and im afraid you will make false
  conclusions off my one off shitty data"). Both session briefs now ask
  for slides only; the sessions make the lecture files themselves with
  the current prompt (the owner: "how am i supposed to attach one real
  lecture when u just updated the prompt?"), and judge learning with the
  simulator, never the owner's log.
- 2026-11-03 Reading slides, two corrections to the prompt (2026-11-03:
  "whether a list is there to learn or to compare … I'm not quite sure of
  its wording, it seems off. For the second bullet point, a good way for
  example in my bio class is that if a pathway is shown in a diagram and
  then there are bullet points about it, that's one good way to tell that
  that complex pathway or at least those bullet points about it are things
  I need to know"). The list rule contradicted itself (comparing is
  learning); now a list of examples, which shows a category's range, or a
  list whose members are each to be known. And a diagram the slide's text
  talks about is content: the pathway, cycle or structure is to be known,
  every part the bullets name and its order, unnamed steps included; a
  diagram no text refers to is more often there to paint the picture.
- 2026-11-03 Use agents: the "one agent at a time" rule was never the
  owner's (2026-11-03: "Since when is my rule here one agent at a time? I
  swear I have said repeatedly to use agents"). It was a session's reading
  of 2026-10-21's "woah you like used all my session usage in like 10
  minutes" after five parallel agents; the owner had said on 2026-10-18
  "feel free to start paralell tasks with new agents". Corrected in
  CLAUDE.md and the grading prompt: use agents, in parallel where work
  splits, each well scoped; say before a large fan-out.
- 2026-11-03 Saying how sure: built as feedback, live. Not sure beside
  Check answer opens a right answer's why and passage; every miss shows its
  why; the test's "?" is its Not sure. "Retested sooner" was simulated and
  not built: it cost a point in 16 of 42 scenarios (sim/FINDINGS.md).
  Sureness is logged, so the owner's real log can reopen it.
  - **Say how sure you are, and let it change what happens** (2026-11-03:
    "for certain question times that it applies to, and in my mind the
    perfect example are multiple choice questions, you should be able to
    note how confident you are in your answer before locking it in or maybe
    it should be after u answered u say how hard the question was or
    something (maybe it should depend on the question type idk) and based
    on if u get it right or wrong and based on ur confidence something
    happens. like something you are confidently wrong about gets retested
    or worked on sooner. maybe there would be a special in depth
    explanation"). To plan first (CLAUDE.md method); changes the memory
    model, so the simulator first. Planned 2026-11-03 in
    docs/proposals/understanding.md: a "Not sure" mark before the pick, on
    multiple choice only; a sure miss gets its explanation and comes back
    sooner (confident errors return: Butler, Fazio & Marsh 2011), an unsure
    right answer counts as Hard. Simulator first. Simulated 2026-11-03: both
    schedule rules cost more than they gave (sim/FINDINGS.md), so built as
    feedback: Not sure beside Check answer opens the why and the passage on
    a right answer, every miss gets its why, the test's "?" is its Not sure
    with a Right, but marked ? list; sureness logged for the real log.

- 2026-11-03 The practice test turns like a paper test: the question count
  opens every question by number, Mark to come back to puts a "?" beside
  one, and ending with any blank or marked shows them first.
  - **Practice test like a paper test: mark questions to come back to, and
    move freely between them** (2026-11-03: "the practice test then should
    also let you mark questions to go back to and let u swap between
    questions to simulate a real test with pages u can flip between irl").

- 2026-11-03 Practice and the practice test, one job each, and flashcards
  the Anki way (the two asks below, planned together in
  docs/proposals/practice.md). Practice studies: ticks for kinds, which
  cards and sections, an order, ready-made sittings, Start pinned with its
  count, a row on the class page. The test rehearses: answers at the end,
  a timer if wanted, ticks for what is on it, every miss with its passage.
  Flip cards are graded Got it · Hard · Missed it, each with when the card
  comes back; the simulator found Hard helps and Easy does not (no Easy,
  sim/FINDINGS.md). The ready-made Flashcards sitting takes the cards
  already met first, then up to ten new. Not built: a typed cloze card
  (no sign yet that flip cards fall short there), and using answer time
  to temper the grade (waits on the study log).
  - **Practice: choose several of a kind at once, tick the sections, easy to
    find, and a clear use beside the practice test** (2026-11-03, on the
    class Practice page: "Rather than choosing between one option or
    another, for certain parameters, there should be like boxes to tick or
    something so multiple different things can be selected … being able to
    tick off specifically which sections to do or not. I think it's so
    useful that having it hidden is bad. I think it needs to be repositioned
    in terms of use case relative to the practice test. Maybe the practice
    test is more specifically a practice test that doesn't show u answers
    right after and maybe it has u timed … but u can still customize what
    shows on it … the other mode would be just like most to study whatever
    you want however you want from the full course, like choosing which
    question types you want … and if they are mixed or not. I'm not 100%
    sure about my suggestions so think and through"). The test's default
    was left to the design (2026-11-03: "i think the answer to the
    decision for me depends how you pull all this off"): at the end.
  - **A flashcards-only mode like Anki** (2026-10-29: "a flash cards only
    section that works similarly to how anki works with its spaced repetition
    and how their cards are structured and also their feature where you say
    how sure you were about ur answer or how fast u got it").

- 2026-11-03 The tree: a section just studied keeps its leaves (2026-11-03:
  "I tested the leaves on a section I had just studied and they immediately
  fell and like the animation would repeat if I kept swiping the
  branches"). Reproduced: six hours after studying three sections with 2 in
  5 missed, one swipe dropped 48 leaves from all three. A missed card
  counted as forgotten though it was never learned. Now a leaf falls only
  for a card once got right that has faded to where Review asks it, so the
  tree and Today give the same signal; a swipe drops each branch's lost
  leaves once, as before. The rest of "the tree needs updating" goes in the
  design audit. (lib/sectionMemory heldShare)

- 2026-10-29 Problems to work out, for math, code and the like (2026-10-29:
  "my friend who is in computer science said he wouldn't find much use from
  this app … not software development classes or math centered classes …
  maybe u could think of a good new item type"; made by default for any
  problem that needs working out): a `problem` item, made wherever the
  material has a method to carry out. A number is checked however it is
  typed (unit beside the box, 1% or rounding to the figures given), a short
  answer (what code prints) matched, anything else (a proof, code to write)
  ticked step by step against the worked solution. Stuck, the steps come
  one at a time and help counts as not yet; a wrong answer a known mistake
  leads to says which. In Learn after the worked example on its method, at
  most two a step; a Problems choice in Practice; on the practice test when
  chosen; code set as code in every card. The lecture check flags an answer
  its own steps never reach. (ProblemCard, lib/problemAnswer, RichText)

- 2026-10-29 Choose which item types a lecture gets (2026-10-29: "if they
  just want flash cards for example they will just get flash cards"): What
  to make, a box per kind on New lecture, Add material and More practice;
  the prompt makes only those, the lecture keeps the choice for later
  prompts, and the lecture check does not ask for a kind left out.
  (lib/makeKinds, MakeKindsField)
- 2026-10-29 The prompt screens made clear for a new user (2026-10-29:
  "massive blocks of text … confusing and not intuitive"): New lecture is
  three steps (what to make, copy the prompt, paste the reply), one line
  each, options and reasons folded; Add to a lecture the same, one line per
  tab. (PromptStep, More)

- 2026-10-29 Learn's opening not about slides (2026-10-29: "that's biased
  to me who generates with slides"): "Read this part of your own material
  first", I've read it; Learn's line, Help and the lecture check ("Check in
  your notes") say notes, not slides. (SlidesCard)

- 2026-10-26 (Superseded 2026-11-03: the test marks at the end, Practice as you go.) Practice test: answers as you go or at the end, chosen on its
  setup (2026-10-26: "MAKE IT SO U CAN CHOOSE IF U GET ANSWERS AT THE END
  OR AT START"); as you go is the default. (TestRoute Setup Answers)

- 2026-10-26 Practice test multiple choice by default, written answers only
  when chosen on its setup; a marked question shows what the other modes
  do: every wrong option's reason and the passage from the notes after a
  miss (2026-10-26: "WITH THE SAME INSIGHT AS IN THE OTHER MODES …
  BY DEFAULT ONLY MULTIPLE CHOICE"). (TestRoute Setup, Taking)

- 2026-10-26 (Superseded 2026-11-03: the test marks at the end, Practice as you go.) Practice test: right or wrong straight away (2026-10-26:
  "MAKE IT TELL YOU IF THE QUESTION IS CORRECT OR WRING RIGHT AWAY"): a
  pick or I don't know is marked at once with the right answer and why; a
  written answer's Check shows its points to tick. (TestRoute Taking)
- 2026-10-26 A miss or I don't know in a test comes back (2026-10-26:
  "Why does marking it as idk count and it never shows up again? …
  ADAPTIVE"): a new test asks first what was last got wrong, then what has
  not been on a test, then the longest ago. (TestRoute firstBy, drawTest)

- 2026-10-26 The studies treatment only when ticked (2026-10-26: "you have
  to tick a box for it to do the whole studies bullshit because so much
  usage was wasted on my nutrition files"): New lecture has "My exams ask
  about the studies on the slides", off by default; off, a study is only
  evidence for its point and nothing is filled in from outside the slides.
  Add material starts it ticked only for a lecture that already has study
  cards. (generatorSpec(studies), StudiesField)

- 2026-10-26 A new practice test asks first the questions not on a test
  yet (2026-10-26: "Yes", to the offer): then those on one longest ago, so
  tests one after another work through the pool; the setup says how many
  are new to a test. Kept across devices by sync. (practiceTest drawTest,
  ItemResult.testedAt)

- 2026-10-26 Read, Recall easy to hard, Apply in a Learn step (2026-10-26:
  "easy multiple choice shows up before writing questions that are easy and
  then in apply it goes to the more conceptual multiple choice and the
  annoying write the answer questions"): easy question, flashcards, term
  named, then the medium and hard questions, writing last; with nothing easy
  first, the term is named after the questions. The simulator gains 2 to 7
  points on the order before it (sim/FINDINGS.md). (learnSteps rankOf)
- 2026-10-26 How the practice test works and what repeating it does:
  answered in chat.

- 2026-10-26 A question that asks two things at once (2026-10-26, a
  nutrition screenshot: "Am I crazy or is the correct answer completely
  unrelated to the fucking question"; then "Ignore my question about the
  multiple choice just now I realized": the key was right, the fix stands). The key was right; the question was
  two joined ("What happens, and how else…?"). The generator now asks one
  thing per question and gives each wrong option a reason about the
  subject, not "not described as…"; the lecture check flags both, and Fix
  splits or rewrites them. (courseHealth two-questions,
  rationale-cites-source)

- 2026-10-26 Name the term after the multiple choice, not straight after
  reading (2026-10-26: "I have to go through a bunch of definitions and
  right after do name the term. It makes no sense … multiple choice helps
  the user remember and apply what they just learned"). A Learn step
  reads, asks its multiple choice, then flashcards, then the terms named,
  writing last; a step with no question whose terms a later one uses joins
  it. Checked on the live site (read ×3, multiple choice ×2, name ×3). The
  simulator scores it lower (sim/FINDINGS.md, 2026-10-26); the owner's
  order, re-baselined. (lib/learnSteps ORDER, withQuestions)

- 2026-10-26 ASTR 201 midterm: written (the owner, 2026-10-26: "I already
  did the astronomy midterm"). Lecture 1 no longer needed.

- 2026-10-26 Taught before tested, for a student who has not been to
  lecture (2026-10-26: "help the user achieve them in the first place, even
  if the user has never been to lecture"; go given the same day): a new
  `explain` card, a key idea in 2 to 4 sentences (what, why, how it follows
  from the one before), read in Learn just before the questions on it, left
  out with Skip the reading, in Review and in Practice. New lectures get
  them from the generator; an older one gets them from "Add explanations"
  on its page, a prompt for the chat that wrote it, without regenerating.
  (ExplainCard, lib/buildExplainPrompt, learnSteps)

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
