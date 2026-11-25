# Brief: part 4, the design update with the first run

For the session that leads part 4. Written 2026-11-25 at the end of a long
session with the owner, so nothing here depends on that chat. Read it all
before anything else, then the documents it names.

## Who and what

The owner is a university student who built Arborous to study their own
classes, and uses it daily (PSYC, BIOL and others). They care about the app
teaching well first, and about it feeling made, not generated: "intuitive
and cleaner more elegant feel, everything should look and feel
intentional"; "I really want this app to not look like vibe coded slop".
They read replies partway and answer what they reach: keep replies short,
and put every question and every decision you took alone at the bottom,
set apart (CLAUDE.md, "The end of every reply").

## Read first, in this order

1. `CLAUDE.md`: the owner's picture of the app, dated, in their words, and
   how to work here (ASKS, ripples, agents, models, plans).
2. `docs/ASKS.md`: every open ask, in the owner's words. Part 4 covers the
   ones on the design update, the first run, the app's own terms, the daily
   time in the first run, the library Today look, and rearranging lectures
   if it fits.
3. `docs/proposals/design-update.md`: the plan for part 4, with the owner's
   answers at its end.
4. `docs/proposals/onboarding.md`: the first run's plan, with the owner's
   direction of 2026-11-24 at its end.
5. `docs/proposals/ecosystem.md` (the ways to study as one system, and what
   the simulator changed) and `docs/proposals/zen.md` (the adaptive quiz).
6. `docs/EXPECTATIONS.md`: what every feature does now; update an entry
   when its behaviour changes.
7. `docs/RIPPLES.md`: what else to check when something changes.
8. `.claude/skills/arborous-design/SKILL.md` (load the skill): the book
   look, the words, phone first, how to check a screen. Load `app-making`
   too.
9. `docs/HANDOFF.md` for the longer history, as needed.

## Where things stand

- Work branch `claude/project-status-review-rv4e28` holds, ahead of
  `main`: part 1 (Today on the library as suggestions), part 2 (the
  adaptive quiz), part 3 (a removal pass of dead code). The owner has seen
  them (a one-page presentation) and agreed, but said to **hold all of it
  until part 4 is done**, then ship together. Do not merge to main before
  the owner says so.
- The simulator put the adaptive quiz a little below Today as the daily way
  in (`sim/FINDINGS.md`, 2026-11-24): Today stays the daily button; the quiz
  is its own mode. Do not retire Today or Practice's ready-made sittings.

## Part 4: what the owner asked, and what is decided

Read the owner's words in design-update.md and onboarding.md; in short:

- **The scope is every screen, on both formats** (the owner, 2026-11-25,
  reading this brief: "The goal is to make the platforms have distinct
  feels, ui/ux, that take full advantage of the benefits and downsides of
  the form factor the user is engaging on", and the phone must get as big
  a change as the computer, not a narrowed computer layout). The plan
  below names few phone changes and few screens; it is a start, not the
  scope. Before building, list every screen (library, class, lecture,
  section, each kind of card in a sitting, the end of a sitting, Practice
  and the practice test's setup, making a lecture, Progress, Help,
  settings, the first run) and decide for each what it is on a phone and
  what it is on a computer, from each format's strengths and limits:
  - *Phone*: a thumb, touch and gestures, motion, the bottom of the screen
    within reach, no hover, typing is slow, a few minutes at a time and
    often interrupted, one thing on screen. Ideas to weigh, not decided:
    controls and navigation at the bottom in thumb reach; panels as
    sheets pulled up from the bottom (the glossary, settings, Practice's
    ticks); swipes where they are natural (next card, a flashcard's
    verdict); picking up exactly where an interrupted sitting stopped;
    written answers made bearable to type.
  - *Computer*: width, a keyboard, a pointer that can hover, long
    sittings. Ideas to weigh: the spread and the margins below; the
    keyboard for everything, not only answering; hover to preview (a
    branch, a section, a term); side by side where a phone goes one after
    another (your answer beside the passage; the prompt beside where to
    paste; all of Practice's ticks at once).
  - Motion that teaches belongs to both: the tree's unfurl and its leaves
    falling on opening a lecture play on a computer too (on the spread's
    tree); only the finger sweep is phone-only (hover does it on a
    computer).
  Show this screen-by-format table to the owner with the plan, before
  building.
- **Each format used for what it is good at.** Phone: one hand, one thing
  at a time, motion. Computer: width, showing several things at once.
- **Phone, opening a lecture**: the tree unfurls, and that is when the
  faded leaves fall, not when a finger sweeps over it; the sweep keeps
  naming a branch. Try a small shake that brings the leaves down (the
  owner's idea of 2026-11-25), against a plain fall.
- **Computer, the lecture page**: an open spread (left page: the tree large,
  its state, the sections; right page: the ways to study, and a picked
  section's detail beside it). Agreed.
- **Computer, a sitting**: the tree large in the left margin, the card in the
  middle, the glossary in its own right column that never covers anything,
  and only the keys that work on the card in one line under it. Agreed.
- **The tree in a sitting grows a leaf only when a part is shown to be
  understood** (the tree's own measure, as on the lecture page), not after
  every right answer, and **never drops one on a wrong answer**: leaves fall
  only when knowledge fades from not practising.
- **The first run is something to do, not to read**: the student makes the
  tree grow and watches leaves fall when a part goes unstudied (that is
  where "fading" is taught), tries the few gestures that matter with their
  attention drawn to each, a line of words at most; it asks the daily time.
  The owner's original picture: branches unfurling, the name appearing, an
  explanation, then a demo of sweeping across the branches.
- **The app's own words**: list every term the app made up (fading, due,
  step, Recall, Apply, set aside, catch-up, Today...) and decide for each
  where it is taught, or replace it with plain words. Library Today reads
  "questions to review" until the first run teaches "fading".
- **The library Today's look** is part of this; its logic is done (part 1).
- Later ideas, not part 4 unless they fit naturally: a "scantron" tick on
  the practice test, interactive diagrams, rearranging lectures.

## How to work

- **Build on the branch, show the owner, take feedback, then merge**
  (2026-11-24). Show each step as one clear page (the owner: "make it like a
  presentation almost but don't waste too much usage", and earlier showings
  were "always unclear what was what"): one section per change, before and
  after, real screenshots from the app with fixture data, a "where to look"
  line for each, and the questions at the end. The page sent for parts 1-3
  worked; build on that form.
- **Plan before building**, as CLAUDE.md says, and write it in
  docs/proposals/. The plans exist; refine them where building shows a
  better way, and say so.
- **Agents**: Sonnet 5.5 for exact-spec layout and mechanical edits, named
  explicitly; you judge, review every diff and run the checks. Say before a
  large fan-out; usage is limited.
- **Ripples**: every change walks its row in docs/RIPPLES.md (Help,
  EXPECTATIONS, What's new, the first run's words, tests).
- **Checks**: `npm run build`, `npx eslint src`, `npx vitest run`; screens
  with `node scripts/screenshots.mjs <dir>` (outside the repo), phone and
  computer, light and dark, then walked as a student. `node_modules` no
  longer has Playwright locally (a package uninstall pruned it): import the
  global one (`$(npm root -g)/playwright/index.mjs`) and launch with
  `executablePath: '/opt/pw-browsers/chromium'`.
- **Effort**: the owner runs this first pass on high effort; the feedback
  round may be medium; a final high-effort pass stress-tests the result,
  reviews the code and visuals, and fixes what was done poorly.

## The three stages, and their codes

Part 4 runs as three sessions, one after another. A session cannot start
the next one itself (cloud sessions do not have that tool), so each stage
ends by telling the owner, at the bottom of its last reply: "Next: start a
new session on the branch claude/project-status-review-rv4e28, <effort>
effort, and type P4-n."

A session that receives only a code (`P4-1`, `P4-2`, `P4-3`) reads this
brief in full, then does that stage. Read the dated lines at the end of the
brief first: they say where the last stage left off.

**P4-1 · Build** (high effort). Plan, build every part 4 piece on the
branch, check it, and present it all as one page (the form above). Small
questions on the way are fine; the big feedback round is P4-2's. Ends by
telling the owner to start P4-2 (medium effort) and give their feedback
there.

**P4-2 · Feedback** (medium effort). Starts by reading this brief, the
branch's latest presentation page and the commits since parts 1–3, then
waits for the owner's feedback. Fixes what they say, shows the changed
screens the same way, repeats until the owner says it is right. Ends by
telling the owner to start P4-3 (high effort).

**P4-3 · Final check** (high effort). Stress-tests the whole branch (parts
1–4) as a student would on a phone and a computer, both themes, a first
run from nothing, an existing library, reduced motion; runs the
code-review and simulate skills where they apply; fixes what was done
poorly; walks every ripple. Presents the result and what it fixed, then,
**only when the owner says yes**, merges to main, checks the live site,
and closes the asks in docs/ASKS.md.

Each stage writes down at the end of this brief what it did and what is
left (a dated line), so the next stage, or a session started by hand,
knows where things stand.

## Where things stand

- **2026-11-25, P4-1 done.** Built on the branch and presented as one page:
  https://claude.ai/artifact/PhPcZc61RynCUfeDQGFZ38 (private to the owner).
  The plan with every screen on both formats, the owner's yes to it, and
  what building changed are in docs/proposals/design-update.md; the app's
  words in docs/proposals/terms.md. Built: the tree's arrival (grows out
  from the trunk, faded leaves fall with a shake; dashed growth and a
  plain fall kept as switches, `GROWTH` and `ARRIVAL_FALL` in
  CourseTree.tsx, for the owner to pick), Sheet and ThumbBar, the lecture
  page as a spread on a computer and sections as sheets on a phone, the
  sitting with margins on a computer and controls at the bottom with
  swipes on a phone, the library and class page, Practice and the test,
  the quieter pages, every dialog as a sheet, the first run, "due" to "to
  review", New lecture's class pick. Not built: the end of a sitting on a
  computer, the class check when a file comes back, hover-a-term in a
  card, J and K outside the glossary. Unchecked: real iPhone Safari and
  real touch. The page's four questions wait on the owner in P4-2.
