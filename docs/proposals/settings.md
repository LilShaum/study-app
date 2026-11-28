# A Settings place

The owner, 2026-11-25 (Testing 5): "the name at the top and then "your name
________" right under it … looks like it would be better as a setting to
change the username, but on any app that has this kind of setting, it's not
usually right there under the name and you have to enter user settings or
something to edit your profile details." And on the review page: "we need a
settings area for all this kind of shit to live. It's not okay that
settings are just openly available. It's unclean and creates clutter, and
it's disorganized and makes it hard for the user to find where to go to
change settings. Things like light mode needs to go there, changing their
username goes their, notifications, help, changing your email associated
with your account, changing your password, everything like that." Broken
down in docs/FEEDBACK.md (Testing 5, review notes).

## How to decide

- **What it is for.** One place for everything a student sets once and
  rarely changes, so the pages show only what they are about, and a student
  who wants to change something knows where to look.
- **What lives there (the owner's list, then the rest of its kind).** Name,
  light or dark, reminders, Help, the account's email and password. Of the
  same kind: signing in and out, syncing now, backing up and restoring.
- **What stays out.** What a page is about: the student's page keeps their
  name as its title, their days of study, the figures and time by class. A
  lecture's own settings (its exam date, its details) stay on the lecture.
- **Where it is met.** At the foot of every page today sit three things:
  Help, the student's page, a Dark/Light button. That row is the clutter.
- **Evidence and code.** `RootLayout` (the colophon), `AccountRoute` (the
  name field, Sync, Reminders, Back up), `SyncRoute` (sign in, sync, sign
  out), `DarkModeToggle`, `RemindersField`, `Backup`, Help's mentions of
  "your page".

## The options

- **A. A Settings page**, reached from the foot of every page, which shows
  only two things: your page and Settings. For: the way apps do it, a place
  with room for forms (password), one link to remember, a page with its own
  Back like every page. Against: Help one tap further away.
- **B. Settings as a sheet opened from the student's page** (an "Edit"
  beside the name). For: close to where the name is. Against: theme and
  Help two levels deep, and a student looking for "light mode" would not
  think to open their own page first.
- **C. A gear in the running head.** For: always in view, the common app
  place. Against: the head is a running head, not a toolbar (HANDOFF §2);
  a gear on every screen is the "openly available" the owner objected to,
  only smaller; and on a phone the head is hidden in a sitting anyway.

## The pick: A

It is the one place a student would look ("Settings"), it holds forms
comfortably, it empties the student's page of fields, and it cuts the foot
of every page from three things to two. Help moving inside costs one tap,
and the owner listed Help among the things that belong there; Help is still
linked from the places that point to it in context.

## The build

1. `/settings`, a page in the app's form (← Back, a title, ruled sections
   with small-caps labels, the specimen-label rows), in this order:
   - **You**: your name (the field the student's page had), saved on leaving
     it.
   - **Appearance**: Light, Dark, Match this device, as a one-of choice
     (underscored, as the minute choices).
   - **Reminders**: `RemindersField`, as it was on the student's page.
   - **Account**: signed out, sign in or make an account (the Sync page's
     form); signed in, the email, Sync now and when it last synced, Change
     email, Change password (each a short form opened in place), Sign out.
   - **Your lectures**: Back up, Restore.
   - **Help**: Help, and What's new.
2. The foot of every page: your page, Settings. The theme button and Help
   leave it.
3. The student's page: the name once, as its title; the name field, Sync,
   Reminders and Back up leave it (all in Settings).
4. `/sync` sends to `/settings` (old links keep working).
5. Help (where things are), EXPECTATIONS (the student's page, Sync,
   Settings), What's new, the first run's words that say "on your page",
   tests that find these controls.

Changing the email asks Supabase to send a confirmation to the new address
(`auth.updateUser`); if the project's email service cannot send it, the
error is shown as Supabase gives it. Changing the password needs no email.
