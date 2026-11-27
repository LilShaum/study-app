# Diagrams, end to end: how, when and why they are made, and how they teach

The owner, 2026-11-27 (docs/ASKS.md, in full there): diagrams need
attention "in every level it is handled in this app … how they are made and
their quality and when they are made and why they are made and this leads
into the interactive diagrams". Last resort, only where a figure is
important but too complex to reproduce well: put a picture of it from the
student's own notes into the course, though it "wouldnt match with the
theme of the app so id prefer the improving diagrams in general and making
interactive illustrative diagrams instead".

This plan also answers the ask marked for later on 2026-11-23, interactive
diagrams (the aphasia diagram: "the pathway of speach info and which
connection or part is damaged in the different aphasias and what that
causes"), including its open question: "free reign with only little
guidelines … or … more strict".

Size: **macro**. A student should notice that diagrams look like part of
the app, that there are more of them where they help, that the important
ones can be played with, and that they get asked about. The cheap version
not to build: a few more rules in the prompt about SVG neatness.

## 0. How this is decided

1. **What a diagram is for.** The teacher pointed at a figure and walked
   through it. A diagram in Arborous does that walk for a student who never
   heard it: what the parts are, how they connect, in what order, and what
   happens when one changes. A figure marked "to know" must also be
   learned, which means retrieved, not only read.
2. **Who meets it.** Every student, in Learn's Read step, on the section
   page and on the lecture's Diagrams page; on a phone first.
3. **Evidence.** The research the app stands on (docs/evidence.md) says
   reading never replaces retrieval, and that a diagram showing a problem's
   structure helps with worked examples. Multimedia-learning research in
   general (signalling what to look at, segmenting a process into steps the
   learner paces, words placed next to the part they name) supports the
   step-through and tap-a-part design below; I will add the citations to
   docs/evidence.md with the PubMed connector before building, and nothing
   here depends on a claim stronger than those.
4. **What the code does now** (section 1).
5. **Built for any class.** Nothing turns on from a subject. A lecture
   with no mechanisms, cycles or comparisons gets no diagrams and loses
   nothing.

## 1. What happens today, level by level

| Level | Today | What is wrong with it |
|---|---|---|
| **When** | Prompt: a `graphic` for "each figure the lecture turns on", none for decoration; Pass 1 marks each `know` or `picture`. | Only figures already on the slides. A mechanism or comparison the bullets describe with no figure gets none, though that is exactly the narration a student who missed class lacks. The one real lecture tested (narration.md) got 2 diagrams for a lecture that turns on a dozen figures. |
| **How** | The AI hand-writes raw SVG: every coordinate, every arrowhead, every label position. | This is what language models are worst at. Labels collide, arrows miss their boxes, text runs off the edge on a phone, fonts are generic sans-serif, not the book's type. Each diagram looks different from the next. It also costs many output tokens. |
| **Can't redraw** | `where` only: "In your own notes: slide 10". | A student without the slides, the case the app exists for, gets a sentence pointing at nothing. |
| **Shown** | A read-only card: title, `why`, the picture, caption. In Learn's Read step, the section page, the Diagrams page. | Nothing to do with it. A ten-step pathway is shown all at once; the student cannot tap a part, step through it, or see what breaks when a part fails. |
| **Tested** | Never. A diagram is read, never scored. The lecture check only reports a `know` figure that no text question mentions. | The figures the slides say to know are the ones a student most needs to retrieve, and the app never asks them to name a part, put steps in order or predict what a broken step causes. |
| **Safety** | `prepareSvg` cleans with DOMPurify and forbids animation and scripts. | Right for raw SVG, and it rules out interactivity in that format for good. |

## 2. How diagrams are drawn: three real options

**A. Keep raw SVG, write better rules.** Grid sizes, label spacing, fonts.
- For: no app change, files stay as they are.
- Against: the fault is the format. A model placing coordinates blind
  cannot check overlaps however well it is told; quality stays uneven by
  model and by lecture; still static; still untestable.

**B. The AI describes the diagram, the app draws it.** A small vocabulary
of diagram kinds in JSON (parts, connections, order, groups, what-ifs);
the app lays it out, in the book's type and colours, in both themes, at
phone width.
- For: models are good at structure and bad at geometry, so this plays to
  their strength. Every diagram looks like Arborous and stays legible.
  Interactivity and questions come from the same data at no extra cost to
  the AI: the app knows what each part is, so it can hide a label, step
  through the order, or break a link. Shorter to write than SVG. Safe: it
  is data, never markup.
- Against: a fixed vocabulary cannot draw everything (a brain, a cell, a
  map). Real app work: a layout engine and renderer per kind.

**C. Free rein: the AI writes its own interactive HTML and script**, run
in a locked-down frame.
- For: anything is possible, including the aphasia diagram exactly as the
  owner saw it.
- Against: courses travel by share link, so this runs someone else's code
  in the student's app; a sandbox makes that defensible but never free of
  risk (security-review). Each diagram looks and behaves differently, none
  matches the theme, quality swings with the model, and the app cannot
  quiz on what it cannot read. It is also the most expensive thing the AI
  can be asked to write.

**Pick: B, with raw SVG kept as the fallback for the odd figure no kind
fits.** It is the only option that improves quality, interactivity and
testing at once, and it answers the owner's free-rein question: strict in
form (a vocabulary the app draws), free in content (the AI decides what
the parts, links and what-ifs are). C fails the theme and the share-link
safety; A treats the symptom.

### The kinds (first version)

| Kind | For | What a student can do with it |
|---|---|---|
| **Flow** | pathways, processes, signal routes, cause and effect, any "A leads to B" | step through in order; tap a part for its note; **what if**: break a part or a link and see what downstream fails and why (the aphasia diagram, an enzyme inhibitor, a mutation, a blocked receptor) |
| **Cycle** | stages that return to the start | step round it; what-ifs as for flow |
| **Compare** | 2 to 4 things on the same dimensions (types of aphasia, mitosis and meiosis, two theories) | switch between them on one drawing, the differences lit; the row that tells two neighbours apart is marked |
| **Tree** | classifications, hierarchies, decision trees | open and close branches |
| **Plot** | a curve or two whose shape is the point | toggle cases (with inhibitor, without), read off a marked point |
| **SVG** | anything else the AI can honestly draw | as today, with the app's colours |

What-ifs are the heart of it: the lecture's own "what happens when this
fails" turned into something the student does. They are only written where
the lecture teaches the consequence; nothing is made up to fill one.

## 3. When a diagram is made

Today: one per figure the lecture turns on. Proposed, decided in the
generator's Pass 1:

1. **A figure the slide's text talks about** (pathway, cycle, structure the
   bullets name): redrawn as a kind, marked `know`. As today, but drawn
   well.
2. **A mechanism, process or comparison the slides describe in words with
   no figure** (new): a diagram where a picture makes the relationship
   clearer than the sentences; this is the narration the teacher drew on
   the board. Grounded in the slides like everything else, never invented.
3. **A figure there only to paint the picture**: a short `why`, a drawing
   only if it helps, marked `picture`.
4. **A figure that matters but cannot be honestly redrawn** (an anatomical
   plate, a photograph, a micrograph, a results graph from a paper): the
   last resort in section 5.
5. **Interactive only when there is something to do**: an order of four or
   more steps, a what-if the lecture teaches, or cases to compare on one
   drawing. Otherwise it is a still diagram, and that is fine.

## 4. How diagrams teach and get tested

- **Read (Learn's Read step):** the diagram appears with its `why`. A flow
  or cycle opens on its first step and the student taps through; each step
  shows its note beside the part. A what-if is offered as "What if … ?"
  under the drawing.
- **Recall:** for a `know` diagram, the app makes its own questions from
  the diagram's data: name the hidden part, put the steps in order. These
  are questions like any other (scored, scheduled, come back when fading),
  so they follow Learn's order: never straight after the reading
  (CLAUDE.md, "Never read and then name straight away").
- **Apply:** "If this link is cut, what happens?" from a what-if, with the
  lecture's consequence as the answer and the other what-ifs' consequences
  as the wrong options: wrong answers that are the neighbouring case, which
  is the kind the owner wants.
- **Diagrams page:** the same interactive diagrams, so a student revising
  can play with every one in a lecture in a row.
- **Practice and the test:** diagram questions join the kinds a student can
  tick.

This also closes the lecture check's "figure to know that nothing asks
about": a `know` diagram asks about itself.

## 5. The last resort: the student's own figure

The generating AI writes text; it cannot paste a crop of a PDF into the
file. So a "screenshot from the notes" has to come from the app:

- **Option 1, the app shows the slide.** The student adds their slides'
  PDF to the lecture once; for a figure with `where: slide 10` the app
  shows that page, which the student can trim to the figure. Stays on the
  device, never in the course file or anyone's share link (the slides are
  theirs and may be the teacher's copyright).
- **Option 2, the student adds a picture.** On the figure's card: "Add the
  figure from your notes", from a screenshot or a photo. Works for any
  source (slides, a textbook page, handwritten notes).

To fit the theme, the picture is shown as a mounted plate: a paper frame,
the `why` beneath it, like a pressed specimen in the herbarium the app's
look comes from, so a picture from outside reads as deliberate.

**Pick: both, Option 2 first** (small, works for every source), Option 1
after (smoother for slides). Either way this is phase 3, after the drawn
diagrams, as the owner asked.

## 6. Build plan

**Phase 1: diagrams the app draws, interactive** (the large part)
1. Schema: a `diagram` field on `graphic` with the kinds above; old files
   with `svg` still open and look as they do. Safety review of the new
   renderer (data only, no markup) and of the SVG path.
2. Renderer and layout for flow, cycle and compare first, in the book's
   type and colours, both themes, 390 px wide; step-through, tap a part,
   what-ifs. Tree and plot after.
3. Generator: rewrite the diagram passages (sections 3 and the kinds),
   coordinated with the "Make generated courses trustworthy" thread, which
   is also editing the prompt. Lecture check and Fix learn the new field.
   That thread (PR #3, 2026-11-27): build on its version of the prompt;
   it adds `source_page` to every item shape, and `lib/sourceCoverage.ts`
   counts a graphic's `where` as the slide it covers, so `where` keeps a
   slide reference (or tell that thread if it moves).
4. Test lectures: the made-up fixtures, plus a lecture with a what-if made
   on Opus 5.5 at high effort as the app hands the prompt out. The aphasia
   pathway is the showcase test.
5. Checks: build, lint, tests; screenshots of every screen it touches in
   both themes; before/after; the fresh-eyes design critic; code and
   security review; a phone preview for the owner.

**Phase 2: diagrams in the questions.** The owner, 2026-11-27: "what
about diagrams for example of an action potential and the user has to fill
in the blanks of the diagram? … it might be a whole thing that will require
a lot more planning and testing and iterating and ripple checking". That is
the "name the hidden part" question above, done on the drawing itself: the
diagram is shown with some parts' labels blanked and the student fills
them in (typed, or picked from the hidden labels), marked per blank. Phase
1's format already makes it possible, since every part has an id and a
label the app can hide. An action potential is a curve with named phases,
so it needs the plot kind (labelled points on a curve) first. Its own
plan before building: which parts to blank and how many at once, typed or
picked, how a half-right diagram is scored and scheduled, how it sits next
to name-the-term cards so the same label is not asked twice in a row, and
its place in Learn's Recall. Name the part, order the steps,
what-if questions; scheduled like any card; Practice kinds; simulator run,
since it changes what Learn and Review serve.

**Phase 3: the student's own figure** (section 5), Option 2 then Option 1.

Each phase is one pull request into the part 4 branch, shown on a phone
preview before merge. Ripples for each: Help, EXPECTATIONS, the generator,
Add material/explanations prompts, the lecture check, What's new.

## 7. Cost

Phase 1 is the biggest single piece of app work since part 4: several
sessions of building. The renderer is something a student sees, so the
session builds it; agents (Sonnet 5.5) do the schema tests, the fixtures
and the layout maths to an exact spec. Phase 2 is about half of phase 1;
phase 3 about a quarter.
