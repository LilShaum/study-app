# Simulator findings

A dated log of what the simulator has shown, what changed in it, and what
is still open. Newest first. Every entry says which assumptions it rests
on, because a result is only as good as the simulated student behind it.

The numbers are a model's output, not a forecast for any real student.
Trust the **direction** and rough **size** of a difference, and only when
it holds under both memory models (`fsrs` and `harsh`).

---

## 2026-09-26 — Audit: the suite could not see Review; late reviews are the ones after a miss

An independent audit of the learning logic (`docs/audits/2026-10-fable-audit.md`).

**The simulator was blind to Review under its own default policy.** The
*In Review*, *Too early* and *Too late* columns counted answers only in a
session opened as Review. The suite's default policy is `today-button`,
whose reviews come through Today's opening block — so every `today-button`
row reported 0% in all three, and the "half of reviews come too late"
finding below rested on `follow-app` alone. Fixed: a review is now any
answer to a card in a review block, whichever door it came through.
Measured on the Today plan: 48–53% late under `fsrs`, 94–95% under
`harsh`, 61–69% for busy-20 and the crammer. The old finding stands.

**New column: what the late reviews are.** *Late: first / after miss /
mature* splits them by the item's state. Under `fsrs` (steady-30), 46 of
the 53 points are the **first review after a miss**, 7 are the first
review after learning, and mature items contribute nothing; under `harsh`
it is 82 of 95, and the crammer's 67 is 45 after a miss and 22 first
reviews (a week of new material at 90 min/day). So the open problem is not "reviews come too late" in general.
It is one case: the app floors a missed item at one day, and both
simulated students have forgotten it within hours. With one sitting a day,
nothing in the schedule can review it sooner than the next sitting.

**Earlier reviewing does not fix it, and its direction depends on the
student** (3 seeds, memory constants changed locally and not committed):

| Change | steady-30 | half-scope-told | 45-cutoff-scope | steady-30-harsh | 45-cutoff-scope-harsh |
|---|---|---|---|---|---|
| as shipped | 53% | 90% | 85% | 16% | 24% |
| due below 0.85 (was 0.75) | 50% | 85% | 83% | 18% | 26% |
| due below 0.6 | 51% | 87% | 79% | 16% | 23% |
| growth 2 (was 4) | 51% | 85% | 82% | 18% | 25% |
| a miss keeps 25% (was 50%) | 54% | 88% | 85% | 16% | 24% |

Reviewing earlier (a higher threshold, or slower growth in the app's
model) costs 2–5 points under `fsrs` and gains 1–2 under `harsh`; by rule
2 that is not acted on. Reviewing later costs under both. A harsher lapse
changes nothing: the floor of one day is what the next sitting sees. Under the `fsrs` student a right
answer at low recall grows memory a great deal, so a "late" review is not a
wasted one for them; under `harsh` it is. **What decides this is the real
after-miss forgetting rate, which the Phase 2 study log should measure
first** — a re-ask of a missed card later in the same sitting is the only
lever a daily schedule has, and neither simulated student gives an answer
minutes after the last one much credit.

**A shape check on the truth model.** Both truth models shared the app's
exponential forgetting curve, differing only in how stability moves, so
the close agreement of *App thinks* with the truth under `fsrs` was partly
built in. `MemoryModel.recall` now names the curve, and `fsrs-power` is the
same student with a power-law curve through the same 37% point. Under it
(`SIM_VARY=memory:fsrs-power`, 3 seeds): steady-30 56% (app 54%), steady-45
78% (76%), busy-20 29% (29%), crammer 67% (67%), half-scope-told 91% (92%),
45-cutoff-scope 85% (85%). The agreement survives the shape; the app's
estimate is not leaning on it.

**Two app fixes, measured.** (1) An item reviewed inside its exam window
came straight back as due (the window is a stretch of time; a review
inside it does not close it), so in the last day or two before an exam
Review never emptied and the finish screen said "these come back later
today". Now the exam review happens once. (2) Today skipped ahead to a later
section when the current section's next step did not fit the minutes
left. Together, over the suite: scores within noise everywhere (−1 to +3),
peak due 10–20% lower wherever an exam date is set (steady-30 318 → 282,
half-scope-told 241 → 189). **Re-baselined** in this commit.

**Still true, and worth saying plainly.** With the date set and the
sections not told, steady-45-cutoff scores 78% against 85% without a date
(and 85% with the sections told). The exam dialog stores no section list
when every section is ticked — the default — so a student who accepts it
and keeps adding lectures is in the "not told" case.

---

## 2026-09-26 — A readiness forecast: not yet

**What was tried** (`sim/experiments/forecast.ts`). A day-by-day projection
of exam morning with the app's memory model and Today's rules, as a range.
Checked in the simulator against the truth on the sections the app knew
about when it forecast (columns *Forecast* and *Unstudied said/true*).

1. **Fixed "forget twice as fast" range**: 25–97% on day 0. Useless.
2. **Fitted to the student's own answers** (one multiplier on the app's
   stabilities, from how often reviews came back right): 93–97% on day 10
   against a truth of 77–86% under `fsrs`, and 91–93% against 24% under
   `harsh`. The fit itself worked (pace 1.8 for `fsrs`, about 1.0 for
   `harsh` on the reviews it saw), but the app's model and a real student
   differ in how much each review *grows* memory, and one multiplier cannot
   carry that over a month. Expected-value updates made it no better.
3. **Coverage only** ("which sections you'll reach"): right for sections
   already added, but it assumes study every day (busy-20: said 1%
   unstudied, truth 48%) and cannot see lectures not yet added — most of
   what the question is about.

**Decision.** No forecast in Phase 1. A readiness number that fails its own
check is the one thing that would mislead a student where they trust the
app most. Revisit in Phase 2 with the study log: real card times and real
answer histories to fit a growth law, not only a scale.

**Kept.** The metrics stay in the report so any future forecast is scored
the same way.

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
