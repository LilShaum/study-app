# The first run: one lesson per page

2026-11-27. The owner, on two screenshots ("2 of 8", point at the tree and
click a number; "4 of 8", sweep across the tree, "that's section 5"): "dont
they seem to be kinda showing the same thing? … the order of the onboarding
should be reevaluated and also the contents of it, not only for the
redundant stuff but also if its maybe missing anything important".
Broken down in `docs/FEEDBACK.md` (2026-11-27, the first run repeats
itself). **Size: macro**: the first run's order and content, not a page's
words.

## How to decide

What the first run is for (EXPECTATIONS, first run; the owner 2026-11-24 and
2026-11-26): show what the tree means by doing, in general terms (a branch is
a section, leaves are what you learn, falling leaves are what fades), then
set the student up (time, name, account) and send them to make a lecture.
Who meets it: a new student, maybe with ADHD, who will skim. The test: each
page teaches one thing no other page teaches, in an order where each builds
on the last, and the student touches the tree for each.

What each tree page teaches now:

| Page | Says | The student does |
|---|---|---|
| 2 grow | a branch is a section; leaves grow as you learn | points, a number lights, taps two numbers |
| 3 fade | without review, leaves fall; one kept its leaves; Arborous brings fading sections back | taps "Skip ahead three weeks", watches |
| 4 find | sweep to find a section; tap its number to open it | points, a number lights |

Page 4 repeats page 2's gesture and result, with nothing new. What is
missing: the loop the app is built on (CLAUDE.md, Today: "the reason to come
back is what is fading"). The first run says Arborous brings fading sections
back, but the student never sees review win leaves back, so the fall is the
last thing they see the tree do: a loss, not a reason to come back. The time
page then asks for minutes without saying what a day's session does with
them.

## Options

- **A. Drop the find page.** Pages: Arborous, the tree (point, a number
  lights, tap it or its branch to study it; twice), let time pass, daily
  time, name, account, first lecture. For: removes the repeat, one page
  shorter. Against: the gap stays; the first run still ends its tree on the
  fall.
- **B. Drop the find page and close the loop.** As A, and after the fall
  the student taps a fading branch to review it: its leaves grow back and its
  pile clears ("Review brings them back"). The time page says what a day's
  session does: brings back what is fading, then teaches what is next, in
  the time chosen. For: every tree page teaches one new thing (map and
  study, fading, review), in the order a student lives them; the last thing
  the tree does is grow back, the reason to return; no extra page. Against:
  one more tap on the fade page.
- **C. One tree page for everything.** Pick, study, time passes, review, on
  one page with the words changing and Continue only at the end. For: fewest
  pages (6). Against: a long page with four beats; Back throws all of them
  away; the step counter stops telling the student how far along they are.

**B.** It answers both halves of the ask (the repeat, and what is missing)
without adding a page, and it ends the tree's part on the app's reason to
come back. A leaves the gap; C trades clear steps for a lower page count,
which matters less to a skimming student than knowing what one thing to do
now.

## Build (B)

- `Onboarding`: pages `title, (install), tree, fade, time, name, account,
  (remind), start`. The tree page: "Each branch is one section of a
  lecture." / "Move your pointer across the tree." → on pointing, "That's
  section 3. Click it to study it." → the two-section steps as before.
- The fade page after the fall: "Study a fading one to win its leaves back";
  a tap on a branch studies it, its leaves bud back and its pile clears
  (CourseTree `grewFrom`, the end-of-session regrowth); then "Review brings
  them back. Each day, Arborous brings back what's fading before you forget
  it." Continue once reviewed.
- Time page line: "Each day's session brings back what's fading, then
  teaches what's next, in that time."
- With the faults in the same note: the tree answers the pointer as soon as
  it moves after a tap (it rested 2.2 s); a pointer over a branch's leaves
  picks that branch; leaves about to fall are on their branch from the first
  frame; a click on the picked branch opens it, as its number does.
