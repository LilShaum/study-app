# Diagrams on a phone: the row of sections

The owner, 2026-11-25 (Testing 9): "it feels too restrictive to have to tap
"next" to go through each diagram but then I noticed the scroll at the top.
The design of it needs to be fixed to be more intuitive … intuitive doesn't
mean remove it or make it a more simple but less interesting way … it needs
to be easy for the users to assume they can scroll it to see the other
diagrams. This involves figuring out why a student might struggle to figure
it out in the first place and then you can think of changes to make to fix
the issue." Broken down in docs/FEEDBACK.md (Testing 9).

## How to decide

The method is the owner's: first why a student misses it, then a design
that answers each reason, in the book's style, with no instruction line.

**What it is.** On a phone the Diagrams page shows one figure at a time,
Previous and Next under it, and above it a row of the sections that have
figures; tapping one jumps to its first figure. The row scrolls sideways
when it is wider than the screen.

**Why a student misses it** (seen on the phone screenshot, 390px):

1. It reads as text: each name is plain small type with a faint underline,
   like a line of links in a paragraph or a heading under the count.
2. Every name looks the same, so nothing says "you are here", and nothing
   says the row is the sequence the figures run in.
3. The cut-off at the right edge is a hard clip, which reads as a layout
   fault, not "more this way".
4. Nothing moves on arrival; a phone hides scrollbars.
5. Next, at the bottom, is the obvious control, and turning figures with it
   never visibly moves along the row, so the two never connect.
6. Scrolled down to a tall figure, the row is gone.

## The options

- **A. Static wrapped buttons.** Ruled out by the owner ("I'm not telling
  you to replace it with static buttons").
- **B. Keep the row, add a "swipe for more" hint.** Ruled out: an
  instruction line is the cheap reading the entry names.
- **C. The row as the figures' running head**, answering each reason:
  - (1, 2) the section you are in is marked as the app marks a choice
    (accent, underscored), the others quiet; each name carries its count as
    a small figure, so it reads as a list of places, not a sentence;
  - (3) the edges where more names wait fade into the paper instead of
    being cut, left and right, only while there is more that way;
  - (4) on arrival, when the row is wider than the screen, it glides a
    little way and settles back, once per visit (not with reduced motion);
  - (5) turning a figure by Next or a swipe moves the mark along the row
    and scrolls the row to keep it in view, so the row is seen to be the
    sequence; tapping a name turns to it;
  - (6) the row stays at the top of the screen as the page scrolls (it is
    the running head of the figures), on paper with a rule under it.
  For: every reason answered by the row's own look and motion; the row
  keeps its idea and gains a job (where am I). Against: more moving parts
  in one strip; must stay quiet.
- **D. Move the row to the bottom, beside Previous and Next**, in thumb
  reach. For: one place to move from. Against: crowds the bottom bar on a
  small screen, and the names, which say what the figure is part of, sit
  far from the figure's title.

## The pick: C

It is the only one that answers all six reasons with design, keeps the row
the owner likes, and makes it more useful than it was (it tells you where
you are). D answers reason 5 only by moving the problem.

## The build

1. `DiagramsRoute`, phone: the row sticky at the top (paper, rule under),
   the current section marked, counts as small numerals, a fade at whichever
   edge has more (mask on the row, updated on scroll), the glide on arrival
   (once per visit, skipped with reduced motion), the row scrolled to keep
   the current name in view whenever the figure changes.
2. Computer: the row wraps (no scroll), so it keeps only the mark of the
   section in view; no glide.
3. EXPECTATIONS (Diagrams), What's new.
4. Checked on a 390px phone: arrival, a swipe, Next five times across a
   section boundary, a tap on a name, scrolled to the bottom, light and dark.
