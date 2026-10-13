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

## 2. Ground rules

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

## 3. The system in one page

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

## 4. The work, in priority order

### 4.1 Scenario review of the scheduling, as a student lives it

The defaults are tuned for a steady student with a date set a month out.
Find where they are good on average and bad for a specific student.
For each scenario: run it (simulator where it can, the multi-day harness
in 4.4 on a real lecture, the browser in 4.3), say what the student
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

### 4.2 Make the simulator more like a real student

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

### 4.3 Drive the app as a student

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

### 4.4 A multi-day harness for real lectures (rebuild it)

A quick one was used 2026-10-13 and deleted. It ran Today for four days on
a real lecture with `useProgressStore.recordResult` and a seeded random
student, printing cards per section per day. Rebuild it properly (a
committed script that reads a lecture path from an env var, never a
committed lecture), with: answers from a per-item probability, misses
re-queued as the session would, the catch-up, and a report per sitting of
cards by section, by type, review vs new, repeats within the sitting, and
cards already answered that the new part served. This is the tool that
would have caught the repeat bug.

### 4.5 Are the tests good?

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

### 4.6 Compare with other apps and the research

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

### 4.7 Content: what the AI writes and what the app does with it

`prompts/generator.md` (its "Quality bar" goes into all four prompts) was
rewritten 2026-10-13. Check it by generating a made-up lecture yourself
from made-up notes (scratchpad only) and running the course check and the
session audit on it: does the result follow the weight table, the MCQ
difficulty mix, nuance not trivia, parts of one system taught together?
Where it does not, is the rule unclear? Also check the detectors in
`lib/contentChecks.ts` on a subject unlike biology (the psychology and
nutrition lectures; a made-up maths or history lecture).

---

## 5. Open items you inherit (HANDOFF task numbers)

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

## 6. What to hand back

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
