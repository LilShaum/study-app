# The UI/UX and design-language audit

The owner, 2026-11-03: "pretty soon we will need a big ui/ux audit and like
design language audit because we haven't worked on that stuff in a long
time because we haven't been working on the main use of the app which is
good and should continue but like yeah for example the tree definetly
needs updating". And on how: "plan the plans … debate with urself what is
better or worse … and only then is there a plan".

## 0. How this is decided

The plan of the plan, before any finding:

1. **What the design is for.** The intent in CLAUDE.md: a one-stop shop
   for studying, easy as Duolingo to open on a bus, the reason to come back
   being what is fading. The look in the arborous-design skill: a printed
   book or a herbarium sheet, never a generic web app.
2. **The paths a student walks, by how often.** Every day: open the app,
   the library, Today, a sitting, its end. Each week: a lecture or class
   page, Practice, a practice test, Progress. Now and then: a new lecture,
   Add material, Fix, Sync, Help. A fault on the daily path outranks a
   nicer one on a rare screen.
3. **The evidence.** Every screen at phone size, one screen at a time as a
   phone shows it (a full-page shot hides what is below the fold), both
   themes, with real progress seeded. A sitting walked to its end. The copy
   read as a student reads it.
4. **The same questions of every screen.**
   - What is on the first phone screen, and is it the thing the student came for?
   - Is there one main action, and is it in thumb reach?
   - Does what can be tapped look tappable, and what cannot, not?
   - Does each label mean one thing across the app?
   - Is anything shown twice, or shown without saying what it is?
   - Does it hold in the dark theme?
5. **Two kinds of finding.** A fault (a label with two meanings, a number
   that misleads, a missing screen in the checks) is fixed at once. A
   direction (what a page leads with, how the tree looks) is argued here,
   options against each other, and built after the owner has seen it,
   because it is taste as much as reasoning.

## 1. The design language: keep, refresh or replace?

**A. Keep it and tighten the structure.** The book language (Fraunces,
ruled lists, small caps, ink-underlined buttons, no boxes) is the app's
identity and has had several passes (docs/HANDOFF.md §2–3). Every finding
below is about structure, order or wording, not the look.

**B. Refresh within it.** Keep the language. Revisit what has aged: the
tree, the lecture page's top, the Progress page's statistics, which read
as a dashboard.

**C. A new language.** A redesign of type, colour and components. The most
work. The skill warns of exactly what C risks: drifting back to a generic
app. And nothing found points at the language as the problem.

**Decision: A, then B.** Fix the structure now. Then refresh the pieces
that have aged, starting with the tree, which the owner named. C would
spend the most to fix what is not broken.

## 2. Findings, first pass (2026-11-03)

Daily path first. "Fixed" means shipped with this audit.

| # | Where | What a student meets | Kind | What to do |
|---|---|---|---|---|
| 1 | Section end in Learn and Today | "End of <section>" over the last step's score alone ("0 of 4" while the sitting showed ×8); the terms listed with no label | Fault | **Fixed**: at a section's end the score and the terms cover the section's steps in the sitting; "Covered:" names the list |
| 2 | Library, Today | One Start per lecture; three lectures show "30 min · new material" three times, 90 minutes implied and never added up; a choice to make every day | Direction | Section 3, A |
| 3 | Today's first card | A reading card tells one idea three times: the definition, its example sentence in italics, the passage from the notes (open in Learn by design) | Direction | Section 3, B |
| 4 | Lecture page, first screen | The file's details (code, subject, contents, tags) fill the first phone screen; Today's Start sits at its foot | Direction | Section 3, C |
| 5 | Lecture page | "More practice" (ask the AI for more cards) beside "Practice" (study) | Fault | **Fixed**: renamed **Add questions**, beside Add material and Add explanations |
| 6 | Class page | Practice and Practice test rows read as plain text; "Practice test: the whole class" repeated the row above | Fault | **Fixed**: the library's ▸ marks them as pages; the line below lists only coming exams' tests |
| 7 | Progress, empty | "← Back" centred, where every page has it top left | Fault | **Fixed** |
| 8 | Lecture page, Practice | Its line still said Practice was "or a test" | Fault | **Fixed**: says what each now is |
| 9 | Progress | Opens with accuracy (past answers), then lists the same sections three times: recall now, accuracy, tags. Only the first says what is fading | Direction | Section 3, D |
| 10 | Practice | Three short paragraphs before the first choice | Minor | Leave: each answers a question a new student has |
| 11 | The checks | The screenshot script missed every screen built in three weeks (Today, Practice, the test, a class) | Fault | **Fixed**: it shoots them |
| 12 | The tree | Small, top left on the lecture and Progress pages; at that size it shows a tree, not what is held and what is fading | Direction | Section 4 |

Not yet looked at closely, for the second pass: the New lecture and Add
dialogs, Sync, Help's length (18 phone screens), the glossary, Browse,
desktop widths.

## 3. The directions, argued

**A. The library's Today.** (1) Keep one row per lecture: each says what
it holds, but the student chooses every day. (2) One Start for the day
across every lecture, the lectures listed under it with their share:
Today already plans across lectures (lib/libraryToday), and it is the
Duolingo ease the owner asked for. (3) Both: one Start on top, rows below
for a lecture alone. **(3)**: one tap for the usual day, and nothing lost
for the day a student wants one lecture.

**B. The reading card.** (1) Leave it: the passage open after reading is
the evidence's (restudy with the source). (2) Fold the passage on a
reading card when the example sentence is there, open after an answer as
now. (3) Drop the example sentence. **(2)**: the passage still comes, after
the question, where the evidence put it; the first card of the day gets
lighter. To check against a real lecture's sitting before building.

**C. The lecture page's first screen.** (1) Leave it. (2) Fold the
details (code, subject, tags) behind one line, so the tree, the title and
Today fill the first screen. (3) Move the details below the ways to work.
**(2)**: the details stay one tap away and the first screen is about
studying. It changes the page every study day starts from, so the owner
sees it first.

**D. Progress.** (1) Leave it. (2) Lead with memory: the sections by what
is fading, each with its Review, as "Still remembered" does; accuracy and
tags folded below. (3) Merge the three lists into one, a column for each.
**(2)**: the page's question is "what needs me now", and the answer is on
the first screen. Accuracy stays for those who want it.

## 4. The tree

What it is for: a picture of the lecture's memory, leaves for what is
held, falling for what fades, so the reason to come back can be seen. It
already works that way (fixed 2026-11-03: a section just studied keeps its
leaves). What does not work is that it is too small to read.

- **A. Larger, and read as a map.** The lecture page's first screen holds
  the tree large; each branch a section, tap one to open it; a line under
  it in words ("2 sections fading").
- **B. Replace it with a chart.** Clear, but a chart is the web furniture
  the language avoids, and the tree is the app's one picture of memory.
- **C. Keep the tree as decoration, and put the information in words.**
  Cheap, but the tree then says nothing.

**A**, with C's line of words under it, so the picture and the plain
statement agree. What "needs updating" means to the owner (the look, the
size, what it shows) is theirs to say: two or three versions at phone size
go to them before one is built.

## 5. Build order

1. **Faults** (shipped with this audit): 1, 5, 6, 7, 8, 11.
2. **Directions, after the owner has seen each at phone size**: the
   library's one Start (A), the lecture page's first screen (C), Progress
   leading with memory (D), the reading card (B, checked on a real sitting
   first).
3. **The tree**: versions to the owner, then the one chosen.
4. **Second pass** over the screens not yet looked at (section 2's list).

Each is phone first, both themes, and checked by the screenshot script.
A redesign of a page is the work to run on the highest effort setting
(the owner's standing ask: say when it is worth it).

## 5a. Built for the owner to see (2026-11-05)

A, B, C, D and three versions of the tree are built on a branch, not on
`main`, with phone screenshots before and after in both themes. Where the
pick changed once it was on a screen:

- **A.** One lecture to study would have shown it twice (the day's Start,
  then the same lecture "instead"), so with one the row is the day. The
  day's row is headed "All 3 lectures", not a second "Today" under the
  Today label, and says where it starts ("Starts with …").
- **B.** Built against the made-up test lectures only. The check this
  section asked for, on a real lecture's sitting, is still to do.
- **C.** With the details folded, Today's row lands at the foot of the
  first screen, where a sliver of it showing hid the pinned Start and left
  no Start on screen. The pinned Start now watches the button, not the row.
- **The tree.** "Tap a branch" stays a number per branch: aiming at a limb
  is right about 65% of the time even full size (components/CourseTree).
  Numbers on the crown were lost among the leaves, so they ride a ring
  outside it with hairlines that never cross (lib/treeKeys). Every tree
  had a blank quarter above its crown; the lecture page now starts the
  sheet at the crown, so the larger tree costs no more of the first screen.
  The three versions are live behind a switch ("Tree 1 2 3"), none picked:
  1 large, 2 numbered, 3 small with a key of what is fading.

## 5b. Chosen (2026-11-06)

The owner said yes to A, B, C and D, and chose the tree's first version as
the default: "make it version 1 by default but if u do something the
numbers pop up cleanly … when u press ur finger on a branch or swipe across
them … and move with the branches". So version 1 shipped alone, the switch
and version 3 went, and version 2's numbering (lib/treeKeys) is kept for
that reveal, which is planned and shown to the owner before it ships.

## 6. What would change this plan

- If the owner dislikes the book language itself, not its structure,
  section 1 is wrong and C comes back to the table.
- If a real sitting shows the reading card's three tellings help (a
  student reads the example and the passage), B is left alone.
