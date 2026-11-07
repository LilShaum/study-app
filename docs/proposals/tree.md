# The tree: how it is grown, how it moves and speaks, how it looks

2026-11-06. The owner: "is there a way to cleanly and intuitively make a
combo of version 1 and 2? … when u press ur finger on the tree … the
numbers pop up … and move with the branches making a really clean and
dynamic feel", "can u also see if the tree motion code could be made
better?", and then "three main things about the tree: how its generated,
how it moves and is interacted with and presents info, and how it looks
(ai slop svg vs clean app defining feature)".

## 0. How this is decided

**What the tree is for.** A picture of one lecture's memory: a branch per
section, leaves for what is held, leaves on the ground for what has faded,
bare wood for what was never opened. It is the app's reason to come back,
made visible (CLAUDE.md, Today: "the reason to come back is what is
fading"), and since 2026-11-06 the first thing on the lecture page, large.

**Who meets it.** A student on a phone, on the lecture page, every study
day: a glance before pressing Start, sometimes a wish to go to one section.
The large tree (a tap away) is for looking closer.

**Evidence used.** The live build tested by the coordinator on a 390px
phone, touch, CPU slowed 4x, a lecture with progress (results and shots in
the scratchpad, `tree-test2`); my own sweep timings (below); the drawing
rendered from the real generator at 6x; the code (components/CourseTree,
lib/growTree, the motion CSS in styles/index.css).

**What was found.**

| # | Area | What a student meets | Kind |
|---|---|---|---|
| 1 | Moves | Choosing a branch in the large tree greys the rest per stroke, so overlaps darken: a dot at every joint, the leaves a grey scribble | Fault |
| 2 | Moves | Every finger move that changes the branch re-renders all of the drawing's ~1200 paths through React. Slowed 4x: frames to 233 ms (333 ms with reduced motion), and 106 to 142 ms in my sweeps | Fault |
| 3 | Moves | The lecture page grows the whole tree twice to crop its blank paper; the large tree samples its branches before it first paints. First draw 350 to 400 ms slowed | Fault |
| 4 | Generated | A step and a bump where the trunk meets the leader, and notches down every thick limb: the taper is stepped strokes with round caps, the trunk 3.1 wide where the leader starts at 2.6 | Fault |
| 5 | Looks | The large tree floats in a tall sheet with a quarter of it blank above the crown | Fault |
| 6 | Moves | Swiping the large tree names the branch under the finger with "Open section", and nothing says it can be done. On the lecture page a tap only opens the large tree | Direction, §2 |
| 7 | Looks | Every leaf the same outlined almond; twigs straight and poking out past the leaves like a broom; three dashes for ground; fallen leaves scattered like confetti | Direction, §3 |
| 8 | Generated | The crown a fan of nested Vs: the section limbs leave a short stretch of trunk at much the same angle | Direction, §1 |

Faults 1 to 5 are fixed on this branch. The directions are argued below.

## 1. How it is grown (lib/growTree)

**Does the structure carry the lecture?** Mostly. One limb per section,
its length and thickness from how many items it holds; leaves from how
much is held; the ground from what faded. What a student cannot read is
WHICH limb is which: sides alternate, heights are jittered, and the last
section is the leader. That is what the numbers in §2 are for; moving
limbs into lecture order would make the fan worse, not better.

**Does it read as a tree?** As a young tree from a distance; close up as a
procedural fan (finding 8) with a broom of bare twigs (finding 7).

Options:

- **G1. Tune the generator it has.** Wider spread of limb angles, lower
  limbs arching outward and down, twigs that curve and end inside the
  foliage, fewer of them past it. Keeps one limb per section, the
  deterministic seed, every test of the contract. Every tree changes shape
  once.
- **G2. Replace it** (space colonisation or an L-system). More natural
  crowns, but a section no longer owns one limb a number can point at,
  and every guarantee (wood never moves as you learn, leaves fall where
  they grew) is rebuilt from nothing.
- **G3. Simplify to an emblem**: one bold limb per section, a few twigs.
  Clean, and a diagram: it gives up the one thing no chart can do.

**Pick: G1**, because the structure is right and the faults are in the
habit and the line. Held until the owner has chosen the look (§3), since
the two are one change to the same code.

## 2. How it moves, is touched and says things

**The gesture.** Options, each judged on a phone where the tree fills a
third of the first screen and the page must still scroll:

- **Press and hold anywhere** to raise the numbers. Clean, but hidden: a
  tap would still open the large tree, so most students would never meet
  the numbers.
- **A finger on one branch raises that branch's number only**, a swipe
  raising each as it passes. Dynamic, but a student looking for section 7
  hunts for it, and aiming at a limb at this size is right about 65% of
  the time (components/CourseTree, measured), so the one wanted may never
  come up.
- **Any touch raises all the numbers, and the branch under the finger is
  the one picked out.** Numbers rise out of their branch tips to a ring
  outside the crown (lib/treeKeys, the placement version 2 had); the
  branch under the finger is drawn heavier, its neighbours swing aside,
  its lost leaves fall once, and the line under the tree names it with
  "Open". A swipe moves the pick from branch to branch.
- **Numbers always shown** (version 2). The owner chose the clean drawing.

**Pick: any touch raises all the numbers, the one under the finger picked
out.** It is the only option a student finds without being told: the tap
that opened the large tree now raises the map, so the first contact
teaches it. The whole ring costs nothing to show, because it sits outside
the crown, and the swipe still gives the owner's "pop up as you pass"
feel, on the branch that is picked.

How it behaves:

- **Touch.** A tap raises the numbers. A press raises them after a
  moment, and a sideways swipe at once; an upward or downward drag scrolls
  the page as before (`touch-action: pan-y`) and raises nothing. After the
  finger lifts the numbers stay a few seconds, long enough to tap one.
  A tap on a number opens its section, as version 2's did; a tap on the
  drawing while they show opens the large tree; a tap anywhere else puts
  them away.
- **Mouse.** Hovering raises them and the pointer picks the branch; a
  click on a number opens it, on the drawing opens the large tree.
- **Keyboard.** The tree takes focus and raises them; Tab walks the
  numbers in lecture order, each naming its section; Enter opens it, Enter
  on the tree opens the large tree, Escape puts the numbers away.
- **Riding the branches.** Each number and its hairline are drawn inside
  the same group as its section's wood and leaves, so the one transform
  that swings the branch carries its number. It cannot drift, because it
  is not moved separately.
- **Coming and going.** Each number travels out along its own hairline
  from its tip, a little after its neighbour, and back the same way. With
  reduced motion they simply appear and go, and nothing swings (the rule
  already in styles/index.css).

**The motion code, judged.** The leaf fall is good: a fluttering fall with
real physics, at most 60 leaves, played once per branch and only when a
branch is chosen; reduced motion collapses it. The swing is a CSS
transition on eleven groups, also fine, and removed under reduced motion.
What is wrong is not the motion but what each frame costs (findings 1 to
3): dimming and the heavier stroke were written onto every path, so every
change of branch re-rendered the whole drawing. Changes:

- Dimming moves to the section's group, as a flat lighter ink (a token per
  theme) instead of opacity, so overlaps cannot stack and nothing has to
  re-render to dim.
- Each section's paths render once and are kept; a change of branch
  re-renders only the branch left and the branch picked.
- The crop is worked out from the tree already grown, and the branch
  sampling for pointing waits until after the first paint.

**What it says at a glance.** The line of words under it stays ("11
sections · 6 fading · 4 not started"); while a branch is picked, the line
names it instead ("3 · kcat and catalytic efficiency, fading · Open").

## 3. How it looks

**What makes it look generated** (the owner's "ai slop svg"): one leaf
shape repeated hundreds of times, each separately outlined, so a crown
reads as a pile of seeds; straight twigs fanning out past the leaves;
dimming that stacked into a scribble; a ground of three dashes and
confetti leaves. **What makes a drawing look drawn**: masses of foliage
read as tone, not as hundreds of outlines; lines that curve and end where
a hand would stop; weight and size that vary; leaves on the ground lying
flat, gathered under the branch they fell from; one ground line.

Options, each prototyped with the real generator (stills listed in §5):

- **L1. Ink.** Leaves filled solid in the ink and varied in size, like a
  woodcut or a pressed specimen; twigs curved and ending in the leaves;
  flat litter in a heap; one ground line. Half the edges of today, so the
  crown reads as mass at phone size, and it holds up in dark, where the
  outlines glare most.
- **L2. Botanical outline.** Fewer, larger outlined leaves with a midrib,
  curved twigs, flat litter. Closest to a herbarium plate, the most
  "drawn", but more marks per leaf.
- **L3. Today, cleaned.** Same outlined leaves, curved twigs, flat litter,
  one ground line. The smallest change.

**Pick: the owner's, from the stills.** My lean, once drawn, is **L2**,
and with the habit change of §1. I expected L1 to read as mass; at phone
size the paper edge between solid leaves speckles, and in dark it reads as
snow. L2's fewer, larger leaves with a midrib read as a drawn plant in
both themes and halve the leaf paths. L3 shows how far tidying alone goes:
not far. All three keep the fan of Vs, which only the habit change (G1)
loosens; one still shows L2 with it.

## 4. Build plan

1. **Faults, on this branch** (done): per-group dimming in a flat ink;
   only the changed sections re-render; one growTree per drawing; sampling
   after paint; the trunk meeting the leader at one width and thick limbs
   tapering in steps too fine to see; the large tree cropped to its crown.
   A test for each.
2. **The touch reveal, on this branch** (done): numbers on touch, riding
   the branches, the caption naming the picked branch, the tap rules
   above. Recorded for the owner before it ships.
3. **The look and the habit**, once the owner picks from the stills: G1
   with the chosen leaf style, in lib/growTree, keeping its contract; the
   contract's taper note updated if limbs are filled. The owner chose C,
   L2 with the habit change (2026-11-07, "c"); built on the branch
   `tree-look` (§5, the look as built).
4. **Second look** at the large tree once the lecture page's touch has
   been lived with: it may need numbers too, or less.

## 5. Results (2026-11-06, on the branch `tree-reveal`)

**Faults.** Per-group dimming in a flat ink (`--color-ink-dim`, both
themes), switched at once: easing it re-styled every path on every frame
and measured four times the long frames. The flat ink kept the leaves'
paper fill, and every leaf is painted after every branch, so the other
sections' pale leaves lay over the picked branch: picking a branch in the
middle of the crown hid most of it, its own leaves included (the owner saw
it in the recording, 2026-11-06: "it almost looks like the leaves stay on
top of the branches"). The picked branch is now drawn again in front of
the drawing, in a group each section always has, carrying its swing, so
the copy cannot lag the branch under it. A swipe at a quarter of the CPU:
long frames 1 to 3 against 2 before, the same within the noise. Picked-branch changes re-render
two sections (`LimbPaths`, memoised). The joint: the trunk now ends as wide
as the leader starts, strokes narrow with the outline when a broad tree is
fitted to its sheet (that was the visible bulge: the outline narrowed and
the leader's stroke did not), and limbs taper in steps under half a pixel,
each piece on the line's own curve. The large tree starts at its crown.
Branch sampling waits for idle or the first touch.

**Timings**, a finger swept across the crown, CPU slowed 4x (phone pace),
long tasks per sweep: the large tree 1 to 2 (it was 1, and briefly 4 to 5
while the dim was eased), now drawn about 30% larger; the lecture page,
new, 1 to 3. The lecture page's first draw is about what it was, 330 to
400 ms slowed: the cost is React drawing ~1300 paths, which the look (§3,
L2 halves the leaves) is the real lever on.

**Shown** (scratchpad `design/tree-reveal`, `design/tree-look`): the
reveal recorded (`tree-reveal-light.mp4`, `.gif`); the lecture page's
tree as it opens and with a branch picked, light and dark; the large
tree's dimming before and after; the trunk joint close up before and
after; today's look beside L1, L2, L3 and L2 with the habit change, light
and dark.

**Not checked.** A real phone and iOS Safari (Chromium with touch emulated
only); real-sitting feel of the linger time (5 s) and the hold (180 ms).

### The look as built (2026-11-07, on the branch `tree-look`)

The owner chose C from the stills: L2's leaves with the habit change of
§1. It is in lib/growTree for every tree, with no switch left.

- **Leaves.** A clump carries 45% of the leaves it has room for, each 1.55
  times the habit's leaf, each with a vein: its midrib, a fine line from
  the stalk three quarters of the way to the tip, at half the leaf's
  weight. Under half the leaf paths of before; with the veins, the drawing
  still has fewer paths than it had (2928 against 3180 in the test tree of
  nine sections).
- **Branching.** Section limbs leave the trunk up to 17 degrees either
  side of their angle (8 before), the lowest opening out by up to 6 degrees
  more. A section's main limb and the leader rise toward the vertical at
  0.45 of the lift of the limbs off them. The two finest orders of limb
  each curve their own way, and the last twigs are 0.72 as long.
- **Ground.** One line drawn by hand, under the tree and about 50 units out
  either side.
- **Fallen leaves.** Lying flat, within about 6 degrees of level, in a band
  2.4 units deep at the ground, under their branch and drawn a little
  toward the trunk, at 1.1 times the habit's leaf.

**What differs from the prototype, and why.**

- **The twigs' curve.** The prototype took it from a sine hash, the
  fraction of sin(x) times 43758, which multiplies sin's last bits, where
  browsers can differ, by forty thousand: a course could curve its twigs
  one way in Safari and another in Chrome. It is now an integer hash of the
  limb's starting point taken to 0.01, mixed with Math.imul (`hashUnit`),
  still outside the seeded stream, so no course's tree changes shape for
  it. Each twig bends by a different amount than in the stills, over the
  same range. With the prototype's hash and fit put back, the port draws
  every wood path, leaf, fallen leaf and vein of the prototype exactly (80
  trees checked).
- **The vein is part of its leaf** (`Limb.vein`), not a limb of its own.
  As a limb of its own the renderer filed it under wood: drawn under every
  leaf and hidden by the paper they are filled with. CourseTree draws it
  straight after its leaf, at half the leaf's weight, never as a target,
  and budding with its leaf at a session's end; it dims, swings and comes
  to the front with its section with no code of its own. Fallen, falling
  and lost leaves have none.
- **A lost leaf is outlined at the size it grew.** The prototype drew the
  outline, which is also the leaf that falls when its branch is picked, at
  the old size, so a small leaf would have fallen from where a large one
  was.
- **The fit allows for the larger leaves.** A broad tree is narrowed to
  its sheet by its wood plus a clump's reach, and the prototype kept the
  reach of the old leaves: in crowns in full leaf, 116 trees of 462
  measured ran leaves up to 15 units past the sheet's side, cut off by its
  edge in the large tree, the library and a session's end. The stills had
  20 units of paper either side, so they never showed it. The reach now
  adds what the largest leaf grew by: 19 trees of 462, by at most 9 units
  (33 trees by at most 7 before the change). The cost: a broad crown is
  about 4% narrower than in the stills (the test lecture at 0.80 of its
  width against 0.83), and the widths of different courses' crowns spread
  less, about 34 units across twenty courses where they spread 62. Most of
  that is the habit change itself opening every crown out: the narrowest
  of the twenty went from 105 units to 129.
- **The numbers sit 4 units further out** (lib/treeKeys: 16 at the sides
  and 18 above, from 12 and 14), about what the leaves grew by. In crowns
  in full leaf a number sat on a leaf one time in 26 with the larger
  leaves at the old ring (one in 40 with the old leaves); now one in 80,
  and a leaf comes within 6 units of a number's centre 12% of the time,
  where it was 21%. The sheet above the crown is 4 units taller, which
  also gives the larger leaves at the top their room: 2 trees of 462 reach
  past the cropped top, by under a unit (4 trees by up to 5 at the old
  ring).
- **Falling leaves land in the band** where the fallen ones lie
  (components/CourseTree), not up to five units below it.

**Checked** (scratchpad `design/tree-c`): the lecture page's tree as it
opens and with each branch picked and the numbers up, light and dark; the
large tree with each branch picked; the target still beside the port
drawn by the same renderer; the leaves enlarged from a phone shot. At
288px the crown reads as separate leaves, each with its vein; the ring of
numbers stands clear of the leaves; the picked branch comes to the front
with its veins; dark holds up.

**Not checked.** A real phone and iOS Safari, still; a session's end
watched (the vein's class and timing there are tested, not seen).
