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

## Adding to a course

"Add material" on a course page is a two-step, no-API-key flow: it copies a
prompt preloaded with that course's section ids, taken item ids, tag
vocabulary and already-covered prompts; you paste that into an AI chat with
your new notes and paste the returned JSON straight back. The paste is
previewed (what gets added, where, what's skipped as a duplicate, which ids
are renamed) before anything is committed.

The prompt embeds `CLAUDE.md` via a `?raw` import, so the spec the app hands
out can't drift from the format it parses — edit `CLAUDE.md` and both change.
`src/lib/mergeFragment.ts` holds the merge logic: `planMerge` computes,
`applyMerge` applies, both pure.

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
- Study sessions can't jump between sections; Browse can.
- Course metadata (title, description, tags) isn't editable in-app — edit the
  `.study.json` and re-upload, or regenerate it.
- Duplicate detection when adding material compares the item's leading text
  (question / front / term / title) within the same item type. It catches
  re-runs, not two genuinely different wordings of one fact.
- No ESLint config, and most UI components have no test coverage.
