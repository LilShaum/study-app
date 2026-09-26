# Simulator findings

A dated log of what the simulator has shown, what changed in it, and what
is still open. Newest first. Every entry says which assumptions it rests
on, because a result is only as good as the simulated student behind it.

The numbers are a model's output, not a forecast for any real student.
Trust the **direction** and rough **size** of a difference, and only when
it holds under both memory models (`fsrs` and `harsh`).

---

## 2026-09-26 — The real Today button, checked against the plan

**What.** `today` session mode (`buildSessionItems`): due cards for Review's
share of the minutes, then whole Learn steps from where Learn left off.
New policy `today-button` presses it (and "Keep going" while time is
left); it is now the suite default. `today-button-once` stops after one.

**Caught before any screen was built.** The first version rebuilt the next
section from step 1 every day, redoing finished steps: 37% against the
policy's 53% at 30 min/day. Fixed by skipping steps whose questions have
all been answered. Then the sitting, planned in whole steps, ended ~15%
early; with "Keep going" it matches or beats the policy everywhere
(54/77/88% at 30/45/60 min against 53/76/86%). **So Today's finish screen
needs a Keep going button.**

**Scope, again.** 45 min/day with a 7-day exam cutoff: date set, sections
not told 78%; sections told 85%; no date 85%. An exam date without its
sections still costs points; with them it costs nothing. The setup has to
ask for both, and make the sections easy to get right.

---

## 2026-09-26 — The Today plan: review first, learn late

**Question.** Phase 1 was going to split every sitting between Review and
Learn, on the reasoning that time spent reviewing was starving new
material (finding 1 below). Before building it, the split was tried here.

**Changes to the simulator.** The course now grows as lectures are added
(the app only ever sees released sections, as with Add material).
`Scenario.tellsScope` passes the exam's sections to the app. `SIM_VARY`
re-runs the suite with one field varied. The suite's default policy is
now `today` (what the app will offer); `steady-30-follow-app` keeps the old
course-page behaviour for comparison.

**Changes to the app.** `lib/exam.ts`: the exam date applies only to the
sections it covers and holds back while any of them is unstudied (except
in the last 7 days). Measured alone: within noise everywhere (0 to +2).
`lib/today.ts`: the split below. `nextSectionToLearn` teaches exam sections
first while an exam with a scope is coming.

**Capping Review all month is much worse** (30 min/day, 3 seeds):

| Review cap | none | 40% | 50% | 60% | 70% |
|---|---|---|---|---|---|
| steady-30 | 50% | 28% | 27% | 30% | 38% |
| steady-30-cutoff | 60% | 33% | 34% | 37% | 44% |

Everything gets seen and almost none of it lasts: an item studied once is
gone by the exam unless it is reviewed. **Depth beats breadth when time is
short.** Finding 1 below was right that half the course goes unstudied, and
wrong about the cure.

**Capping Review only in the last days is better.** Learning something 1–4
days before the exam needs no reviews to survive to it. Tested caps of
30–50% from 4, 7 or 10 days out; best: 40% from 4 days (`REVIEW_CAP`,
`CAP_WITHIN_DAYS`). Full suite, 5 seeds, against the old course page:

| Scenario | Before | Today plan |
|---|---|---|
| steady-30 | 50% | 53% |
| steady-45 | 69% | 76% |
| steady-60 | 82% | 86% |
| crammer | 53% | 67% |
| steady-30-cutoff | 59% | 62% |
| steady-45-cutoff-harsh | 21% | 24% |
| busy-20 | 26% | 25% (noise) |
| steady-30-half-scope, scope **not** told | 87% | 81% |
| steady-30-half-scope, scope told | 87% | 88% |

Holds under `harsh`. The one loss is an exam on half the course that the
app was not told about: the last-days push goes into sections that are not
on it. **So the exam setup must ask which sections the exam covers.**

**Caveats.** The score is exam morning only. Material learned in the last
four days is likely gone soon after, which matters for a cumulative final;
not modelled. Held ≥0.8 drops in several scenarios while the expected
score rises: more items known a little, fewer known well.

---

## 2026-09-26 — Exams don't cover the last week's lectures

**Why.** The user pointed out that what is taught right before a test is
usually not on it. The first suite counted every section as examinable,
so sections reached late could have been blamed on the app unfairly — in
particular finding 3 below ("the exam-date rule costs coverage").

**Change.** `Scenario.scopeCutoffDays`: the exam covers only sections
released at least that many days before it. New scenarios
`steady-30-cutoff`, `steady-45-cutoff` (and `-no-date`, `-harsh` twins):
lectures every 3.2 days right up to the exam, cutoff 7 days. Old scenarios
unchanged.

| Scenario (cutoff 7 days) | Date set | No date |
|---|---|---|
| 30 min, fsrs | 59% (39% never studied) | 63% (29%) |
| 45 min, fsrs | 77% (18%) | 84% (0%) |
| 45 min, harsh | 20% | 21% |

**Finding 3 survives, corrected.** The sections the date rule leaves
unstudied are 7–10, taught 1½–3 weeks before the exam and on it — not the
last-minute ones. The rule over-protects early sections (94% vs 89%) while
in-scope sections go unopened. Under `harsh` the gap is within noise but
points the same way: the date never helps. So: **the exam-date rule as
built does not help, and under the realistic model costs 4–7 points.**

**What it means for the app.** Exam protection must not outrank learning
in-scope material that has never been seen. Phase 1's exam scope makes
"in scope" known; the Today plan and the exam-week choice (Phase 2) should
be tried here as policies before they are built.

---

## 2026-09-25 — First suite and baseline

**Setup.** Synthetic `spec-estimate` course (12 sections, about 560 scored
items), `fsrs` memory, 31 days to a midterm, a new section every 2.5 days,
the student does what the course page suggests (Review, then Learn).
5 seeds. Baseline saved in `sim/baseline.json`.

| Scenario | Exam score | Never studied |
|---|---|---|
| 20 min, some days off | 26% | 77% |
| 30 min every day | 50% | 50% |
| 45 min | 69% | 27% |
| 60 min | 82% | 12% |
| 30 min, exam covers sections 1–6 | 87% | 5% |

**Findings.**

1. **Time is the constraint, and the app never says so.** At 30 min/day,
   about 80% of study time goes to Review and half the course is never
   opened. What the app studies is fine (sections studied score around
   90%); what it does not reach scores the guessing floor. → Phase 1
   (Today plan and forecast).
2. **Exam scope matters most.** The same 30 minutes scores 87% on a
   six-section midterm and 50% on the whole course. → ask which sections
   the exam covers.
3. **The exam-date rule costs coverage mid-term.** *(Re-checked 2026-09-26
   with an exam cutoff: still true — see above.)* With the date set, peak
   due rises from 105 to 162 and 8 more points of the course go unstudied;
   the score is no better (50% vs 52%). Protecting old material for an exam
   while new lectures keep arriving crowds out learning. → Phase 2 (make
   that trade the student's choice in the last week).
4. **"New material first" is much worse** (37% vs 50%): everything gets
   seen, almost nothing is kept. Kept as `steady-30-quota` for reference.
5. **Half of all review answers come too late** (true recall below 0.5) —
   49% under `fsrs`, 95% under `harsh`. The app waits a day after a miss
   (its floor), and treats every item alike, where the simulated student
   forgets a missed item within hours and some items much faster than
   others. Not acted on yet: it depends heavily on the truth model. It is
   the first thing to check against real answer logs (Phase 2).
6. **The app's own estimate matches the truth under `fsrs`** (within a
   point) **but not under `harsh`** (24% vs 15%). A forecast built on it
   must be shown as a range, not a number.
7. **A course with more questions per term covers less in the same time**
   (old-prompt shape 58% vs spec-estimate 50%). Partly real, partly the
   metric: the score is averaged per item, and a course with more items
   per idea is not a harder exam. → open question below.

**Open questions for the simulator.**

- Score per *concept* (term) rather than per item, so course shapes can be
  compared fairly.
- Calibrate `fsrs` against real answers once the study log (Phase 2)
  exists: time per card, first-time accuracy, forgetting after a miss.
- Model the student's choices: stopping early when a session feels long,
  skipping Review when there is a lot due.
- Try the Phase 1 "Today" plan as a policy **before** building its UI.
