---
name: arborous-design
description: Arborous's design language and how to check a UI change against it — the book/herbarium look, the copy rules, phone-first layout, both themes. Use before changing anything a student sees in Arborous (a screen, a component, a label, a toast, Help text, an icon, the tree, a diagram style), when adding a feature that needs UI, and before shipping any UI change. Load it together with the general app-making skill; where they differ, this one wins for Arborous.
---

# Arborous design

Arborous is set like a printed book, or a herbarium sheet. Several passes
went into getting away from the look of a generic web app; every UI change
should move further from it, never back. `docs/HANDOFF.md` §2–3 has the
reasoning; this is the working version.

## The look

- **Type.** Fraunces throughout (a book is set in its text face). Labels in
  small caps with `.mark`. Display sizes only for page titles.
- **Structure, not boxes.** Lists are ruled (`border-y border-border`), not
  cards. The library is a contents page: roman numerals, figures in a
  right-hand column, dot leaders. A course's facts are a specimen label
  (`SpecimenLabel.tsx`), ruled fields, not a sentence of statistics.
- **No web furniture.** No cards in a grid, rounded filled boxes, pills,
  gradients, glass, decorative shadows or emoji. A selected filter or choice
  is underscored (`text-accent underline decoration-accent decoration-2
  underline-offset-4`), never filled. See `IndexLine` in `LibraryRoute.tsx`
  and the minute choices in `ExamDialog.tsx`.
- **Buttons.** `press` with its ink underline; `press-ink` for the one main
  action on a screen. Text links are quiet (`text-text-3 hover:text-text`).
- **Colour.** Only theme tokens (`text-text`, `text-text-2`, `text-text-3`,
  `text-accent`, `border-border`…), never literals. Both themes must pass
  `node scripts/contrast-report.mjs`.
- **The tree** follows the contract at the top of `src/lib/growTree.ts`: no
  primitives, no mirror symmetry, three line weights, `currentColor`,
  deterministic per course. Vary continuous traits; never named species (they
  were tried and could not be told apart).
- **Motion** is small and means something (leaves falling and budding), and
  everything respects `prefers-reduced-motion`.
- **Icons** are hand-set paths in `src/components/iconPaths.ts`, same stroke
  weights as the drawing. No icon library.

## The words

- Plain, short, concrete; like a careful person wrote it. No buzzwords, no
  slogans, no "AI" tone.
- **No em dashes** in anything a student sees. Use a period, comma or colon.
  Check with `node scripts/ui-dashes.mjs` (the prompts in
  `src/lib/build*Prompt.ts` are exempt: only the AI reads them).
- Name a control by what the student does ("upload a file instead"), never
  by the data model ("open a saved reply", "Subjects" for tags).
- The reason to come back is when knowledge will fade, never a streak or
  guilt.

## Layout and behaviour

- **Phone first.** Design at 390px. The main action stays in thumb reach
  (the pinned Start bar on the course page). Tap targets come from
  `tap-safe` (44px on touch).
- With real data, filters and headers must still leave content on the first
  phone screen. Long lists of choices fold behind one line.
- Every page has a visible "← Library" (or "← Back") at the top left.
  Anything that opens can close. Anything destructive has Undo (a toast with
  an action), never a browser `confirm`.
- Every screen sets a tab title (`useTabTitle` in `RootLayout.tsx`).

## Checking a change

1. `npm run build`, then `node scripts/screenshots.mjs <outDir>` (outside the
   repo, e.g. the scratchpad). It shoots every route at phone and desktop
   size, populated and brand-new, both themes, with real touch media.
2. Open the screenshots of every screen the change touches and look: phone
   first, then desktop, light and dark.
3. For a state the script doesn't create, drive the built app with
   Playwright (`npx vite preview --port 4173`, base path `/study-app/`; seed
   `localStorage` keys `arborous:courses` and `arborous:onboarding` =
   `{"state":{"onboarded":true}}`).
4. `node scripts/contrast-report.mjs` if a colour or token changed.
5. After shipping, confirm the live site serves it (grep the live JS for a
   string from the change), then report what you looked at.
