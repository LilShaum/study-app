# Simulator findings

A dated log of what the simulator has shown, what changed in it, and what
is still open. Newest first. Every entry says which assumptions it rests
on, because a result is only as good as the simulated student behind it.

The numbers are a model's output, not a forecast for any real student.
Trust the **direction** and rough **size** of a difference, and only when
it holds under both memory models (`fsrs` and `harsh`).

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
3. **The exam-date rule costs coverage mid-term.** With the date set, peak
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
