# Code audit: 923690b..451e02e (Arborous)

Scope: backup/restore, study log, minute-sized Review, exam_sections, session logging.
Confidence labels: **test** = reproduced with a scratch vitest run, **read** = confirmed by reading the code path end to end, **suspect** = plausible, not reproduced.
All 57 tests in the diff's own test files pass. No app code imports from `sim/`.

## High

### H1. Study log can crowd out progress and courses in the 5 MB budget, and leaks after a course is deleted
`src/store/studyLog.ts:41-43, 64-71`, `src/routes/LibraryRoute.tsx:129-135` — **confirmed (computed + grep)**.
- At the caps (3000 answers + 1500 times) one course's log serialises to ~450 K chars = ~900 KB of localStorage (UTF-16). `sinceHours` and `predicted` are stored as full-precision doubles (17 digits each), which is most of that.
- The cap is per course and the number of courses is unbounded: five active courses at cap is 4.5 MB on their own.
- `handleDelete` clears progress and the bookmark but never calls `useStudyLogStore.clear(id)` (grep: `clear` has no callers), so a deleted course's log stays forever.
- Scenario: student with a diagram-heavy library studies for a term; the log fills the quota; `safeLocalStorage.setItem` starts failing silently (one toast per session, already spent), and from then on `recordResult` writes are lost too — answers vanish on reload. `record()` even writes the log *before* the progress record.
- Fix (smallest): round `sinceHours` to 2 dp and `predicted` to 3 dp; drop `MAX_ANSWERS` to ~600 and `MAX_TIMES` to ~400 (measuredPace only reads the last 400 anyway); call `useStudyLogStore.getState().clear(id)` in `handleDelete` (and re-add on Undo if you care); and in `logCard`/`logAnswer` skip the write when `storageUsage()` is near the limit or when a write has already failed.
- Related cost: every `next()` and every answer re-serialises the whole `byCourse` map synchronously on the main thread (two writes per card). Fine at 50 KB, noticeable on an older iPhone at 1 MB+.

## Medium

### M1. Sub-second card views become 0-second samples; a 0 pace makes `fitMinutes` serve the whole due list
`src/store/studyLog.ts:48-49`, `src/lib/buildSessionItems.ts:38-48` — **test**.
- `logCard` rejects `seconds <= 0` but then stores `Math.round(s)`, so 0.4 s is stored as 0. Fifteen skims (tapping Next through definitions or examples, or flipping through Prev/Next) gives `measuredPace` a median of 0 for that type; `fitMinutes` then never breaks (`spent + 0 > limit` is never true) and Today/Review serve every card of that type. Reproduced: 15 × 0.4 s → `{flashcard: 0}` → 500/500 served for a 1-minute sitting.
- Fix: `if (seconds < 1) return;` (or `Math.max(1, Math.round(s))`) in `logCard`, and floor the median in `measuredPace` (e.g. `Math.max(3, median)`).

### M2. A Review sitting has no ceiling any more
`src/lib/buildSessionItems.ts:38-48, 373` — **test**.
- The old fixed 50 existed because "a sitting that long is one nobody finishes". Now the size is minutes ÷ measured pace with no cap: 90 min at a measured 4 s/flashcard is 1350 cards in one sitting (reproduced); 30 min at the 12 s default is 150. Fast flashcard graders are common.
- Fix: keep the minutes sizing but add a soft ceiling in the `review` case, e.g. `.slice(0, MAX_SITTING)` with 100–150, and rely on "Keep reviewing" for the rest.

### M3. `fitMinutes` drops a card that exactly fits when `minutes*60` rounds below the seconds sum
`src/lib/buildSessionItems.ts:43`, `src/lib/today.ts:97-99` — **test**.
- `splitSitting` returns `reviewMinutes = dueSeconds/60`; `fitMinutes` compares against `minutes*60`. For 404 of the first 20 000 integer second-sums (123, 245, 246, 247, 490, …) `(x/60)*60 < x`, so the last due card is left out of Today even though it fits. Reproduced: 35+35+35+18 = 123 s → 3 of 4 served. Pre-existing in the old inline loop, now in the shared helper, so worth fixing here.
- Fix: work in seconds (`fitSeconds(list, seconds, pace)`), or compare `spent + s > minutes*60 + 1e-6`.

### M4. Time on the Learn/Today pause screen (and the finish screen, and section jumps) is charged to the next card
`src/store/session.ts:17-23, 170-187, 278-291, 295-329`, `src/components/session/CardSession.tsx:295-307, 449-489` — **read**.
- `next()` logs the card and resets `shownAt`; then CardSession shows the pause ("Step 2 of 5 done") until the student taps. That dwell (up to the 180 s cap) is logged as the *following* card's time. `retryMissed` and `restart`-less paths do the same with the finish screen; `jumpToSection` neither logs the card being left nor resets `shownAt`, so the target card inherits the elapsed time.
- Effect: pace medians for the first card type of every step (usually `definition`) are inflated; with steps of 3–5 cards that is 20–30% of samples.
- Fix: add `cardShown: () => { shownAt = Date.now(); }` to the store; call it when the pause closes (`setPause(null)`), in `retryMissed`, and in `jumpToSection` (after logging the card being left if you want it counted).

### M5. A backup taken while storage is full is silently stale
`src/lib/backup.ts:34-38` — **read**.
- `makeBackup` copies localStorage strings. When writes have been failing (quota), the in-memory stores are ahead of localStorage; the student who backs up *because* the app said storage is full gets a file missing everything since the first failed write, with no warning. This is the exact moment a student reaches for Back up.
- Fix: build the backup from each persisted store's in-memory state (`{state: partialize(store.getState()), version: 0}` for courses/progress/resume/plan/theme/onboarding/fallen/study-log), or at minimum warn when a write has failed this session (expose `quotaWarned`).

### M6. Any store write after `restoreBackup` overwrites the restored key with the old in-memory state
`src/lib/backup.ts:86-105`, `src/components/Backup.tsx:59-63` — **test** (mechanism), **read** (exposure).
- Reproduced: restore a theme of `dark`, then `setMode('light')` → localStorage is `light`. In the restoring tab the window is tiny (restore → `reload()` in the same task, and neither Help nor the empty Library writes on render), so this is fine in practice. It is real with a second tab open (desktop Safari/Chrome, or an iPad split view): that tab's next write — answering a card, saving a theme — replaces the restored courses/progress with its old copy.
- Fix: cheapest is a `storage` listener that reloads when an `arborous:` key changes underneath a tab; or say "close other Arborous tabs" in the confirm text.

### M7. Backups from a future app version are accepted and can be wiped on first write
`src/lib/backup.ts:49-64` — **read**, forward-looking.
- `readBackup` ignores `version` and stamps 1. Today every store is persist version 0, so old↔new is fine. The day a store bumps `persist.version`, restoring a *newer* backup into an older install makes zustand skip hydration (no `migrate`), the store starts empty, and its next `set` writes the empty state over the restored key.
- Fix: refuse `version > 1` with "made by a newer Arborous", and record the app version in the file.

## Low

- **L1** `src/routes/HelpRoute.tsx:59` still says Review is "50 at a time".
- **L2** `src/store/session.ts:243-262` `setResult` (the "I was right" override) revises progress but not the answer log; the log keeps the original verdict. Calibration data only.
- **L3** `src/store/session.ts:212-217` `afterMiss` uses `<=`: a hit on an item at the 365-day ceiling (or in the same millisecond) is logged as following a miss. Calibration only.
- **L4** `src/components/Backup.tsx:29-31` resets `e.target.value` before `await file.text()`. Works in current browsers; reorder to after the read costs nothing and removes the one way the picked File could be invalidated.
- **L5** `src/lib/backup.ts:114-118` Chrome/Android's Web Share file allowlist excludes `application/json`, so `canShare` is false there and it falls to the download path (works). On an iOS home-screen app the download fallback (if `share` throws anything other than AbortError) opens a preview/blank page; the comment acknowledges it. Fine as long as `share` succeeds, which it should for a user-gesture call.
- **L6** `src/store/studyLog.ts:59` `days[day] += s` adds up to 180 s for a card left open across a phone lock, on the day the student returns. Only the study log's "seconds by day" is affected.
- **L7** `src/components/AddToCourseDialog.tsx:82-86` the follow-up `updateCourse` that writes `exam_sections` is outside `persisted()`; the merge just landed so it will almost always succeed, but a failure here is silent.
- **L8** `src/lib/exam.ts:60-61` (pre-existing) an `exam_sections` list that filters to nothing (the only covered section was deleted) becomes scope=all. Now that lists are always explicit this is the one way to get the old "everything counts" behaviour by accident.

## Checked and fine

- `restoreBackup` quota rollback: removes own keys, writes, and on throw restores the prior snapshot; `arborous:migrated` is set so the legacy import cannot run over a restore. Correct.
- Backup key selection: `arborous:` prefix covers every store (`courses, progress, resume, plan, theme, onboarding, fallen, study-log, migrated`); `readBackup` drops foreign keys and non-string values; course files are recognised and refused with a pointer to Upload.
- Restore UI: `window.confirm` and programmatic `input.click()` inside a click handler work in iOS standalone; the input is reset so the same file can be picked twice; error and quota paths toast and leave storage untouched.
- `buildSessionItems(…, 'review')` callers: `session.init` passes `usePlanStore.minutesFor(courseId)` (default 30) plus measured pace; `CardSession` passes `minutes: Infinity` for the "N more are due" count, and `dueFirst` filters by `isDueFor`, so that count is only what is still due after this sitting's answers (it is computed after the last `record`). `CourseRoute` only builds `today`. No other code assumed 50; only the Help text (L1).
- Double logging: on the last card `next()` returns false *before* `logCurrentCard`, and `finish()` logs once; `record()` is guarded by `answeredIndices`; requeued copies are distinct positions and legitimately logged again. Browse does not use the session store, so browsing does not feed the pace.
- Time away from the tab is capped at 180 s per card by `MAX_CARD_SECONDS`; a resumed session goes through `init`, which resets `shownAt`.
- `ExamDialog`: Save is disabled with a date and nothing ticked; an explicit ordered list is stored; `examAfterAdding` builds "all existing except the new ones" for a course that predates explicit lists, includes new sections until the last 7 days, and the toast's flip action computes the complementary list correctly. `examRule` and the test file agree with the new semantics.
- `today` path: `fitMinutes` with `reviewMinutes <= 0` yields `[]` as before; the first Learn step still always fits.

---

## Resolution (same day)

Fixed: H1 (log caps lowered, values rounded, log cleared with its course, and
safeStorage drops the study log first when storage is full), M1 (sub-second
views skipped; pace floored at 3 s), M2 (Review ceiling `REVIEW_MAX` = 200),
M3 (float allowance in `fitMinutes`), M4 (pause screens restart the card's
clock; `jumpToSection` logs), and the Help text.

Not fixed, judged rare enough to leave: M5 (a backup taken while storage is
already full), M6 (a restore with a second tab open), M7 (a backup from a
newer app version restored into an older one).
