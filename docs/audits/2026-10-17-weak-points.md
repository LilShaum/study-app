# Weak points: 2026-10-17

Asked by the owner after the first PSYC 351C test. Checked by using the
built app the way a student does, not by reading code: a fresh install, and
the owner's real backup (11 lectures, 5 weeks of a semester) on a 390 px
phone, with the CPU slowed 4× for timings. Plus the Learn walk on a real
lecture, the lecture check on all 11 lectures, a restore of the real backup
and an offline launch. Course content stays out of this file.

Not checked: sync (needs an account), a real iPhone, the simulator (nothing
in scheduling changed since its last baseline).

## Ranked, most harm first

### 1. Storage fills up (done 2026-10-18)

Lectures live in the browser's localStorage, about 5 MB. The owner's
backup holds 1.78M characters (11 lectures, about 160k characters each).
**Correction, 2026-10-18:** this audit first said 3.4 MB of 5 MB, counting
two bytes a character. Measured, Chromium allows 5,242,880 characters of
any kind, so it was 34% full there; WebKit (the iPhone) is thought to count
plain text at one byte a character, which also gives about 35%. So about
20 more lectures, not 5: still within the semester, not within weeks. When
it is full:

- a new lecture cannot be saved (a toast says so; the advice is to export
  and remove a lecture);
- before that, to make room, `safeStorage` **silently deletes the study
  log**: the data the back-burner calibration is waiting for.

Done: lectures are stored compressed, a key each (`lib/packedStorage.ts`):
1.78M characters became 0.26M, about 7× the room in Chromium and about 4×
by WebKit's count. The library warns from 75% full, counted the strict
way; the study log is trimmed (and put back if that does not help), never
deleted.

### 2. Everything exists only on one phone (done 2026-10-18)

No sync account in the backup, and nothing ever suggests a backup (Help has
the button; nothing points to it). A lost phone, a reset, or deleting the
home-screen app (which on iPhone deletes its storage) loses every lecture
and all progress. Fix: a quiet line on the library when there is something
to lose and no recent backup ("Last backup: never. Back up now"), as the
app-making rules describe; or a nudge to turn on sync.

### 3. The right answer is often the longest option (done 2026-10-18)

Share of MCQs where the right answer is the longest of the four (fair is
about 25%):

| Lecture | Share |
|---|---|
| PSYC 351C Vision | 55% |
| PSYC 351C Motor Processing (written in-session, not by the generator) | 50% |
| EPHE 155 Nutrition | 44% |
| PSYC 351C Neuroanatomy & Methods | 42% |
| PSYC 351C Studies (copied cards) | 41% |
| Endocrinology | 40% |
| the other five | 23–31% |

A student who guesses the longest scores well, so practice scores flatter.
The lecture check reports it on only 4 of these (it waits for 3 standard
deviations on 20+ questions). The generator rule shipped today helps new
lectures only; old ones need Fix, which costs a full AI session each. Fix
options: report from about 35%, and a small Fix that only rewrites the
wrong options (much cheaper than the full Fix).

### 4. The library gets slower with every lecture (done 2026-10-18)

Opening the library works out Today for every lecture in full, including
the pairwise "is this card answered by an earlier one" checks. Measured:
547 ms to the library at full speed, 2.4–3.7 s at 4× slower CPU; Today's
calculation is 172 ms of it at full speed, drawing the trees 87 ms. It
grows with each lecture, and per section with the square of its cards.
Fix: remember each lecture's result until it or its progress changes, and
compute only the one-line summary the library shows.

### 5. Every lecture carries warnings no one will fix (done 2026-10-18)

All 11 lectures have 2 to 10 findings (most often: same fact asked twice
10, worded like the source 9, sections that only ask recall 9, terms never
asked 7). Most come from lectures made before this week's prompt. Each Fix
is a full AI session, which the owner cannot afford often (usage ran out
the night before the test). So the warnings become wallpaper. Fix: rank
them by what changes studying (wrong-answer length, answers given away)
and quieten the rest.

### 6. Generating a lecture is expensive (done 2026-10-18)

A lecture reply is 90–340 KB of JSON (roughly 25k–85k output tokens); slide
excerpts, explanations and wrong-answer reasons are about 40% of it. The
generator prompt grew from 24k to 42k characters in five days. Fix: a
length cap on excerpts and explanations, and a consolidation pass on the
prompt (the owner has asked for one before).

### 7. Reading share is high on a first day

The Learn walk on a real, untouched lecture: 278 cards, 35% reading; the
first Today: 41% reading. No answers given away, no card close to one that
answers it. The owner asked for no drastic changes to Learn; noted only,
to weigh against logs from other classes.

### 8. Small

- Restore asks with a browser `confirm()`, which the design rules forbid
  (the app's own sheet, with the verb on the button, is the rule).
- Class Practice runs one lecture after another; cards from different
  lectures are never mixed in one sitting.

## What held up

- First run: welcome, empty library, the way to the prompt.
- Restore of the real backup: 11 lectures and the study log back intact.
- Offline launch: the library opens with no connection.
- Learn order on a real lecture: 0 give-aways asked, 0 cards close to one
  that answers them.
- No page errors anywhere in the walks.
