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
