# Build the open asks, before the grading session

**To start it** (the owner): open a fresh session on this repo on max (or
ultracode), attach what is listed below if you have it, and say: *"Read
docs/prompts/build-the-open-asks.md and do it."*

**Attach, if you can**: the **slides** (PDF) of one real lecture, nothing
else. The session makes the lecture's file from them itself, with the
prompt as it is then, and again after changing the prompt, to compare the
two. Steps 1 and 3 are judged against it. The slides stay out of the repo,
which is public. Not the owner's study data: they use the app too little
for it to say anything (see `grade-the-app.md`).

---

## What you are doing

Build what the owner has asked for and is still open in `docs/ASKS.md`, so
that the grading session (`docs/prompts/grade-the-app.md`), which the owner
runs after this, grades the app they asked for. The session-start hook
prints the Open list; that list, not this file, is the source of truth if
they differ.

## Read first

`CLAUDE.md` (what the app is for, how the owner works: plan first, use
agents, done means live), then `docs/ASKS.md`, then the proposals each step
names. Load the skills each step needs when it starts (`working-method`,
`simulate`, `arborous-design`, `app-making`, `code-review`,
`security-review`).

## The work, in order

1. **The teacher's narration** (ASKS: "Slides are the skeleton of a
   narrated lecture"; CLAUDE.md, the slides line). The generator works out
   why each slide was shown and what a run of slides builds to, then drops
   it ("the map is not part of the output", `prompts/generator.md`, Pass 1).
   Keep it, and give it to the student in the teacher's place:
   - for each section, what its slides build to;
   - for each diagram, why it is there and what to see in it;
   - the comparisons the slides imply.

   Plan it first in `docs/proposals/` (the owner's method: how to decide,
   the options argued, a pick, then the build plan). It changes the
   lecture file, the prompt and Learn. Learn's order is set ("no drastic
   changes to how it teaches"; Read, Recall, Apply), so the narration joins
   it rather than reshaping it. Check the prompt change on the real lecture
   attached (make its file before and after the change, following
   `prompts/generator.md` into the scratchpad, on Opus 5.5 at high effort
   or more, as the owner does; CLAUDE.md, Models): would a student who never
   heard the lecture get what the
   teacher said? Anything Learn does differently goes through the
   simulator, and a real sitting is read (`sessionAudit`).
2. **The design audit's changes** (`docs/proposals/design-audit.md`,
   section 3 and the tree in section 4), each already argued with a pick:
   - one Start for the day on the library page;
   - the lecture page's first screen given to studying;
   - Progress leading with what is fading;
   - a lighter first reading card;
   - versions of the tree.

   The owner has not seen them. Build each, send phone-size screenshots
   (light and dark) and **wait for the owner's yes before it goes live**.
   For the tree, send two or three versions to choose from. These do not
   depend on step 1: run them in a parallel agent.
3. **The rest of teaching understanding** (`docs/proposals/understanding.md`,
   section 4): explanations of how each section follows from the last (in
   the generator, weighed against reply length), and a lecture check that
   flags a lecture whose questions are mostly recall, built only after
   reading the real lecture attached shows the problem.
4. **The design audit's second pass** (`design-audit.md`, the screens not
   yet looked at): the New lecture and Add dialogs, Sync, Help (18 phone
   screens long), desktop widths. Same method as the first pass; faults
   fixed, directions argued and shown to the owner.

## How

- **Use agents** (CLAUDE.md): steps that do not depend on each other run
  in parallel, each agent well scoped, on a cheaper model where that is
  enough. Read every agent's diff and run the checks yourself. Say before
  a large fan-out.
- **Each step is done when it is tested and live**: `npm run build`,
  `npx eslint src`, `npx vitest run`, the simulator where it applies,
  screenshots, pushed as the repo's rules say, and the live site checked.
- **Every new ask goes in `docs/ASKS.md`** the moment the owner makes it.
- **Never put course content in the repo.** The attached slides and the files made from them
  stay in the scratchpad.

## At the end

Tell the owner what is live, what waits on them, and that the app is ready
for the grading session if it is.
