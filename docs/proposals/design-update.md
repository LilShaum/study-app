# Design update: each format used for what it is good at

For the owner. Questions at the bottom. Goes with the first run
(`docs/proposals/onboarding.md`) as one design update.

The ask (2026-11-22): "the difference between the phone view and pc view is
not good enough … both do not fully take advantage of the format which they
appear." The owner's starting ideas: on a phone, the tree unfurls when a
lecture opens and that is when leaves fall (not when a finger sweeps over
it); on a computer, use the space (the lecture page and a sitting leave
most of a wide screen empty), a bigger tree in a sitting that gains leaves
as you study, the keys moved, the glossary in its own part of the screen.
"Intuitive and cleaner more elegant feel, everything should look and feel
intentional."

## How to decide

**What each format is good at.**
- *A phone*: one hand, one thing at a time, touch and motion, a few minutes
  on a bus. Its job is to get out of the way: the card, the next step, the
  thumb on the button. Motion carries meaning well here, because there is
  nothing else on screen to compete with it.
- *A computer*: width, a keyboard, a pointer, longer sittings. Its job is to
  show several things at once that a phone has to show one after another:
  the card and the glossary, the lecture and its sections, the tree and the
  question.

**The test for every screen**: at 390 px, is there one obvious thing to do,
in thumb reach? At 1440 px, is the width doing a job, with nothing
stretched and nothing stranded in empty space? And everywhere: can each
element say why it is there?

**What the app's look already decides** (the arborous-design skill): a
printed book, ruled not boxed, the tree as the one living figure. On a
computer the book's own answer to width is the **open spread**: two facing
pages, or a page with a margin that carries notes. That is the model here,
not a dashboard grid of cards, which the look rules out.

## The phone

1. **The tree unfurls when a lecture opens.** Branches draw out from the
   trunk (as the first run's title page will), then the leaves that have
   faded since the last visit fall. That is when the student sees what is
   fading: on arrival, without having to touch anything. The finger sweep
   stays for naming a branch (it brings its section forward), but no longer
   drops leaves. Once per visit, short (about a second), and replaced by a
   still tree under reduced motion.
2. **One shared animation** drives the lecture page, the first run's title
   page and the end of a sitting (where the leaves just earned grow), so
   the tree behaves the same everywhere.
3. **A sitting is the whole screen**: the header shrinks away, and the
   rail's facts (so far, the step) sit in one line above the card. Already
   true for a sideways phone; extended to upright.
4. **The lecture page's first screen** is the tree, the lecture's one line
   of what is fading, and the three ways to study in thumb reach (the
   pinned bar), as now, with the sections below.

## The computer

### The lecture page, as an open spread

Now: a narrow column of tree and sections on the left, a column of ways to
study on the right, about a third of a wide screen used, and the right
column ending halfway down. The options:

- **A. A spread.** The left page is the lecture as a specimen: the tree
  large, its label (sections, fading, not started), and the sections as a
  contents list with each one's leaf state. The right page is what to do:
  the three ways to study, and, when a section is picked on the left, that
  section's own page beside it (its items, its progress, Learn from there),
  without leaving. The two pages scroll on their own, so neither runs out
  while the other goes on.
- **B. A wider single column.** Simple, but the width is only longer lines,
  which read worse.
- **C. A grid of panels** (tree, sections, modes, stats). The dashboard the
  look has spent months getting away from.

**A**: the width shows two things a student wants together (where the
lecture stands, and what to do about it), and it is the book's own form.

### A sitting, with a margin on each side

Now: the card in a middle column, a narrow rail on the right with a small
tree, the score and every key the mode has (including keys that do nothing
for the card on screen), and the glossary replacing that rail when opened.
The plan:

- **Left margin: the tree, large, growing as you study.** A right answer
  buds a leaf on its section's branch where you can see it; a miss keeps
  the branch bare until it is put right. The sitting's progress (the step,
  the section) sits under it. Hover a branch to see its section.
- **Centre: the card**, at a reading width, with nothing else in its column.
- **Right margin: the glossary, always there**, in its own column, shut
  while a question waits for its answer (as now), open while reading and
  after answering. It never covers the card or the tree.
- **Keys: only the ones that work on this card**, in one quiet line under
  the card ("1–5 choose · Enter check · → next"), instead of a list of
  every key in the mode. A "?" opens the full list.

Below about 1200 px wide the right margin folds into a button and the left
margin narrows, so a laptop keeps the card at a reading width.

### The library and the class page

- **The library**: Today's suggestions (docs/proposals/ecosystem.md) on the
  left page, the classes on the right, each class open showing its lectures
  with their trees small. On a phone, as now: suggestions, then the folded
  classes.
- **The class page**: the class's lectures as a contents list on the left,
  with its exams, and its ways to study on the right.

## The first run, inside this

The first run's title page opens on the unfurling tree (the owner's idea,
2026-11-11: "branches unfurling, the name appearing, an explanation, then a
demo of sweeping across the branches"), the name set under it, one line of
what Arborous is, then the pages in onboarding.md. The demo of sweeping now
shows naming a branch, since leaves fall on opening.

## How it gets built

1. **Mock-ups first.** Three screens, drawn as the real app with fixture
   data, phone and computer, light and dark: the lecture page as a spread,
   a sitting with its margins, and the lecture opening on a phone (a short
   screen recording). To the owner before anything is built: this is taste
   as much as reasoning.
2. **The layout pieces**: a spread and a margin, used by every page, so
   pages share their measurements instead of each picking widths.
3. **The tree's animation**: unfurl, fall, bud, under reduced motion still.
4. **Page by page**: the sitting, the lecture page, the library, the class
   page, then the first run.
5. Each step checked with `scripts/screenshots.mjs` at every size and
   theme, walked on a phone as a student uses it, and its ripples walked
   (docs/RIPPLES.md: Help, EXPECTATIONS, the first run's text).

Cost: mock-ups about a third of a session; the build two sessions or more.
Opus 5.5 for the design and the tree; Sonnet 5.5 for layout pieces to a
spec, reviewed.

## The code audit (asked the same day)

Its own plan, written when it starts, but the order matters here: the
design update rewrites most page layouts, so polishing that code first is
wasted. So: first a pass that only **removes** (dead exports, unused
components, duplicate helpers, stale comments), found by tools and agents
and judged before anything goes; then the design update; then the audit
proper (organisation, efficiency, how well the code explains itself to the
next session), on the code as it stands after the redesign.

## Questions for the owner

1. **The direction**: the spread for the lecture page and margins for a
   sitting, as above?
2. **Mock-ups first**, to look at before building?
3. **The order of the big pieces**: (a) the library's Today as suggestions,
   (b) the adaptive quiz, (c) the code audit's removal pass, (d) this design
   update with the first run. I would go a, b, c, d: the quiz adds a door
   the design must place, and the removal pass makes the redesign smaller.
4. **A miss in a sitting**: should the computer's tree show it (a leaf
   falling) or only show growth? Growth only is kinder; showing both is more
   honest.

## The owner's answers (2026-11-24)

"Yes to all": the spread, the margins, the order (library Today, the
adaptive quiz, the removal pass, then this). On the tree in a sitting:
"a leaf should grow when a certain concept or something is shown to be
understood, I'm hesitant to say after every correct answer", and no leaf
falls on a wrong answer: "the leaves are meant to fall when the person
hasn't practiced it in a while and so the knowledge is fading". So the
sitting's tree grows a leaf only when the tree's own measure says a part
is learned (the same rule that grows leaves on the lecture page), never
drops one on a miss.

Instead of mock-ups: "make it in a branch, show me the updates, take my
feedback, and then fix it and push it to main", shown "clearly … like a
presentation almost but don't waste too much usage". So each piece is
built on the work branch, shown as one page of labelled before-and-after
screenshots (what changed, where to look), then fixed and merged.

The owner, 2026-11-25: "I think also the tree should do a little shake or
something to make the leaves fall, perhaps. Just an idea to try out." So on
opening a lecture: a small shake, and the faded leaves come off with it,
as one of the motions to try against the plain fall.

The owner, 2026-11-25, reading the brief: the phone needs as distinct a
change as the computer, across every screen, not only the lecture page's
animation: "make the platforms have distinct feels, ui/ux, that take full
advantage of the benefits and downsides of the form factor". The unfurl and
fall play on both formats. The scope is set in part4-brief.md.

## Every screen, on both formats (P4-1, 2026-11-25)

The owner's scope: "make the platforms have distinct feels, ui/ux, that
take full advantage of the benefits and downsides of the form factor".
The phone gets as much change as the computer.

### How each screen was decided

For each screen, three questions: what a student does there; what the
phone gives and takes away (a thumb at the bottom, touch and motion, no
hover, slow typing, a few minutes at a time and interrupted, one thing at
a time); what the computer gives and takes away (width, a keyboard, a
pointer that hovers, long sittings, several things at once). A change goes
in only if it uses a strength or works around a limit for that screen's
job. The book look holds on both: ruled, not boxed; a sheet from the
bottom is a page drawn up over the page, ruled at its top edge, not a
rounded card with a shadow.

### Ideas weighed once, used across screens

- **The thumb bar (phone).** For: every main action in reach, one place to
  look. Against: a bar on every page is chrome, and the book look has
  none. **Kept where a screen has one main action** (library, lecture,
  section, Practice, a sitting's answer), the way the lecture page's
  pinned Start already works. The top "← Library" stays: it is the way
  back, not an action.
- **Sheets from the bottom (phone)** in place of boxes in the middle, and
  in place of panels a phone has no room for. For: in reach, closed with a
  swipe down, the page stays in view above. Against: a gesture to learn.
  **Kept** for the glossary in a sitting, Practice's ticks, the exam and
  details dialogs, the section's detail from the tree, and New lecture's
  steps. Each also has a visible Close.
- **Swipes (phone).** For: fast, one-handed. Against: a swipe can be an
  accident, and it fights the page's scroll. **Only after an answer is
  shown**: swipe left for the next card; on a flipped flashcard, right for
  Got it and left for Missed it (Hard stays a button). Never on a question
  still waiting for an answer, and the buttons stay.
- **Picking up where you stopped (phone).** A sitting cut off by a stop or
  a closed app opens again at the same card, and the library leads with
  "Carry on" while one is open (the lecture page has this already).
- **The keyboard for everything (computer).** For: long sittings, no
  reaching for the mouse. **Kept**: J and K through lists, Enter to open,
  / to search, ? for the keys of the screen; in a sitting, only the keys
  that work on the card, in one line under it.
- **Hover to preview (computer).** A section row lights its branch in the
  tree; a branch names its section; a term in a card shows its meaning in
  the glossary column. Never needed: everything hover shows can be
  clicked.
- **Side by side (computer).** The spread (two facing pages) and the
  margins, where a phone goes one after another.
- **Motion that teaches (both).** The tree draws on and the faded leaves
  fall on opening a lecture, on both. The finger sweep naming a branch is
  the phone's; hover does it on a computer.

### The screens

| Screen | Phone | Computer |
|---|---|---|
| First run | Full pages, one thing each; you sweep the tree and watch it grow, then watch a part fade and its leaves fall; one tap for daily time; install first | The same pages as a spread: the tree large on the left, the step on the right; the keyboard moves through it |
| Library | "Carry on" or the day's first suggestion in the thumb bar; suggestions, then classes folded | Spread: suggestions on the left page, classes open on the right with each lecture's small tree; hover a lecture to see its line |
| Class page | Lectures as a contents list; Practice and test in the thumb bar | Spread: lectures and exams on the left, the class's ways to study on the right |
| Lecture page | Tree draws on and leaves fall; sweep names a branch; a tapped branch opens its section as a sheet; Learn, Quiz, Practice in the thumb bar | Spread: tree large and sections on the left; ways to study on the right, a picked section's detail beside them; hover a row to light its branch |
| Section page | Its line and Learn in the thumb bar; items below | Opened inside the lecture spread; its own page stays for links |
| Large tree | Full screen, sweep to name, tap to open | Replaced by the spread's tree (hover names, click opens) |
| Sitting, any card | Whole screen, no header; answer controls at the bottom; Not sure and I don't know in reach | Three columns: the tree large, growing as parts are learned; the card at reading width; the glossary always open (shut while a question waits) |
| Reading card | Swipe left or tap Next | → next; the glossary beside it |
| Multiple choice, select all | Options large, Check at the bottom; swipe left to go on after the answer | 1–9 choose, Enter check, → next |
| Flashcard | Tap to flip; after, swipe right Got it, left Missed it, buttons kept | Space flip, G, H, M |
| Name the term | The field sits above the keyboard with Check beside it | Type, Enter |
| Written answer | Field grows above the keyboard; after Check, the model answer as a sheet to mark against | Your answer and the model answer side by side; tick the points with 1–9 |
| Worked problem | Steps one at a time, Show the next step at the bottom | All steps beside the problem, revealed in place |
| Diagram | Pinch and pan the drawing, full width | The drawing large in the card column, its note in the margin |
| Pause between steps | One line and Next at the bottom | The same, with what comes next listed in the margin |
| End of a sitting | The tree grows its new leaves, full width; the next thing in the thumb bar | The tree large, and beside it what was missed and what comes next |
| Adaptive quiz | As a sitting; Stop here in reach | As a sitting; the margin counts what is due and done |
| Practice setup | Ticks as a sheet; Start in the thumb bar with the count | Every tick at once in columns, the count beside Start |
| Practice test setup | One page, Start at the bottom | Setup beside a preview of how many questions and what kinds |
| Practice test | One question at a time, the question list as a sheet | The question list in the left margin, the question in the middle, the timer on the right |
| Test review | Misses first, one at a time | List on the left, the question with its reason on the right |
| New lecture, Add, Fix | Steps as a sheet: tick kinds, copy, come back, paste or upload | Side by side: the steps on the left, the prompt and the paste box on the right |
| Browse and edit | Sections in a strip at the top, edit in a sheet | Sections at the side, the edit form beside the item |
| Glossary page | Letters down the right edge for the thumb | Letters at the side, the meaning beside the list; / searches |
| Diagrams page | One at a time, swipe between | A grid of plates; one opened large with its note beside |
| Progress | What is fading first, one column | Fading on the left, the forecast and days of study on the right |
| Help | Folded sections | Contents at the side, the text at reading width |
| Account, Sync, settings | One column, fields at 16px | One column at reading width (a form gains nothing from width) |
| Set aside | List, Undo in reach | List with the item beside it |
| Shared link | Open and save, at the bottom | The same, centred |

### Build order

1. The tree's motion (done on the branch, needs the owner's pick between
   the shake and the plain fall, and the dashed or the solid growth).
2. The layout pieces both formats share: the spread, the margin, the thumb
   bar, the sheet.
3. The sitting on both formats (where students spend most time), then the
   lecture and section pages, then the library and class page.
4. Practice, the test, New lecture and the other sheets.
5. The quieter pages (Browse, Glossary, Diagrams, Progress, Help, Account).
6. The first run, which shows off what is built, with the app's own words.

Cost: this is two or three times the earlier plan. Steps 1–3 are the
biggest gain; 5 could wait for P4-2 or a later round if usage runs short.

The owner, 2026-11-25, on the table: "its hard to say if things wont work
just based on the table, so ill give you a yes to everything based on your
judgement for now. just do your best to make everything high quality and
not look like ai slop. i trust you and will give feedback after seeing your
presentation". So the whole table is built in P4-1 and judged on the
presentation.
