# The first run

The owner, 2026-11-11: "the onboarding could definitely be updated in terms
of both ui/ux (first impressions matter) but also in terms of the
information that would be useful. i feel like making an account would be
an obvious thing, i need you to brainstorm others". And, offered "as food
for thought instead of immediately accepting": set up your classes first,
so New lecture can tick the class and a lecture whose notes never name
their class still lands with its class, "no matter what".

## 0. How this is decided

1. **What it is for.** The first minutes: a student should see what
   Arborous is, have it set up right (installed, their work safe, their
   classes known), and be studying soon, without filling in a form.
2. **Who meets it, how often.** Every new student, once, and a returning
   one on a new phone. Each question costs a new student patience, so a
   question asked here must change what the app does. Anything that can be
   asked at the moment it matters is asked then instead.
3. **What exists.** One boxed dialog ("Welcome to Arborous"): three
   lines on how a lecture is made, install steps on a phone, one button.
   Then an empty library. A box with a border and a shadow is web
   furniture the book look avoids (arborous-design skill). And the first
   thing a new student can do is homework: take a prompt to an AI chat.
4. **A constraint that orders it.** On an iPhone the home-screen app has
   storage of its own, apart from Safari (Help says so; the current welcome
   leads with installing for this reason). Anything set up in Safari before
   installing is not in the installed app. So installing comes first, and
   the rest happens in the installed app, or comes back from an account.
5. **Built for any class.** Nothing asked here assumes a kind of class.

## 1. Brainstorm: what the first run could do

For each idea: what it changes, and whether to ask now or later.

1. **Install to the home screen.** Exists. Now, and first, on a phone.
2. **An account** (the owner's). Sync already exists (email and password).
   It keeps the work safe if a phone is lost or its storage cleared, and
   carries it between devices. Now, as a choice with "Not now". A
   returning student signs in here and their library comes back.
3. **Your classes** (the owner's idea). Code, name, and the next exam's
   date if known. It changes the class on New lecture (section 2), Today's
   planning for exams from day one, and the library's grouping. Asking
   now saves doing it later, but it is a form before the student has seen
   the app do anything. Optional, and skippable.
4. **Your time on most days.** One tap (10, 20, 30, 45 minutes); Today
   sizes itself by it. It exists as a setting with a default of 30. Now:
   cheap, and it shapes the first Today.
5. **A sample lecture to try.** A short made-up lecture shipped with the
   app, so a new student studies a card within a minute, before the AI
   step. Its subject could be how memory works (spacing, retrieval,
   feedback: the science the app runs on, from docs/evidence.md), so it
   teaches why the app works while showing how. Removable with one tap. It
   changes the first impression from an empty shelf and homework to
   studying now. It costs a lecture written carefully.
6. **Making the first lecture, walked through.** The step from the app to
   an AI chat and back is the biggest hurdle a new student meets. The
   first run can end on it, with the class already picked.
7. **Which AI chat they use.** It could tailor the copy step (how to
   attach a PDF in each). Better asked on the New lecture screen, where it
   is used, not here.
8. **What their exams ask** (multiple choice, written answers,
   calculations). It could preset what each class's lectures make. But
   the prompt reads the material, and the kinds are ticked per lecture.
   Later, if at all.
9. **Reminders when things fade.** The app's reason to come back, as a
   notification. Possible for an installed app (iOS 16.4 and later), but
   it needs a server to send them, which the app does not have. A project
   of its own, not part of this.
10. **A tour of the screens.** Learning by doing (5) shows more than a
    tour tells. No tour.

## 2. The class problem, and the ways to solve it

The problem: a lecture made from the library lands in no class, or a wrong
one, when the AI does not know its class code because the notes never say.
A lecture added from a class's page already takes that class, whatever
the AI wrote (`NewCourseDialog` `classCode`). Only the library's New
lecture relies on the AI.

- **A. Classes set up in the first run, ticked on New lecture** (the
  owner's idea). Works from day one for a student who sets them up. It
  does nothing for a class that starts mid-term, or a student who skipped
  the page.
- **B. New lecture asks which class, every time**, from the classes in
  the library, a new one (type its code), or none. The choice is stamped
  on the lecture whatever the AI wrote, as the class page does now. It
  needs no setup, and works for a class added in week 6.
- **C. Check the class when the reply comes back.** If the lecture's
  class is new, ask: "This lecture says PSYC351C. Put it with PSYC 351C?"
  This catches the AI's variants and typos, which B alone does not,
  since a student may pick "none" and trust the file.
- **D. Put the class in the prompt.** The AI writes what it is told, but
  the class still has to come from B, and the AI can still get it wrong.

**B and C, with A as a help.** B is the real fix: the owner's "no matter
what", for every lecture, set up or not. C catches what slips past. The
first run offers A as an optional page, so B's list is not empty on day
one. With B in place, a student who skips it loses nothing.

## 3. The shape and the look

- **Not a box over the page.** Full pages in the book look: a title page,
  then a few short pages, each with one thing to do, set like the rest of
  the app. "Not now" on every optional page, where it is in "2 of 5" in
  small caps, phone first.
- **Order:**
  1. **Title page**: what Arborous is in one line, a tree drawn as it
     grows, and "I already use Arborous" (sign in, library back).
  2. **Install** (only when not installed). On an iPhone it ends here:
     "Open Arborous from your Home Screen to carry on", since anything set
     up in Safari will not be in the app.
  3. **Keep your work safe**: make an account, or Not now.
  4. **Your classes** (optional): code and name, the next exam's date if
     known.
  5. **Your time on most days**.
  6. **Start**: "Try a short sample lecture" or "Make your first lecture"
     (the class picked if there is one).

## 4. Build order

1. **The class fix (B and C)**, on its own. It is useful now, while the
   owner is generating lectures, and needs no first run.
2. **The new first run**: the pages above, account, classes, time, and the
   start page; screenshots at phone size, both themes, to the owner before
   it goes live (a first impression is taste as much as reasoning).
3. **The sample lecture**, if the owner wants one: written on Opus 5.5 at
   high effort, checked against docs/evidence.md, kept in the app's own
   files (it is the app's, not a student's).

Each: EXPECTATIONS, Help, What's new, the screenshot script (a brand-new
install is the state the script must cover), live.

## 5. What would change this plan

- If the owner wants the account required, not optional: it becomes the
  second page with no Not now. That would cost the students who will not
  make an account to try an app.
- If the sample lecture is not wanted, the start page leads with Make your
  first lecture.
