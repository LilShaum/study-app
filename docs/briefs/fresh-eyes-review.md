# Brief: a fresh-eyes review of how Arborous teaches

You are reviewing a study app, Arborous (repo `LilShaum/study-app`, live at
lilshaum.github.io/study-app), with no stake in the decisions already made.
Your job is to find where it fails a real student, prove it, and fix what
is clearly broken. The owner is a university student who uses it for their
own midterms, and the person who will read your report.

Read `CLAUDE.md`, `docs/HANDOFF.md` (sections 0, 2 and 7 at least),
`.claude/skills/simulate/SKILL.md`, `sim/FINDINGS.md` (newest entries
first), `docs/evidence.md`, `docs/proposals/content-quality.md`, and the
earlier audit `docs/audits/2026-10-fable-audit.md` before you change
anything. That audit drove the scheduling code and the simulator; it did
not drive the app in a browser, use real lectures, or look at Learn's
ordering or the content checks. Those are yours.

Work at high effort. Consider more than one explanation for anything you
find, and measure before you believe either.

---

## 1. Why a fresh review, and what went wrong before

The last session made real improvements and real mistakes. Learn from the
mistakes; they are the patterns to look for.

1. **Tests that pinned a bug.** `learnSteps.test.ts` had a test named
   "skips reading a term already answered right, and still asks for it".
   That behaviour was the bug the owner hit: a sitting's review asked 12
   feedback-loop terms, then its "new material" asked them again. The
   test passed for weeks. Read every test as a claim about what is good
   for a student, not only about what the code does.
2. **Changes that each looked level, and together were not.** Four
   changes in one day were each "within noise" in the simulator. Compared
   with the code from the morning on equal seeds, the everyday scenarios
   had lost 1 to 2 points of exam score and 2 to 4 of "held". One of them
   (a per-term cap on due reviews) was removed. Always compare against the
   last known-good commit on the same seeds, not only against the last
   baseline.
3. **Audits run on a student who had never studied.** The session audit
   (`src/lib/sessionAudit.ts`) and every check of the order used empty
   progress. The repeat bug only shows after a section is half learned.
   Every order check needs studied states too: half a section, a day
   later, a week later, after misses, after a review sitting.
4. **Detectors calibrated on one test lecture.** The heuristics in
   `src/lib/contentChecks.ts` (give-away, same fact, answered-by, same
   name) were tuned on the biochemistry fixture, then on the owner's
   lectures. They are word-overlap rules and will have false positives and
   negatives on other subjects.
5. **The simulator's course has random wording**, so it cannot see any
   content effect (repeats, give-aways, nuance). It also models every item
   as independent.
6. **Earlier ideas re-proposed without checking.** "Always keep time for
   new material" and "interleave sections in Learn" had both been tested
   and rejected before (`REVIEW_CAP` notes in `lib/today.ts`, task #31 in
   HANDOFF). Search FINDINGS and HANDOFF before proposing.

---

## 2. What has been tried, and how it went

A neutral record, oldest first within each part. "Evidence" says what the
result rests on, so you can weigh it:

- **sim**: the simulator only. Uncalibrated, synthetic lectures, two
  guessed truth models. A sim result is a direction under its assumptions,
  not a fact about students.
- **real**: measured on the owner's real lectures (orders, counts), not on
  learning.
- **lit**: the research in `docs/evidence.md`.
- **owner**: what the owner or a friend reported from using it.

Details are in `sim/FINDINGS.md` (dated entries), `docs/HANDOFF.md` §0 and
§5, and `docs/proposals/`. Re-examine any of these; none is settled just
because it was decided.

### 2.1 Scheduling: Today, Review and the exam

| What | Result | Evidence | Status |
|---|---|---|---|
| A student does what the course page suggests (Review, then Learn) | At 30 min/day about 80% of time went to Review and half the course was never opened; studied sections scored about 90%, the rest the guessing floor | sim | Led to the Today plan |
| Cap Review all month to make room for new material | Much worse: 28–44% vs 50% at 30 min/day. Things seen once were gone by the exam | sim | Rejected |
| Cap Review at 40% only in the last 4 days, while exam material is unseen (`REVIEW_CAP`, `CAP_WITHIN_DAYS`) | Better in almost every scenario under both students | sim | Shipped. Applies only with an exam date set |
| Tell the app which sections the exam covers | The single biggest lever: 87% vs 50% at 30 min/day | sim | Shipped (exam scope) |
| Exam-week choice: "learn what's left" or "hold on" | "Learn what's left" worse almost everywhere (up to −6); "hold on" only helps when scope was not told | sim | Not built |
| A readiness forecast | Every version tried failed its own check (said 1% unstudied, truth 48%) | sim | Not built; a coverage-only line exists |
| Catch-up: misses back a few hours later the same day | +6 to +8 at the same total time; the gap is what helps (0 h gives nothing) | sim, lit | Shipped (`CATCH_UP_HOURS`) |
| Retry misses straight away | 4 to 11 points behind spending the time on Today | sim | Offered, never the lead button |
| Personal forgetting rate fitted from answers | Level | sim | Hook built, not driving anything |
| Several courses, one daily time: split by 1 / days to exam | Better than equal split everywhere, both students | sim | Shipped (library) |
| Cram mode for the last days | Lost 6–9 points under both students; left a quarter of the exam unseen | sim | Not built |
| Last three days in three sittings a few hours apart | +2 to +5 | sim | Shipped (`partMinutes`) |
| Per-term cap on due reviews (2026-10-13) | Held due cards back past their point; −3 to −5 for a 20-minute student | sim | Removed the same night |
| Late reviews: "half of reviews come too late" | Almost all are the first review after a miss; review earlier helps under `harsh`, hurts under `fsrs` | sim | Left; needs the real after-miss rate |

### 2.2 Learn and the order of a sitting

| What | Result | Evidence | Status |
|---|---|---|---|
| Learn as whole blocks (all definitions, then all questions) | A term was asked 50–60 cards after it was read | real | Replaced by steps |
| Steps of a few terms: read, type, apply | Level to slightly better | sim, lit (Yang 2021) | Shipped |
| A question waits for the step that teaches what it quotes | Fixed "asks about things it didn't show" | owner, sim level | Shipped |
| Steps of at most 12 cards | A friend's "4 terms" step was 22 cards before misses came back | owner | Shipped (`STEP_CARDS`) |
| A miss comes back in its own step, a few cards on, once right is enough | Level or +1–3 under `fsrs`, level under `harsh` | sim, lit (Vaughn 2016) | Shipped |
| Ask in the order read (a later first test) | Within noise | sim, lit (Karpicke & Roediger 2007) | Shipped |
| Ask a miss again at the section's end | Cost time, no gain | sim | Dropped |
| Flashcards shown open before asked (2026-10-11), then removed (2026-10-13) | Owner read it as being handed the answer, then asked. Level either way | owner, sim, lit (Kornell 2009) | Removed |
| Questions first: skip the reading | +2 to +6 for material met in a lecture; level for never met | sim | A switch; read first is the default |
| Learn with my slides (`source_range`) | Not measured | — | Shipped |
| Typed term that spells itself out: read, never asked | 54 of 224 definitions in one real lecture | real | Shipped; Fix rewords them |
| One fact never within 5 cards of a card that answers it (`apart`) | Level | sim, real | Shipped; makes some 1–2 card steps |
| At most 3 cards on a term at first meeting (`TERM_BUDGET`), rest a sitting later | Level overall; half-scope −2 score, −4 held | sim, owner | Shipped, under review (task G) |
| One term in two lectures scored once (`linkedTerms`) | 21 shared terms between two real lectures | real | Shipped; not simulated |
| New material is only cards never answered (`newOnly`) | Fixed the owner's "review, then the same terms as new"; 25 of 62 "new" cards had been answered | owner, real, sim level | Shipped |
| Interleave sections in Learn | Evidence favours blocked practice for new material of this kind | lit | Not done |

### 2.3 Modes and screens

| What | Result | Evidence | Status |
|---|---|---|---|
| Ten modes down to Today, Learn, Practice | Owner found too many choices | owner | Shipped |
| Typed recall from an MCQ answered right | Producing after recognising | lit | Shipped; not when the stem gives the answer or restates the definition |
| Confused terms come back side by side | Discrimination of confusable items | lit (interleaving meta-analysis) | Shipped |
| Set aside ("Not needed?") with Put back | Owner asked | owner | Shipped |
| The tree as progress | Owner liked it | owner | Shipped |
| iPhone status bar | Header under the clock; a measured fallback; study screens no longer scroll for nothing | owner | Unconfirmed on the phone (#88) |

### 2.4 Content and prompts

| What | Result | Evidence | Status |
|---|---|---|---|
| Generator prompt with an inventory and coverage obligations | Courses cover the notes | real | Shipped |
| Option-length tells | The right answer was the longest 55% of the time; a counted rule | real | Shipped, still drifts |
| Teacher notes kept with the lecture | Owner asked | owner | Shipped |
| Quality bar rewritten (2026-10-13): how the app uses cards, a weight table, MCQs for nuance not trivia, a counted difficulty mix, parts of one system together | Not yet tested on a real generation | — | Shipped |
| Course check: give-aways, same fact, MCQs restating a definition, thin key terms; Fix and More practice target them | About one MCQ in eight restates a definition on the real lectures | real | Shipped; detectors are heuristics |
| "Follows on from" for decks that repeat the previous one's last slides | Matching questions across lectures by wording had false positives | real | Shipped (prompt side) |

### 2.5 What the owner has said, in their words where it matters

- Liked: the level of detail and quality of life at one point; the tree;
  how Learn and Today adapt.
- Disliked: too much reading before questions (43% of Learn's cards); being
  asked about what wasn't shown; the same fact asked again in other words;
  answers given away by the card before; "every time I start learning it
  makes me review the same things for 30 minutes"; basics (feedback loops)
  taking every sitting; MCQs that only re-ask a definition instead of
  testing nuance; prompt rules too vague to be followed.
- Wants: mastery, not memorising; more study content for key ideas than
  for basics; things easy to find; app-side fixes that work without
  regenerating lectures; an exam mode for a whole class.

## 3. Ground rules

- **Never commit course content.** The repo is public. The owner's
  lectures are theirs. Ask the owner to attach their `.study.json` files,
  or a backup (Help page, "Back up everything": every lecture, all progress
  and the study log in one file), and keep them in your scratchpad.
  Test lectures in `scripts/__fixtures__/` are made up.
- Checks: `npm run build` (the CI typecheck, including `sim/`),
  `npx eslint src`, `npx vitest run`, and the simulator for anything that
  changes scheduling, Review, Learn, Today or the memory model.
- The simulator's truth model must never be the app's model, and a
  conclusion must hold under both `fsrs` and `harsh` (simulate skill).
- Code style: single quotes, about 130 columns, comments that say why.
  There is no prettier config; running prettier with defaults rewrote
  whole files to double quotes once. Match the file you are in.
- Done means tested, pushed, deployed and checked on the live site
  (HANDOFF §7). No pull requests unless the owner asks.
- Write to the owner in plain language: what was wrong, what changed, the
  numbers, what is still open. They have been let down by "fixed" that
  was not. Say what you did not check.

---

## 4. The system in one page

**Content.** A lecture is a `.study.json` made by an AI from the student's
slides with `prompts/generator.md`. Items: `definition` (asked typed:
meaning shown, student types the term), `flashcard` (self-graded),
`mcq` (four options), `example` and `graphic` (read only). Sections carry an
optional `source_range` ("slides 12–18").

**Modes** (`src/lib/buildSessionItems.ts`, `StudyMode`):

| Mode | What it serves |
|---|---|
| Today | Due reviews first, then new material in Learn's steps, sized to the day's minutes (`lib/today.ts` `splitSitting`) |
| Learn | New material in steps (`lib/learnSteps.ts`), section by section |
| Practice | One page (`PracticeRoute.tsx`) over review, weakest, missed, quiz, flashcards, definitions (terms), mixed |
| Browse | The lecture as written, with Put back for set-aside cards |

**Learn's steps** (`lib/learnSteps.ts` `stepSection`): a section is cut
into steps of about `STEP_TERMS` = 4 terms, at most `STEP_CARDS` = 12
cards. In a step: read the definitions (and examples, diagrams), type each
term, then flashcards, then MCQs (`ORDER`). Questions join the step whose
terms they use. Then, added 2026-10-13:

- `TERM_BUDGET` = 3: at most three cards on one term at its first
  meeting; the rest go to a **second look** (`_second`) that opens the next
  sitting, never the one that teaches the section.
- `apart` and `MIN_GAP` = 5: a card answered by an earlier one (same
  fact, or its answer printed on it, a definition read counting) moves to
  the next step; it is never within five cards of it.
- `joinSmall`: steps of three cards or fewer join their neighbour when
  that keeps the gap.
- `newOnly` in buildSessionItems: Learn and Today's new part serve only
  cards never answered.

**In a sitting** (`src/store/session.ts`): a miss comes back
`AGAIN_AFTER` = 3 cards later, at most `AGAIN_MAX` = 3 times, inside its
own step. A typed term mixed up with another is paired with it
(`confusedWith`, `pairConfusions`). An MCQ answered right comes back typed
when its answer is a defined term (`typedFrom`), unless its stem gives the
answer away or restates the definition.

**Memory** (`src/lib/memory.ts`): one stability per card, exponential
forgetting, due below `DUE_BELOW` = 0.75 recall, first right answer holds
`FIRST_RIGHT_DAYS`, growth `GROWTH` scaled by how faded it was, a miss
keeps `LAPSE_KEEPS`. A personal scale is fitted from the study log. With an
exam date, due is judged against exam morning (`isDueFor`,
`reviewUrgency`). A miss in the latest sitting comes back in a catch-up
after `CATCH_UP_HOURS` = 3 (`catchUpDue`).

**Exam** (`lib/exam.ts`, `lib/classExams.ts`): scope by sections, several
exams per class. In the last `CAP_WITHIN_DAYS` = 4 days, while exam
material is unseen, review is capped at `REVIEW_CAP` = 40% of the sitting.
The last three days split into three sittings a few hours apart
(`partMinutes`).

**Across lectures**: `lib/linkedTerms.ts` scores a term defined the same
way in two lectures once (answers mirrored, earlier records adopted at
session start). New lecture can name the lecture it follows
(`lib/previousLecture.ts`) so repeated slides are not carded twice.

**Content checks** (`lib/courseHealth.ts`, shown on the lecture page,
sent to the AI by Fix, `lib/buildFixPrompt.ts`; More practice is
`lib/buildPractisePrompt.ts`): give-aways, same fact, MCQs that restate a
definition, thin key terms, option-length tells, and older checks.

**Simulator** (`sim/`): drives the real stores and session code over a
simulated month on a fake clock, scores exam morning against a separate
truth model (`sim/student.ts`: `fsrs`, `harsh`, `fsrs-power`), synthetic
courses (`sim/course.ts`), scenarios (`sim/scenarios.ts`), several courses
(`sim/several.sim.ts`), calibration from a study log
(`sim/calibrate.sim.ts`, `scripts/calibrate-log.mjs`).

**Audit tools**: `src/lib/sessionAudit.test.ts` holds order rules on the
fixtures and prints the whole walk of any lecture:
`AUDIT_COURSE=/path/lecture.study.json npx vitest run
src/lib/sessionAudit.test.ts --reporter=verbose`.

---

## 5. The work, in priority order

### 5.0 Decisions worth re-opening

These rest mostly on the uncalibrated simulator (section 2). Each may be
right; check whether it still holds once the simulator is more realistic
(5.2) or against the research (5.6), and say plainly if it does not.

- **Review first, new material only after**, with the 40% cap only in the
  last 4 days and only with an exam date. Is "depth beats breadth" true for
  a real student, and for one who starts a few days out or never sets a
  date?
- **No cram mode.** It lost because the truth models give little credit to
  a review hours after the last; successive relearning research may say
  otherwise for the last days.
- **Due below 0.75 recall** and the growth constants, chosen against two
  guessed students.
- **Blocked sections in Learn** (no interleaving of new material).
- **`TERM_BUDGET` = 3** and the second look: helps the owner's experience,
  costs a little in one scenario.
- **Typed recall as the only test of a definition**: is typing the term the
  right first test, or should recognition come first for a brand-new term?
- **Self-graded flashcards**: students over-rate themselves; does the
  memory model trust a self-grade as much as a typed answer?


### 5.1 Scenario review of the scheduling, as a student lives it

The defaults are tuned for a steady student with a date set a month out.
Find where they are good on average and bad for a specific student.
For each scenario: run it (simulator where it can, the multi-day harness
in 5.4 on a real lecture, the browser in 5.3), say what the student
experiences sitting by sitting, and whether the app's choice is the right
one by the evidence. Start with these; add your own.

1. **Late start.** Five lectures, never studied, exam in three days, two
   hours a day. Does the student see all of it before the exam? How much of
   each sitting is review of what they met yesterday? The 40% cap applies
   only with an exam date and only to exam-scope material: what happens
   with no date set? With a date but the default "all sections" scope?
2. **No exam date at all.** Most students will not set one. Review is then
   never capped. Is that right? What does the first week feel like?
3. **The owner's case.** A big first section of basics (homeostasis,
   feedback loops) taught again in every lecture. Is the student stuck in
   it? `TERM_BUDGET`, `linkedTerms`, `newOnly` were the fixes; verify them on
   the owner's lectures in studied states, and look for what is left.
4. **Missed days.** Studies five days, misses four, comes back. How big is
   the review pile, and is it ordered so the first 20 minutes do the most
   good?
5. **Two sittings a day**, or a sitting abandoned halfway. Does the
   second sitting repeat the first? Does a half-done step resume sensibly?
6. **Several lectures, one exam.** Today runs per lecture. Is the time
   split across lectures sensible (`several.sim.ts` tests calendar splits
   only)? The owner has proposed an "Exam prep" mode for a whole class
   (HANDOFF task J); model it as a policy first.
7. **A student who already knows the material** (attended the lectures, or
   uses Questions first). Is time wasted reading?
8. **A student who keeps confusing two terms.** Confusion pairing plus
   in-step re-asks plus the catch-up: is it help or a loop?
9. **After the exam.** A passed exam, then the final: does the schedule
   switch cleanly (`lectureExam`)?
10. **A very large lecture** (the owner's nutrition course: about 660 Learn
    cards, 157 definitions). Step count, pacing, how long until the last
    section is reached at 30 min a day.
11. **Practice modes.** Weakest and Missed use got/missed counts, not the
    memory model (earlier audit, section 6). Is that wrong for a student?

For each algorithm constant above (`DUE_BELOW`, `GROWTH`, `LAPSE_KEEPS`,
`FIRST_RIGHT_DAYS`, `REVIEW_CAP`, `CAP_WITHIN_DAYS`, `STEP_TERMS`,
`STEP_CARDS`, `TERM_BUDGET`, `MIN_GAP`, `AGAIN_AFTER`, `AGAIN_MAX`,
`CATCH_UP_HOURS`), ask: where did the number come from (FINDINGS,
evidence.md, or nowhere), and is there a scenario where it is plainly wrong?

### 5.2 Make the simulator more like a real student

Every conclusion rests on it. Known gaps, roughly by how much they could
change a decision:

1. **Items are independent.** Cards on one term or fact share no memory, so
   the simulator cannot see that asking the same fact three ways is waste,
   or that a linked term studied in another lecture is already known.
   Add a shared memory component per term or fact.
2. **The course has random wording and uniform importance.** Add a course
   shape with key ideas and background, and an exam that weights key
   ideas, so importance-aware scheduling (HANDOFF task H) can be judged.
   Use `npm run sim:shape` on the owner's lectures (counts only, never
   their text) to make realistic shapes.
3. **The student is perfectly obedient.** Real ones skip days, stop
   mid-sitting, study more before the exam, choose Learn over Today, and
   start late. Add behaviours, keep the old scenarios (simulate skill rule
   7).
4. **First-exposure numbers are guesses** (`FIRST_TIME` in `sim/student.ts`:
   cold recall 0.15, primed 0.9 fading over 60 minutes, MCQ 0.6, flashcard
   0.65) and so are seconds per card (`SECONDS`). Check against the
   literature and, better, the owner's study log.
5. **The after-miss forgetting rate** decides most "late" reviews (earlier
   audit 3.1). It can be measured from the study log.
6. **Calibration** (`sim/calibrate.sim.ts`): get a backup from the owner
   (Help page, "Back up everything"), fit the truth model to it, and report
   how far `fsrs` and `harsh` are from this student. Never commit the log.

Log every assumption change with before and after in `sim/FINDINGS.md`.

### 5.3 Drive the app as a student

Screenshots of single screens missed the worst problems. A run-through is
a sequence of sittings over days, read the way a student meets them.

**Setup.** `npm run build`, `npx vite preview --port 4173`, base path
`/study-app/`. Seed `localStorage`: `arborous:onboarding` =
`{"state":{"onboarded":true},"version":0}` and `arborous:courses` with the
lecture. Chromium is at `/opt/pw-browsers/chromium`. Use Playwright's
clock (`page.clock.install`, `page.clock.fastForward`) to move hours and
days; the app reads `Date.now()`. Phone viewport 390×844, `isMobile`,
`hasTouch`. Shoot with `node scripts/screenshots.mjs <dir>` for the
static screens.

**Answer like a student, not a script.** Get typed terms right about 70%
of the time at first meeting, more after review; miss the pairs that look
alike; get "easy" MCQs right and some hard ones wrong; quit a sitting
halfway once; come back after a skipped day; tap Learn instead of Today
once; set an exam date three days out and see what changes.

**What to notice, every sitting:**

- Is anything asked that was just asked, or answered by the card before?
- Does "new material" contain only new cards? Does the screen that says
  what comes next say the truth?
- How long until the student reaches the second, third, last section?
- How much of the sitting is review, and of what?
- How many times is one idea asked, and are they different angles or the
  same question reworded?
- Do the step pauses feel like progress or like interruptions (steps of
  one or two cards)?
- Does the course page's plan ("Today · 30 min, New: …") match the sitting
  it starts?
- On an iPhone-sized screen: does anything sit under the status bar, does a
  card that fits scroll, does a dialog show the page through it?
- Would a student trust the readiness numbers?

Write down what you noticed per sitting before forming conclusions, and
measure what you can (`sessionAudit` on the session's items, counts by
section and type).

### 5.4 A multi-day harness for real lectures (rebuild it)

A quick one was used 2026-10-13 and deleted. It ran Today for four days on
a real lecture with `useProgressStore.recordResult` and a seeded random
student, printing cards per section per day. Rebuild it properly (a
committed script that reads a lecture path from an env var, never a
committed lecture), with: answers from a per-item probability, misses
re-queued as the session would, the catch-up, and a report per sitting of
cards by section, by type, review vs new, repeats within the sitting, and
cards already answered that the new part served. This is the tool that
would have caught the repeat bug.

### 5.5 Are the tests good?

1. Read each test in `src/lib/*.test.ts` and `src/store/*.test.ts` as a
   claim about what helps a student. Flag tests that pin behaviour no
   student would want, and tests that assert a constant rather than an
   outcome.
2. Add invariant tests that run over many generated progress states, not
   one: the new part never serves an answered card; no card is asked
   before what it needs is shown; nothing within `MIN_GAP` of a card that
   answers it; a sitting never exceeds its minutes by more than one step;
   every gradable card is reachable by some mode; set-aside cards never
   appear.
3. Extend `sessionAudit.test.ts` to studied states (half a section, a day
   later, after a review sitting).
4. Mutation check: break a rule on purpose (for example, remove `newOnly`)
   and confirm a test fails. If none does, the rule is untested.

### 5.6 Compare with other apps and the research

`docs/evidence.md` lists what was verified (testing effect, spacing and
the gap-to-retention ratio, interleaving for categories, one correct
recall per sitting, delaying the first test, errorful generation, adaptive
spacing, Anki in medical school) and what was not yet searched. Use the
PubMed connector if it is connected; otherwise say what you could not
verify.

- **Apps**: Anki (SM-2 and FSRS, with its published benchmark), SuperMemo,
  Quizlet Learn (rounds, mastery by format), RemNote, Brainscape
  (confidence ratings), Duolingo (half-life regression), Khan Academy
  mastery. For each: what it does that Arborous does not, and whether the
  evidence says it matters.
- **Questions to settle**: successive relearning (Rawson and Dunlosky) for
  the exam week; short-answer vs multiple choice as retrieval practice;
  the right first gap for a student starting a few days out (Cepeda et al.
  2008 on gap vs retention interval); whether mixing lectures in review
  helps (interleaving across topics); confidence or self-grading for
  flashcards; whether a per-concept memory (not per card) is how other
  schedulers work.
- Add what you verify to `docs/evidence.md` with the source, and mark what
  you only saw cited.

### 5.7 Content: what the AI writes and what the app does with it

`prompts/generator.md` (its "Quality bar" goes into all four prompts) was
rewritten 2026-10-13. Check it by generating a made-up lecture yourself
from made-up notes (scratchpad only) and running the course check and the
session audit on it: does the result follow the weight table, the MCQ
difficulty mix, nuance not trivia, parts of one system taught together?
Where it does not, is the rule unclear? Also check the detectors in
`lib/contentChecks.ts` on a subject unlike biology (the psychology and
nutrition lectures; a made-up maths or history lecture).

---

## 6. Open items you inherit (HANDOFF task numbers)

- **#63** Calibrate the simulator from a real study log.
- **#88** iPhone header under the status bar (a measured fallback in
  `lib/statusBarFallback.ts`); unconfirmed on the owner's phone.
- **G (#102)** `TERM_BUDGET` costs the half-scope scenario about 2 points
  of exam score and 4 of held; kept for the owner's experience. Decide
  with better data.
- **H (#103)** Weight scheduling by importance. The owner's signal: how
  much detail and time the lecture spends on a concept compared with
  others.
- **I (#104)** How much repetition comes from misses, mix-ups and the
  catch-up (needs the study log).
- **J (#105)** Exam prep across a class. Cram, massed repetition, lost in
  the simulator by 6 to 9 points; the exam-week rules that won are already
  in Today.
- Known rough edges: a section whose repeats cannot be spaced ends in a
  step of one or two cards; `restatesDefinition` uses a 0.4 overlap
  threshold chosen by eye; `givesAway` treats word families by a 5-letter
  stem (it flags "Phospholipase A2" from "phospholipid").

---

## 7. What to hand back

A report in `docs/audits/` (dated), most important first. Each finding:

- what a student experiences, in one or two plain sentences;
- the evidence (a reproduction, numbers, a walk excerpt, a source);
- what you changed, with the test that failed before and passes after, and
  the simulator before and after on equal seeds, under both students; or
  why you left it, and what it waits on.

Keep a task list from the start, one item in progress at a time. Ship each
fix when it is tested (build, lint, tests, simulator where relevant), push
it, and check it on the live site. Update `docs/HANDOFF.md` §0 and
`sim/FINDINGS.md` as you go. End with a short message to the owner: what
was wrong, what is better and by how much, what you did not check, and what
you need from them (most likely: their lectures and a backup of their
study log).
