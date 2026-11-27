# The first run without a made-up lecture

2026-11-27. The owner, three times (2026-11-11, Round 3, Round 4) and again
2026-11-26: "I don't want it to have a specific example of making the user
learn how it works through trying a made up lecture, I wanted a more general
explanation of the tree and what its parts represent" ("leaves grow when you
learn a topic or concept"). Go-ahead given 2026-11-27.

## How to decide

What the pages are for: a new student leaves knowing what the tree's parts
mean (a lecture is a tree, a branch is a section, leaves are what they have
learned, leaves fall and lie on the ground when it fades, sweeping finds a
branch) and has done each, not read it (2026-11-24: "making them try
things/direct their attention … instead of explaining in bullet points").
Also standing: the tree stays put and never jumps (2026-11-26), a touch fades
the other branches from the first page, the tree rests in full ink while
leaves grow, motion overlaps (2026-11-25). Judged against: no topic, no part
names, no quiz, nothing to read twice.

## Options

- **A. A labelled diagram**: the tree with captions pointing at trunk,
  branch, leaves and ground. For: the most "general explanation", one
  page. Against: it is the bullet-point reading the owner turned down on
  2026-11-24; the student does nothing.
- **B. The same three pages, made general**: the tree stands for any
  lecture, its branches are numbered sections with no names; tapping a
  branch's number studies it and its leaves grow (no question); skipping
  three weeks drops the leaves of what was not reviewed onto the ground;
  sweeping names "Section 3". For: every part is met by doing something
  to it, the words are general, the pages and transitions already checked
  for jumps stay. Against: a tap that grows leaves at once is a
  simplification of studying; the words say "study" so it reads as a
  stand-in, not a claim.
- **C. B plus a caption that points at each part as it is named** (a
  hairline to the trunk, the ground). For: directs attention. Against:
  more on screen, and the parts that matter are already pointed at by
  what moves (the branch that grows, the leaves that fall).

**B wins**: it is the only one where the student does each thing the tree
means, and what moves already directs the eye, which is what C's lines would
add. A is the reading the owner rejected.

## Build

- `DEMO` becomes an untitled lecture whose sections are "Section 1" to "6";
  the questions and their state go.
- Grow page: "Each branch is one section of a lecture." / "Touch the tree,
  then tap a number to study that section." After a tap the branch grows
  (tree in full ink while it does): "Leaves grow as you learn its topics and
  concepts." / "Study another section." After two: "The more you learn, the
  fuller the tree." / "A section you haven't studied stays bare."
- Fade page: "What you don't review fades, and its leaves fall." / "They
  gather on the ground under their branch. The section reviewed yesterday
  kept its leaves, and Arborous brings fading sections back before you
  forget them."
- Find page: "That's section 3. On a lecture, tap its number to open it."
- Help's tree entry already says it generally; checked, unchanged.

## The lag, in the same pass

Measured 2026-11-26: the freezes are the browser painting the tree's ~1000
paths at the moments the whole tree changes, and the paper fill made each
two to three times heavier. The paper fill is a pattern of grain images,
each with a blend mode, painted inside every leaf. Drawing that tile once
into a single picture (a canvas, at the screen's resolution, per theme and
scale) leaves each leaf one plain image fill, which the browser paints far
faster, and the look is the same. Measured before and after on an emulated
phone at a quarter speed.
