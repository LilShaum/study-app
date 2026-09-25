---
name: simulate
description: Run and develop Arborous's study simulator — a month of simulated study through the app's own Learn/Review/memory code, scored against a separate model of how a student really forgets. Use after changing scheduling, Review, Learn, the memory model or session code; before building a study feature (model it as a policy first); when asked whether something will help students, how ready someone will be, or what to build next for daily studying; and whenever the simulator itself is to be improved.
---

# The study simulator

`sim/` drives the real app code — `useSessionStore`, `buildSessionItems`,
`lib/memory.ts`, `lib/learnSteps.ts` — over simulated weeks on a fake clock,
and scores exam morning against a *simulated student* whose memory is a
different model from the app's. It answers "does this change make a
student more ready on exam day, and at what cost in time?", which no unit
test can.

It is a living tool. Improve it whenever a better way to model students or
a more important metric turns up, and log every change in
`sim/FINDINGS.md`.

## Run it

```
npm run sim                              # whole suite, 3 seeds, vs sim/baseline.json
SIM_SEEDS=5 npm run sim                  # more seeds when a difference is small
SIM_ONLY=steady-30,busy-20 npm run sim   # some scenarios
npm run sim:baseline                     # run and save as the new baseline
SIM_COURSE=path.study.json npm run sim:shape   # measure a real course's shape
```

Read `sim/results/latest.md` (not committed). One scenario-seed takes
about a second; the suite at 5 seeds is under a minute.

## Read it

- **Exam score**: the expected score on one question per item in the exam's
  scope (MCQs get the 25% guessing floor). `±` is the spread across seeds;
  `(+n)` is the change from the baseline in points.
- **Never studied**: share of scope never answered. Usually the story.
- **App thinks**: the same score from the app's own model. The gap is how
  wrong an in-app forecast would be.
- **Too early / too late**: review answers at true recall ≥ 0.95 (wasted)
  or < 0.5 (relearning).
- A difference smaller than about twice the `±` is noise. Rerun with more
  seeds before believing it.

## Rules

1. **The truth model must never be the app's model.** Scoring the app with
   its own memory model measures self-agreement, nothing else.
2. **A conclusion must hold under both `fsrs` and `harsh`** — in direction,
   not size. If it flips, say it depends on the student and don't act on it.
3. **Report direction and rough size, never a prediction.** "About half the
   course goes unstudied at 30 min/day" — not "you will score 50%".
4. **When app behaviour changes on purpose, re-baseline in the same
   commit** (`npm run sim:baseline`) and add a FINDINGS entry saying what
   moved and why.
5. **When an assumption changes** (student, course shape, metric, scenario),
   log the before/after in FINDINGS. Assumptions move every number.
6. **Never commit a real course.** The repo is public and courses are made
   from students' notes. Use `sim:shape` (counts only) and add the result
   to `SHAPES` in `sim/course.ts`.
7. **Add scenarios; don't quietly edit them.** Old scenarios keep results
   comparable over time. Fix one only if it was wrong, and log it.
8. **Model a feature as a policy before building its UI.** If the policy
   does not move the numbers, the screen will not either.

## Where things are

| File | What it holds |
|---|---|
| `sim/engine.ts` | The day loop, the `Day` context policies use, `POLICIES`, metrics |
| `sim/scenarios.ts` | The standard suite: study time, scope, shape, memory, policy |
| `sim/student.ts` | Truth memory models, first-time accuracy, seconds per card |
| `sim/course.ts` | Synthetic course generator and measured/estimated `SHAPES` |
| `sim/report.ts` | Summary across seeds and the markdown table |
| `sim/run.sim.ts`, `sim/shape.sim.ts` | Entry points (`vitest.sim.config.ts`) |
| `sim/FINDINGS.md` | Dated log of results, assumption changes, open questions |
| `sim/baseline.json` | The committed reference run |

## Extend it

- **A scenario**: add to `SCENARIOS` with a one-line `why`.
- **A policy** (a way of using the app, or a proposed feature): add to
  `POLICIES`. It gets `review()`, `learn()`, the day's budget and what is
  unseen; drive the real stores through them, never around them.
- **A memory model**: add to `MEMORY` with its `source`. Run the whole suite
  under it, compare, log it.
- **A metric**: add it to `Metrics` in `engine.ts`, fill it in `simulate`,
  average it in `report.ts`'s `summarise` and give it a column. Re-baseline.
- **A course shape**: measure with `sim:shape`, rename, add to `SHAPES`.

## Known limits

- Every student number in `student.ts` is an assumption until calibrated
  against real answers (the study log planned in Phase 2).
- Items are independent: learning one term does not help its neighbours.
- The student always does what the course page suggests, for as long as
  the budget says. Real students stop early and skip.
- The score is averaged per item, which favours smaller courses (see
  FINDINGS).
