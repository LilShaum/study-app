# A heatmap of study each day

The owner, 2026-11-10: "a long time ago i suggested a heatmap for user
activity each day kinda like that very popular anki mod or other study
things like leetcode i think". Asked before docs/ASKS.md began, so never
written down until now.

## 0. How this is decided

1. **What it is for.** A picture of the student's own studying, day by
   day: whether it is spread out or crammed, and that it adds up. The
   Anki add-on (Review Heatmap) and LeetCode both show it as a calendar
   of small squares, darker for more. Both add streak counts, and the
   Anki add-on adds a forecast of what comes due.
2. **What it must not become.** CLAUDE.md, Today (2026-10-21): the reason
   to come back is what is fading, "not in streaks or guilt". A calendar
   of empty squares can read as a record of failure, and a streak count
   is a streak. The design has to keep the picture and drop the guilt.
3. **Who meets it, and how often.** If it is on the library, every day.
   It must not push the day's Start off the first phone screen (the
   design audit's rule for the daily path).
4. **The data.** The study log keeps seconds studied by local date for
   each lecture (`store/studyLog` `days`). It has done so since
   2026-09-26, syncs (the larger figure for a day wins), and is never
   trimmed when storage fills. Deleting a lecture deletes its days.
5. **The simulator.** Not needed: nothing about what is asked, or when,
   changes. No claim is made that the heatmap improves learning. It is
   the student's own record, and its value is seeing it.

## 1. What it shows

- **A. The past only**: each day shaded by minutes studied. Exactly the
  ask, and the least work. The risk is that gaps read as guilt.
- **B. The past, then what comes due ahead**, as the Anki add-on does.
  The future half ties the picture to the app's reason to come back. But
  it is a projection from the memory model that moves every time the
  student studies, and Today already turns it into the day's plan. A
  number of cards "due" on a future day is a precision the app avoids
  showing anywhere else.
- **C. A calendar of fading only.** Not what was asked.

**A**, with guards against guilt:

- no streak count;
- an empty day is plain paper, never a colour that means "missed";
- the line under the grid states facts in the student's favour: days
  studied, and the minutes on an average day of study.

B stays a question for the owner (section 4).

## 2. Where it goes

- **(1) The library, below the lectures.** Seen every day, never above
  the day's Start, and across every lecture, as the Anki add-on is.
- **(2) Each lecture's Progress.** One lecture alone: less of the
  picture, and Progress leads with what is fading by the owner's choice
  (design audit D).
- **(3) A page of its own.** One more page to find, and a heatmap is
  meant to be glanced at, not visited.

**(1)**: the library is the one daily screen that covers every lecture,
and the foot of it costs the first screen nothing. The same grid for one
lecture on Progress is cheap later if wanted.

## 3. How it looks and works

- A grid of the last weeks, a column a week and a row a day, Sunday
  first (the owner's classes are North American, as LeetCode's grid
  is). On a 390px phone, 26 weeks of 11px squares with 2px gaps take
  338px. It starts from the first week studied, at least 8 weeks, at most
  26, so a new student sees a short grid rather than half a year of
  blanks.
- Shaded in the ink, four steps by minutes (under 10, 10 to 25, 25 to 45,
  over 45), mixed toward the paper (`color-mix` of theme tokens, no new
  colours): pencil on a ruled register, in keeping with the book look,
  not a green dashboard. Empty days are a hairline square. Today has an
  outline.
- Above the grid, small-caps month names. Below it, a line: "Studied 23
  of the last 56 days, 31 minutes on an average day of study." A tap or
  hover on a square replaces the line with that day: "Tuesday 4 November:
  35 minutes, 3 lectures."
- Shown once there is a day of study. With none, nothing: an empty grid
  is the guilt picture.
- Built for screen readers as an image with the summary line as its
  label.

## 4. Questions for the owner

1. **Streak counts** ("current streak", "longest streak") are left out
   because of the line in CLAUDE.md. Do you want them anyway?
2. **What comes due ahead** (B): want it, after seeing A?
3. **Deleted lectures** take their days with them. Keep the days of a
   lecture once it is deleted? It is a small change to the store and to
   sync.

## 5. Build

`lib/heatmap.ts` (pure: the weeks, the shade of each day, the summary
line) with tests; `components/StudyHeatmap.tsx` on the library below the
lectures; phone and desktop screenshots in both themes to the owner
before it goes live (a new element on the daily screen is taste as much
as reasoning, as the design audit's directions were); then EXPECTATIONS,
What's new, and live.
