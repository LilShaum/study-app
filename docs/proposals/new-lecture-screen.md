# New lecture, reorganised

The owner, 2026-11-25, on New lecture: "I like the side by side more in terms
of the actual content but I do like the in a stack better"; of "What suits my
material (suggested) / Only the kinds I tick": "it looks ugly and low effort.
That whole screen honestly needs some reorganization especially after tacking
on new things. It needs to be a lot more intuitive without losing function."

## How to decide

- **What it is for.** Three steps: say what to make, copy the prompt into an
  AI chat with the slides, bring back the file. A student meets it once per
  lecture, often the first thing they do in the app (the first run ends on
  it), and comes back to it after the AI has answered.
- **What it has to keep.** The class; the kinds of item (any subset; all
  ticked lets the AI choose the kind for each idea, a subset means only
  those, CLAUDE.md "Making a lecture"); the two extras (studies, explain
  more), each with its cost in the AI's usage; teacher's notes; "follows on
  from"; the copy and its advice; the upload, its preview and the class
  check.
- **What went wrong.** Things were added one at a time, each in its own
  style: the class as a row of underlined words with no label, the kinds
  behind a two-way choice whose first answer hid them (the owner liked the
  older version "in terms of the actual content": the boxes in view), the
  extras as two long sentences in grey, the options folded. Nothing says what
  is a decision and what is an explanation. The "suggested" tag was a
  small-caps label stuck to a link.
- **Evidence.** The two screenshots the owner compared (Round 4), the
  owner's phone screenshot with the choice circled, and the components:
  `NewCourseDialog`, `MakeKindsField` (also in `AddToCourseDialog`),
  `StudiesField`, `PromptStep`.

## The options

- **A. Only swap the choice for the boxes.** Show the kinds grid, all ticked,
  with one line on what ticking means. For: smallest change, the content the
  owner liked. Against: leaves the rest as unlabelled pieces; "the whole
  screen" was the ask.
- **B. One step at a time (a wizard).** Class, then kinds, then copy, then
  upload, each its own screen. For: nothing to scan. Against: hides choices
  behind Next, more taps, and the student leaves for the AI and comes back
  in the middle; the owner chose a stack.
- **C. Step 1 as a specimen label.** The choices as ruled rows, each named in
  small caps on the left (Class, Make, Also, and the folded More), the way
  a lecture's facts and the student's page are set. The kinds are boxes in
  view, all ticked, with one line under them: each idea becomes whichever
  ticked kind suits it. The extras are short labels with their cost after
  them in quiet type. Steps 2 and 3 as now. For: every decision named and in
  one place, the app's own form (ruled, not boxed), the content the owner
  liked, nothing lost. Against: a little taller than today on a phone.

## The pick: C

It is the only one that fixes the screen and not just the one control, keeps
every function in view or one fold away, and is built from the app's own
parts (the ruled label rows of the student's page and the specimen label),
so it stops looking tacked on. A wizard would hide the choices the owner
wants to see; A would leave the rest as it is.

## The build

1. `MakeKindsField`: the boxes always shown, all ticked by default, three
   columns on a computer and two on a phone, and one quiet line under them:
   "Each idea becomes whichever ticked kind suits it best." "Tick all"
   appears only when some are unticked. "Choose at least one" stays. Used by
   New lecture and Add material, so both change.
2. `StudiesField` / `MoreContextField`: the label alone, its cost after it
   in quiet type ("uses much more of the AI's usage", "a longer file").
3. `NewCourseDialog` step 1: ruled rows, label above on a phone and to the
   left on a computer: Class (when not opened from a class), Make (the
   kinds), Also (the two extras), More (teacher's notes, follows on from,
   folded).
4. Help, EXPECTATIONS (New lecture), and the tests that find these controls
   by their words.

## The "AI chooses" choice, again (2026-11-25, Testing 6)

The owner, on Round 6, where the choice had been folded into the boxes and a
line of text put under them: "you fucking removed the option that I
specifically asked you to add just because I said the way you first
implemented it was ugly … Remove the shitty explainer line under the
ticking of types … if it's about the specifics of how the prompt works …
save that shit for the help area." Broken down in docs/FEEDBACK.md
(Testing 6).

### How to decide

- **What it is for.** Two ways to choose what a lecture is made of, both
  wanted: let the AI choose the kinds that suit the material (most
  students, most of the time), or make only the kinds I tick (a student
  who wants only flashcards gets only flashcards).
- **What it must keep.** Both ways, visible and named, each one tap away;
  the boxes in view (the owner preferred the boxes in view to a choice that
  hid them, Round 4); no sentence under the controls explaining them; "how
  it decides" in Help.
- **Who meets it.** A first-time student, right after the first run, and a
  regular making their tenth lecture who just wants to copy the prompt.
  The first must understand it from the labels alone; the second must not
  have to touch it.

### The options

- **A. A master box above the kinds** ("Any kind that suits it"), the kinds
  greyed and ticked under it. For: one control, boxes in view. Against: a
  box above boxes reads as "tick all", so the AI choosing is never named as
  a way of its own; it is the "all ticked means the same" reading the owner
  rejected.
- **B. Two named ways, the boxes shown only under the second.** For: the
  clearest pair. Against: hides the boxes in the AI's way, which is what
  Round 4's "What suits my material" did and what the owner found less
  clear than boxes in view.
- **C. Two named ways side by side, the boxes always in view under them.**
  "The AI chooses" and "Only these", set as the app sets every one-of
  choice (the selected one in the accent, underscored: the minute choices,
  the class pick). Under them the boxes: in the AI's way they show every
  kind, ticked and quiet (the AI may use any of them); touching any box
  moves to "Only these" with that box changed, so the boxes are never
  dead. For: both ways named and one tap away, the boxes in view, the
  state of the boxes always says what will be made, the app's own form.
  Against: one more line than today.
- **D. Keep the boxes only, and name the state** ("Make: whatever suits it"
  when all are ticked). Against: no control for the AI's way, only a
  caption that changes; the owner asked for the option, not a label.

### The pick: C

It is the only one that gives the AI's way a name and a control of its own
(A and D don't), keeps the boxes in view (B doesn't), and explains itself
by its labels and by what the boxes show, with no sentence under it. The
quiet ticked boxes in the AI's way are the explanation: every kind is open
to it.

### The build

1. `MakeKindsField` takes a mode: `ai` or `only`. The pair at the top of the
   Make row; the boxes under it, ticked and in `text-text-3` in `ai`; any
   box tapped in `ai` switches to `only` with that box toggled. In `only`,
   "Choose at least one" stays (in the error colour, only when none). The
   explainer line and "Tick all" go.
2. The prompt: `ai` sends no WHAT TO MAKE block (the spec's "Which type for
   what" decides); `only` sends the block for the ticked kinds, as now.
   `only` with every box ticked is the same prompt, which is right.
3. New lecture and Add material both use it.
4. Help, New lecture: a passage on what each way does and how the AI
   decides (from the spec's "Which type for what", in plain words). The
   "why attach" fold from step 2 moves there too (Testing 7).
5. EXPECTATIONS (New lecture), What's new, the tests that find these
   controls by their words.
