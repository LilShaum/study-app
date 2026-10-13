# Fresh-eyes review: 2026-10-13 (partial)

Brief: `docs/briefs/fresh-eyes-review.md`. This session ran out of time early;
what was done, shipped and left open is below. Most important first.

## Shipped (live)

### 1. Review asked a card right after one that gave its answer

**What a student met.** In Review and in Today's review part, a card often
came one to three cards after a card that printed its answer: a typed
term whose definition names another term, then that other term typed. (The
owner's own cards are left out of this public repo.) Learn has had a spacing rule
for this since 2026-10-13 (`apart`, `MIN_GAP` = 5). Review had none: due cards
sorted by urgency put a term's cards side by side.

**Evidence.** The new harness (`sim/lecture.sim.ts`) on the owner's five
lectures, a week of 30-minute Todays, studied states: 2 to 11 review cards per
sitting answered by a card fewer than five before (Endocrinology day 3: 11 of
65). After the fix: 0 to 2.

| Lecture | before, per sitting (days 1–6) | after |
|---|---|---|
| Endocrinology | 9, 3, 11, 4, 6, 5 | 0, 0, 1, 1, 1, 0 |
| Cell Signaling | 4, 1, 11, 3, 5, 2 | 0, 0, 1, 0, 0, 0 |
| Neuronal Function | 7, 3, 2, 7, 3, 1 | 2, 0, 0, 0, 1, 0 |
| Nutrition | 11, 2, 7, 9, 2, 2 | 0, 0, 0, 2, 0, 0 |
| Psychology | 2, 2, 5, 3, 5, 3 | 0 everywhere |

**Change.** `spaced()` in `lib/learnSteps.ts`: same cards, same time, each
moved to the first place at least five cards from a card that answers it.
Used by Review and Today's review part. Test: `lib/reviewOrder.test.ts`
(failed before, passes after). Simulator (5 seeds, equal seeds): level, every
scenario within ±1 point (steady-30 60→61, busy-20 31→30, half-scope 85→85,
harsh 19→20, late-start 69→69, crammer 79→78).

### 2. "Keep going" in exam week planned a whole day on top of a part

**What a student met.** In the last three days before an exam, Today plans
the day as three parts a few hours apart. Pressing Keep going after a part
planned the full daily time again: on a 2-hour day, a 40-minute part then a
132-minute sitting straight after (184 minutes, and no spacing).

**Change.** Keep going while parts are planned is one more part
(`lib/todaySitting.ts`). Test in `lib/reviewOrder.test.ts` (failed before).

### 3. A multi-day harness for real lectures (brief 5.4)

`sim/lecture.sim.ts`: `SIM_LECTURE=/path/a.study.json[,others]` drives the real
stores (Today, Keep going, Learn, Continue, catch-up) on a fake clock with a
seeded student and reports each sitting: review vs new, reading, cards
already answered served as new, repeats, cards answered by one just before,
second-look cards, 1–2 card steps, sections reached. Plans: steady, evening,
keep-going, missed-days, quit-half, learn-instead, late-start (and -parts,
-keep). Card times are the owner's measured medians. Never commit a lecture.

## Found, not fixed (open)

1. **Learn from the course page can give 2 cards and stop.** It opens the
   first section with anything unanswered, which after a first meeting is
   the section just finished (its held-back "second look"). Measured: day 2,
   Learn instead of Today = 2 cards. Proposed: Learn on a section with only
   its second look left carries on into the next section.
2. **Sittings run long.** The first 30-minute Today ran 39 minutes (guessed
   seconds per card are low for this student: typed term 25 s measured vs 15
   guessed; until 15 of a type are logged), and with Questions first 58
   minutes: re-asks of misses are not in the plan. The simulator stops at the
   budget, so it never sees this. Proposed: budget expected re-asks; update
   the guessed seconds (and the simulator's) from real logs.
3. **Review fills whole sittings from day 3** at 30 min/day (the first
   interval is about 14 hours, so all of yesterday comes back). After a week
   a 30-minute student reached 2–7 of 8–14 sections. This is the tested
   "depth beats breadth" design; whether it is right for a real student
   depends on real forgetting (next item).
4. **Calibration (#63): not possible yet.** The backup has 58 answers. One
   signal: 13 reviews a week or more after first answers, app predicted ~8%,
   got 85% (11 of 12 on Endocrinology basics). Likely prior knowledge and
   lectures, and the owner says the data is thin. Both simulated students
   (`fsrs`, `harsh`) forget far faster than that. Needs a few weeks of real
   use.
5. **One-a-day students in exam week** get a third of their time: the parts
   need the student to come back. Not modelled in the simulator's default
   student.
6. Second-look tails can still put two cards on one fact back to back across
   a pause screen (0–4 a sitting); the audit's "tail" exemption hides them.

Not done from the brief: invariant tests over generated states and mutation
checks (5.5), browser drive (5.3), simulator realism (5.2), research (5.6),
fresh generated lectures (5.7). The simulator baseline was not re-saved
(changes were level).

## Follow-up the same day (the building session)

What happened to each open finding above:

1. **Learn gave 2 cards and stopped**: fixed. Learn on a section with only
   its second look left (or a couple of cards) carries on into the next
   section; a second look waits `CATCH_UP_HOURS` after the section was last
   studied. The learn-instead day on Endocrinology: 2 cards → 22.
2. **Sittings ran long**: fixed. Default card times are the owner's
   medians; new material is planned with the expected re-asks (measured
   share of first tries missed, 30% until there are answers, at least 60%
   with Questions first). A 30-minute Today on Endocrinology now runs 26–29
   minutes, 28 on day 0 with Questions first (was 39 and 58).
3. **Review fills whole sittings from day 3**: addressed through finding 4.
4. **Calibration**: the app now fits the student's forgetting rate itself
   (`lib/personalScale.ts`), cautiously, from their logged reviews. A slow
   forgetter gains 8 to 11 points in the simulator; the default student is
   within noise in exam score, "held" 3 to 5 lower in a few scenarios
   (sim/FINDINGS.md). The simulated student's card times are now the owner's
   measured ones, which lowers every absolute score.
6. **Second-look tails**: measured after the fixes above, a week of
   30-minute Todays on all five lectures: 0 to 1 close pair per sitting on
   most days (one day 4). Left.

Also: the owner's lecture wording that had reached the repo (in tests,
comments, docs and the generator prompt's examples, from several sessions)
was replaced with made-up examples. It remains in git history.

