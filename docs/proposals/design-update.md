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
