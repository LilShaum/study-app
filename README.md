# Arborous

A study companion — flashcards, MCQs, definitions, worked examples, and
diagrams — built from `.study.json` course files. Installable as a PWA;
deployed to GitHub Pages.

## Develop

```
npm install
npm run dev        # http://localhost:5173/study-app/
npm run build       # production build to dist/
npm run typecheck
```

## Stack

React 18 + TypeScript + Vite, Tailwind CSS, Radix UI primitives, Zustand for
state, React Router v6 (`createHashRouter` — required for GitHub Pages'
static hosting), Zod for validating `.study.json` files.

## Project layout

```
src/
  app/          root layout, error boundary
  routes/       one component per route
  components/   item cards (MCQ/flashcard/definition/example/graphic),
                theme picker, toaster
  store/        Zustand stores — courses, progress, theme, session, onboarding
  schema/       Zod schema + parser for the .study.json format
  lib/          small pure helpers (slugify, shuffle, session building)
  sw.ts         service worker source (vite-plugin-pwa, injectManifest)
```

## The `.study.json` format

The full schema lives in `src/schema/course.ts` (Zod, with TypeScript types
inferred from it) — that file is the source of truth. `CLAUDE.md` is a
*separate* thing: it's the system prompt for the AI conversation that
generates `.study.json` files from a student's notes, not instructions for
working on this app.

## Starting a course

The app ships with no content and no assumption that you already have a
`.study.json`. **New course** on the library page hands you the generator
prompt — `CLAUDE.md` verbatim, via a `?raw` import, so it cannot drift from
the format the app parses — to paste into an AI chat with your slides
attached. Paste the JSON it returns straight back into the same dialog, or
open a saved file if you kept one.

## Adding to a course

"Add material" on a course page is a two-step, no-API-key flow: it copies a
prompt preloaded with that course's section ids, taken item ids, tag
vocabulary and already-covered prompts; you paste that into an AI chat with
your new notes and paste the returned JSON straight back. The paste is
previewed (what gets added, where, what's skipped as a duplicate, which ids
are renamed) before anything is committed.

"More practice" is the second mode of the same dialog, for when you already
know the existing questions. It needs no notes at all: every item recorded a
`source_excerpt` from the original source, so the prompt hands those back,
grouped by section, as the material to write new questions from. That
reconstruction is lossy — anything the first pass skipped left no excerpt — so
the prompt asks the model to prefer your original notes if you paste it into
the chat that generated the course, and fall back to the excerpts otherwise.

`src/lib/courseGaps.ts` works out where a course is weak — terms that are
defined but never named by any MCQ or flashcard, sections with nothing
scorable, a low gradable ratio — and the practice prompt names those as
priorities, so a second round targets the gaps rather than producing more of
the same.

The prompt embeds `CLAUDE.md` via a `?raw` import, so the spec the app hands
out can't drift from the format it parses — edit `CLAUDE.md` and both change.
`src/lib/mergeFragment.ts` holds the merge logic: `planMerge` computes,
`applyMerge` applies, both pure. Both modes merge through it.

## Study modes

Eight modes, all built from the items the course already contains — nothing
calls a model at study time. Six are filters over one item type or all of
them (Quiz, Flashcards, Definitions, Mixed, Browse, Review Missed); two are
orderings, which is the more useful idea:

- **Learn** sequences a section the way it would be taught — definitions and
  worked examples first, then flashcards, then MCQs — and finishes one section
  before starting the next. It drops nothing, so the course page's Learn tile
  always shows the full item count, and a banner names the stage you are in
  (`LEARN_STAGES` in `src/lib/buildSessionItems.ts` is the single definition
  of that sequence; the banner reads it).
- **Weakest First** ranks the gradable items by your own accuracy. It is not
  Review Missed with a different name: Review Missed is the binary filter
  `missed > got`, which silently drops an item you get right three times in
  five — exactly the item most likely to cost marks. Never-attempted items
  sort between what you fail and what you have nailed, which also means the
  mode is never empty on a fresh course.

Only MCQs and flashcards are scored; definitions, examples and diagrams are
read, so they never move an accuracy figure. `#/study/:id/diagrams` collects
every diagram in a course onto one page, grouped by section — the link appears
on the course page only when the course actually has diagrams.

`#/help` documents all of this in the app, including the things that are not
discoverable by clicking: what the two add-to-course prompts differ on, what
the course check panel can and cannot verify, the keyboard shortcuts, and
where the data lives.

## Resuming

`src/store/resume.ts` keeps one bookmark per course — mode, section, item —
and the course page offers a Continue bar. It stores an *item id*, not a
position, because a position would be wrong for half the modes: Mixed and
Review Missed reshuffle on every start and Weakest First reorders as accuracy
changes. An id also survives the course being edited around it; when it no
longer resolves, the session starts at the beginning. Opening a mode from its
own tile always starts fresh, so resuming only ever happens when asked for.

## Sections

Every section on the course page opens its own page: what it contains by type,
its own accuracy, and study modes scoped to it. A scoped session is a search
param — `#/session/:id/quiz?section=<id>` — so every existing session link
still means what it did. Per-section progress needs no new storage: progress
is already keyed per item id and a section knows its items, so the figures are
a slice of the map that already exists.

## Checking coverage

Every course the generator produces declares its own inventory in
`metadata.inventory.terms` — the term list it built while reading your notes.
The course page shows what fraction of that list actually got a definition,
names the ones that didn't, and flags structural faults (duplicate ids,
misaligned answer explanations, terms that are defined but never tested).

This is self-attestation: the app holds the generator to its own list, which
proves a course failed its own checklist but cannot prove the checklist was
complete. For that you need the source, which the app never sees — see below.
`metadata.inventory` is optional, so courses generated before it existed still
load and simply show no coverage figure.

## Auditing a generated course

`scripts/audit-course.mjs` checks a `.study.json` against the notes it claims
to come from — the things the schema can't express:

```
npm run audit -- course.study.json source.txt
npm run audit -- course.study.json source.txt --terms terms.txt
# for slides: pdftotext -layout lecture.pdf source.txt
```

It verifies that every `source_excerpt` really appears in the source (the
check that catches fabricated content), that MCQs honour the contract in
`CLAUDE.md` (four options, an in-range 0-based `correct_index`, an
index-aligned `distractor_rationale`, no "all of the above" filler), that ids
are unique, that diagrams carry no scripts or event handlers, and that the
metadata counts are true. Exit code is 1 on any hard failure, so it can gate a
workflow. Dependency-free — it runs against a course file without installing
the app.

With no `--terms` file it falls back to the course's own
`metadata.inventory.terms`, so the coverage check runs by default.

`--terms` takes a marking scheme of the jargon the notes introduce — one
concept per line, `|` separating acceptable synonyms, `#` for comments. The
audit then reports what fraction of those terms actually got a definition and
names the ones that didn't. This is the check that catches the failure mode
the prompt is built to prevent: a course that is internally consistent and
fully grounded, but quietly covers a third of the syllabus. A companion
warning flags terms that are defined but never appear in any MCQ or
flashcard — shown to the student, never tested.

It checks the contract, not the truth of an answer: whether `correct_index`
points at the genuinely correct option still needs a human.

## Data & compatibility

Course data and study progress live in the browser's `localStorage`. This
app succeeded an earlier vanilla-JS version deployed at the same URL;
`src/store/migrateLegacy.ts` imports that version's data once on first load
so existing users don't lose their library.

## Known gaps

- Sections can be reordered in a course file via `section.order`, but items
  within a section always display in array order.
- The item edit form can change an MCQ's option text but not add or remove
  options.
- Course ids are derived from `course_code` (falling back to `title`). A
  second course that slugs to the same id gets a suffixed id rather than
  overwriting, but the ids are still not human-chosen.
- Duplicate detection when adding material compares the item's leading text
  (question / front / term / title) within the same item type. It catches
  re-runs, not two genuinely different wordings of one fact.
- No ESLint config, and most UI components have no test coverage.
