# A page of your own ("My account")

The owner, 2026-11-11: "maybe we should make like an account page or like
"my account" … that shows u the heat map and also like all that other data
but organized in some clean way maybe like organized by class … it would
be better if we can think of more things that would go there or that could
come out of it before commiting to making an account. maybe so you can add
friends and choose to make ur courses public to friends … or if its private
to friends they cant get it but u can share it to them through the app …
maybe we could think of more things like that". Also: the heatmap is not
for the library, and the per-lecture figures that exist (each lecture's
Progress) are hard to find.

## 0. How this is decided

1. **What it is for.** One place that is the student's own: what they have
   done (the heatmap, by class), what is theirs (their data, safe), how the
   app is set for them, and, later, the people they study with.
2. **Who meets it, how often.** Weekly, not daily: the library stays the
   daily screen. So it must be easy to find without taking the library's
   first screen (the owner, 2026-11-10: "intuitive to find").
3. **What exists.** Supabase holds each signed-in student's state (one row,
   only theirs) and share links (`docs/supabase.sql`). Sync has its own
   page, reached from the foot of every page. Backup and restore live in
   Help. Per-lecture figures live on each lecture's Progress. The daily
   time is set on Today. Nothing shows the student's study across the
   library.
4. **Accounts are optional** (the owner, 2026-11-11), so the page must
   work, and be worth opening, without one.
5. **Social features are real backend work**: tables, rules on who can
   read what (row-level security), invites, and a security review
   (CLAUDE.md's table). They are weighed here, not assumed.

## 1. What could go there

**Your study.**
1. Days of study: the heatmap and its figures (time, days, streaks).
2. By class: time studied, how much of the class is held now (from the
   memory model, as the tree shows it), the next exam and how ready you
   are for it.
3. Your trees: every lecture's tree side by side, a plate of what you have
   grown. It is the app's own picture, and the thing to show someone.
4. Quiet milestones: a lecture fully grown, 100 hours. A record, never a
   badge to chase or a nudge.

**Your account and your things.**
5. Signed in or not, synced when, on which devices (Sync's page becomes a
   section here). Without an account: what one gives you, and a way to
   make one.
6. Back up, restore, export everything (now in Help); delete your account
   and its data (owed to anyone whose data the app holds).
7. Settings in one place: daily study time, theme, the margin notes
   replayed, what New lecture makes by default.
8. Your classes: names, codes, exams. This is where the onboarding's
   classes page lives afterwards, and what New lecture's class picker
   reads.

**With friends** (the owner's idea, and what could come out of it).
9. Friends by invite link or code only, with no public list of students:
   no strangers.
10. Send a lecture to a friend inside the app: it waits for them to add it.
    No link to copy.
11. Per lecture or per class: visible to friends, who can add it, or
    private, sent only by you.
12. **Class groups**: friends in the same class share its lectures. One
    student makes Lecture 5 and the whole group has it. Making a lecture
    is the costly step (an AI chat, the student's own usage), so this
    saves the most.
13. A fix travels: when someone in the group fixes or adds to a shared
    lecture, the others get the new version, their progress kept.
14. Friends' days of study, if each chooses to show them: to flex (the
    owner's word for what a heatmap is for). No ranking and no
    notifications about others.
15. Quiz a friend: send the questions you found hardest.
16. Reminders when things fade (a scheduled function and web push on the
    same Supabase project), switched on here, for signed-in students.

## 2. The options

- **A. A personal page now** (1 to 8), built so friends can join later.
  It is useful at once, needs no new backend, and fixes the scattering
  (Sync, backup, settings and figures are in four places today).
- **B. A with friends from the start** (9 to 15). The most to gain,
  especially class groups (12, 13), but the most work and risk: new
  tables and access rules on shared lectures, invites, a security review,
  and new questions (what if two friends' copies of a lecture differ?).
- **C. Two pages**, "Your study" for the record and "Account" for the
  rest. Each page is simpler, but there are two places to find, and the
  owner asked for one.

**A, then friends as their own plan.** A fixes what is scattered and gives
the heatmap its home now; the friend features earn a plan of their own,
with class groups first, because sharing lectures saves the most and
showing streaks the least.

## 3. Where it is reached

The foot of every page has Help, Sync and the theme. **Sync becomes "You"**:
the same place, the page grown around it. On the library, the running head's
right side (now "The library") also leads there. One question for the
owner: the name, "You", "My account" or another.

## 4. Questions for the owner

1. A then friends as their own plan, or friends from the start?
2. Of the friend ideas, which matter most to you? Class groups (12, 13)
   come first here.
3. The page's name.

## 5. Build (after the owner's yes)

The page with sections 1 to 8, the heatmap moved into it (in the look the
owner picks), Sync folded in, backup moved from Help (Help keeps a line
pointing to it), settings gathered; phone first, both themes, screenshots
to the owner; then EXPECTATIONS, What's new, live.
