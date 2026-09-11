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

## Data & compatibility

Course data and study progress live in the browser's `localStorage`. This
app succeeded an earlier vanilla-JS version deployed at the same URL;
`src/store/migrateLegacy.ts` imports that version's data once on first load
so existing users don't lose their library.
