# Audit of the learning logic — 2026-10

An independent, adversarial audit of Arborous's scheduling and session code,
the study simulator, and the two open problems in `sim/FINDINGS.md`, as
briefed in `docs/briefs/fable-audit.md`. Everything below is on branch
`claude/fable-audit`; nothing was merged to `main`.

Checks run before writing this: `npm test` (554 pass), `npm run typecheck`,
`npm run lint`, `npm run sim` (re-baselined; see the FINDINGS entry dated
2026-09-26, "Audit").

Severity: **high** = a student sees wrong behaviour in normal use;
**medium** = wrong in a common situation, or a measurement that misled a
decision; **low** = an edge or a quality point.

---

## 1. Bugs in the app (fixed, each with a test that failed first)

### 1.1 An exam review never ended — `lib/memory.ts` — **high**

**What.** With an exam date set, `isDueFor` makes an item due once the
"exam review window" opens: the latest moment a review would still leave it
above the target on the day, less a day's slack for the sitting. The window
is a stretch of time, and the check was `now >= latest` with nothing about
whether the item had been answered inside it. So an item reviewed in the
window was due again the moment it was answered — it rarely projects above
the target even then, because of that day of slack — and `nextDueAt`
returned a time in the past.

**Seen by a student.** In the last one to three days before an exam
(for typical stabilities of 2–20 days the window is 1.2–3.1 days wide),
the course page's due count never falls, "Review the next 50" serves the
same cards forever, and the finish screen says "These come back later
today". Today's sitting fills its Review share with cards that were just
answered, which the memory model rightly gives almost no credit.

**Evidence.** `src/lib/memory.test.ts`, "an exam review happens once":
failed before the fix (`expected true to be false`), passes after. In the
simulator the exam-date scenarios' peak due fell 10–20% (steady-30 318 →
282; half-scope-told 241 → 189) with scores unchanged within noise.

**Fix.** The exam branch now applies only while the item has not been
answered since the window opened (`examReviewFrom`, shared by `isDueFor`
and `nextDueAt`). After that, only fading below the everyday threshold
brings it back.

### 1.2 Today skipped ahead to a later section — `lib/buildSessionItems.ts` — **medium**

**What.** Today adds whole Learn steps until the minutes run out. When the
current section's next step did not fit, the loop broke out of that section
and went on to the next one, whose first step might be smaller — so the
sitting taught section 3 while section 2 was unfinished, out of course
order and (with an exam scope) possibly off the exam. The course page's
promise ("then new: section 2") and the sitting disagreed.

**Evidence.** `src/lib/buildSessionItems.test.ts`, "stops rather than
jumping ahead to a later section": failed before (served `bf0` from
section B), passes after.

**Fix.** A step that does not fit ends the Learn part of the sitting.
"Keep going" then plans afresh, where the first step always fits.

### 1.3 A mixed-up partner in Today's review was not a review card — `lib/buildSessionItems.ts` — **low**

**What.** When a due card's term has been confused with another, the other
is brought in beside it. In Today, a partner that was not itself due came in
without `_block: 'review'`, so the course page under-counted "cards to
review", the "Review done" pause fell before it rather than after, and the
step line went blank on it.

**Evidence.** `src/lib/buildSessionItems.test.ts`, "a mixed-up partner
joins the review": failed before, passes after. Fix: every card in the
review part of a Today sitting carries the review block.

### 1.4 Continue was never offered from a typed-term card — `routes/CourseRoute.tsx`, `store/resume.ts` — **medium**

**What.** A bookmark is saved with the current card's id. A typed-recall
card (a definition asked as "type the term") is scored and bookmarked under
`<definition id>~recall`, an id the course file does not hold. The course
page offered Continue only when the bookmark's id was found among the
file's items, so it never appeared for Terms mode and vanished from Learn,
Review, Mixed, Weakest and Today whenever the last card seen was a term to
type. The session store already handled such ids on resume; the page never
let it get there.

**Evidence.** `src/store/resume.test.ts`, "bookmarkResolves … finds a
typed-recall card": failed before, passes after. Fix: the check is now
`bookmarkResolves` in `store/resume.ts`, which also accepts a definition's
recall id.

### Checked and found sound

- **Answers stored by position when a missed card is re-queued or taken
  back.** Two adversarial sequences added to `src/store/session.test.ts`
  (a miss, later answers, an earlier answer overruled into a miss so a copy
  lands before the first copy; and a copy taken back after answers were
  recorded beyond it). Both pass: every recorded answer stays with its card.
  My first drafts of these tests failed on my own wrong expectations, not
  the store's.
- **No exam, exam today, exam passed.** `examRule` returns no exam once
  9am on the day has passed; `nextSectionToLearn` returns to course order;
  the label says "passed". Existing tests cover these.
- **Empty course, one section, sections with nothing scorable.** Today
  returns an empty sitting and the page says so; sections with only
  examples never hold Learn up.
- **Local time and DST.** `examTime` is 9am local on the date; day labels
  use midnight-to-midnight with rounding, so a DST change does not shift
  "tomorrow". The 4-day cap and 7-day protection use fixed 24-hour spans,
  so they move by an hour across a DST change; not worth code.
- **The exam rule's hold-back.** While anything the exam covers is
  unstudied and the exam is more than 7 days off, the date does not steer
  Review; from 7 days it does regardless. Behaves as documented.

### Design risks, not fixed

- **Sections added after the exam was set silently join it** — **medium**.
  `ExamDialog` stores no section list when every section is ticked (the
  default), so a lecture added later counts as covered. That is deliberate
  and tested, but it is exactly the simulator's "date set, sections not
  told" case, which costs about 7 points at 45 min/day with a 7-day cutoff
  (78% against 85%). A student who accepts the default and keeps adding
  lectures is in that case. Proposal: keep an explicit list whenever a date
  is set, and when material is added while a date is set, ask whether the
  exam covers it (one tap, default no in the last week, yes before).
- **Time per card.** `lib/today.ts` fits a sitting to the minutes using the
  same seconds-per-card figures the simulated student takes, so in the
  simulator Today's plan always fits exactly. Real students are slower or
  faster; the plan will run over or under. Not a bug; a calibration gap the
  study log should close.

---

## 2. Is the simulator fair?

**The truth model is independent in how memory changes, but shared the
app's forgetting curve.** Both `fsrs` and `harsh` used R = exp(−t/S), the
app's own shape, differing only in how S moves. Agreement of "App thinks"
with the truth under `fsrs` (within a point or two) was therefore partly
built in. I added `MemoryModel.recall` so a truth model names its curve,
and `fsrs-power`: the same student with a power-law curve through the same
37% point. Under it the agreement survives (steady-30 56% truth / 54% app;
steady-45 78/76; crammer 67/67; 45-cutoff-scope 85/85), so the app's
estimate is not leaning on the shape. **Fair after the change; the shape
had not been tested before.**

**The suite could not see Review under its default policy — medium.**
The In Review / Too early / Too late columns counted only answers in a
session opened as Review. The default policy `today-button` reviews
through Today's opening block, so every default row reported 0% in all
three, and the "half of reviews come too late" finding rested on the
`follow-app` rows alone. Fixed in `sim/engine.ts` (a review is any answer
to a card in a review block). Measured on the Today plan: 48–53% late under
`fsrs`, 94–95% under `harsh`. The finding stands; it had not been measured
on the plan that ships.

**Could anything make Today look better than it is?**

- The student never stops early, never skips a day the scenario does not
  say to, and always presses Keep going while time is left. Known limit,
  stated in the skill file.
- Under `harsh`, an answer seconds after the last one still grows stability
  by 15% (`grow` has a floor of 1.15). Learn's re-ask of a missed card
  three cards on therefore earns a little under `harsh` and nothing under
  `fsrs`. Small, and it does not favour Today over the old page.
- MCQ first-time accuracy is 60% with no memory (the reading just before),
  while never-studied MCQs score the 25% guess floor on the exam. Consistent:
  an unstudied item had no reading either.
- The scoring is per item and favours smaller courses (known, logged).

**Are the FINDINGS conclusions supported?** Re-run at 5 seeds,
`follow-app` against `today-button`: steady-30 50 → 54, steady-45 69 → 77,
crammer 55 → 66, busy-20 26 → 26 (noise), steady-30-harsh 15 → 16,
45-cutoff-scope-harsh 21 → 24. **Yes: better everywhere but busy-20, and
in direction under `harsh`.** Two things the log understates: under `harsh`
the gain is 1–3 points, at the edge of noise; and *Held ≥ 0.8* falls under
Today in every scenario (45 → 38, 66 → 60, 45 → 30 for the crammer). Today
buys a higher expected score by knowing more items a little and fewer well,
which the log mentions once and the headline numbers hide.

---

## 3. The open problems

### 3.1 "Half of reviews come too late"

The new *Late: first / after miss / mature* column says which reviews these
are. Under `fsrs`, of 50 points late, about 37 are the **first review after
a miss**, 7 the first review after learning, 0 mature items; under `harsh`,
76 of 95. So this is one case, not a general lag: the app floors a missed
item at one day of stability, both simulated students have forgotten it
within hours, and with one sitting a day the next chance is tomorrow.

What a schedule could do about it was tried locally (constants in
`lib/memory.ts` changed for the run only, five scenarios, 3 seeds; table in
FINDINGS):

- **Review earlier** (due below 0.85 instead of 0.75, or growth 2 instead
  of 4): −2 to −5 points under `fsrs`, +1 to +2 under `harsh`. The direction
  flips with the student. Under the `fsrs` student a right answer at low
  recall grows memory a great deal, so a "late" review is not a wasted one;
  under `harsh` it is.
- **Review later** (due below 0.6): worse under both.
- **A harsher lapse** (a miss keeps 25%): no change. The one-day floor is
  what the next sitting sees.
- **Re-asking a missed review card later in the same sitting** is the only
  lever a daily schedule has, and neither simulated student gives an answer
  minutes after the last one much credit, so the simulator cannot show it
  helping. I did not build it.

**Proposal.** Do not change the threshold or the growth. The one number that
decides this is the real after-miss forgetting rate, which the Phase 2 study
log can measure directly (accuracy on the day after a miss, by hours
since). If it is near `harsh`, an earlier threshold and a same-sitting re-ask
are worth building; if near `fsrs`, leave it.

### 3.2 The readiness forecast

I did not build one. What was already found holds: the app's growth per
review (×2 at the due threshold) sits between the two students (`fsrs`
about ×3.5 for a fresh item, `harsh` about ×1.8), so no single multiplier
fitted to answers carries over a month. The one thing I can add is that the
power-law check above shows the *level* the app estimates on exam morning
is fine under `fsrs`; the failure is in projecting forward, not in reading
the present. A coverage-only forecast remains the honest option, and it
needs the missed-days assumption fixed first (busy-20: said 1% unstudied,
truth 48%).

---

## 4. Simulator changes in this branch

- `sim/engine.ts`: reviews counted by review block, not session mode;
  `Truth` tracks lapse and successes; new metrics `lateFirst`,
  `lateAfterMiss`, `lateMature`; the truth curve is the model's.
- `sim/student.ts`: `MemoryModel.recall`; `fsrs-power`.
- `sim/report.ts`: the new column.
- `sim/baseline.json`: re-baselined (app behaviour changed on purpose in
  1.1 and 1.2; FINDINGS entry says what moved).
- `sim/FINDINGS.md`: the entry dated 2026-09-26, "Audit".

---

## 5. What I did not check

- **The UI.** `CardSession.tsx` and `CourseRoute.tsx` were read, not
  driven; the one change to a route is a one-line call into a tested helper.
  I did not run the app in a browser.
- **Storage.** `safeStorage`, migration from legacy data, and quota
  failure paths.
- **Course generation and audit tooling** (`courseHealth`, `growTree`,
  `questionQuality`, the prompts): out of scope.
- **Real answer data.** Every simulated-student number is still an
  assumption; nothing here calibrates one.
- **A better memory model.** Not proposed. The sweeps above say the
  schedule's constants are not the problem the simulator can see; the
  after-miss forgetting rate is, and it has to be measured, not modelled.
- **Learn-step placement** (`learnSteps.ts`): read for the interaction with
  Today's step skipping only; the term-matching heuristics were not
  audited.

## 6. Left undone, by choice

Lower-value items I saw and did not spend on: `nextSectionToLearn` reads
the clock during render on the course page (a comment in the same file says
rendering must not); Review Missed and Weakest use `got/missed` counts
rather than the memory model, so they disagree with Review about what is
weak; the 4-day cap counts only exam-scope unseen items while
`sectionsToLearn` will happily teach a non-scope section in that time
if the scope sections are done.
