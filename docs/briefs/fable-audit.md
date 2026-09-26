# Brief: independent audit of Arborous's learning logic

You are auditing a study app (repo `LilShaum/study-app`, live at
lilshaum.github.io/study-app). Another Claude session built most of it,
and its owner has caught that session marking its own work as done when
it was not. You are here to find what it missed — be adversarial, and
prove each finding.

Note: the root `CLAUDE.md` is the prompt that generates course files for
the app, not instructions for you.

## What the app does

A student turns their lecture notes into a course (definitions, MCQs,
flashcards, examples, diagrams). The app schedules practice with a memory
model and an exam date. The main button is **Today**: due reviews first,
then new material in small steps, sized to the student's minutes a day; in
the last 4 days before an exam, while exam material is unstudied, Review
is capped at 40% so new material gets time.

Key code: `src/lib/{memory,exam,today,learnSteps,buildSessionItems,nextToLearn}.ts`,
`src/store/{session,progress,plan}.ts`.

There is a simulator that drives this real code through a simulated month
and scores exam morning against a separate model of how a student
forgets. Read `.claude/skills/simulate/SKILL.md` and `sim/FINDINGS.md`
first; every scheduling decision so far was made with it.

## The job, in priority order

1. **Correctness of the scheduling and session logic.** Find real bugs:
   edge cases (no exam, exam passed or today, empty course, one section,
   sections added after the exam was set), resuming a session, missed
   cards re-queued in Learn/Today (answers are stored by position and
   shift on insert), time and date handling (local time, DST), the exam
   rule's hold-back, Today's step skipping. Write a failing test for
   each bug before fixing it.
2. **Is the simulator fair?** Is the "truth" student really independent
   of the app's model? Could any scenario, metric or default make Today
   look better than it is? Are the conclusions in `sim/FINDINGS.md`
   supported by the runs, including under the `harsh` model?
3. **The open problems** in `sim/FINDINGS.md`: about half of all reviews
   come after the item is mostly forgotten, and a readiness forecast
   failed because the app's model grows memory differently from the
   simulated student's. If you can propose a better model or schedule,
   show it in the simulator under both `fsrs` and `harsh` before
   changing app code.

## Rules

- Work on your own branch. Do not merge to `main`.
- Fix bugs you are confident in, each with a test. Anything bigger (a new
  memory model, schedule changes) is a proposal with simulator evidence,
  not a merged change.
- Before claiming anything works: `npm test`, `npm run typecheck`,
  `npm run lint`, and `npm run sim` for anything touching scheduling.
  Re-baseline only with a `sim/FINDINGS.md` entry saying why.
- Write your report to `docs/audits/2026-10-fable-audit.md`: each finding
  with severity, evidence (test, sim run or code reference), and what you
  did or propose. Say plainly what you did not check.
- Do not restyle the UI or reformat files you are not changing.

## Budget

The owner has limited credit. Spend it on the highest-value findings;
stop when the remaining items are low-value, and say what you left.
