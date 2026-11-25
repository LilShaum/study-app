# Notifications

The owner, 2026-11-25: "I also think the app should send notifications for
various things and near the end of onboarding it should ask if you would
like to be sent reminders and that you can adjust what you specifically
receive notifications for in the settings."

## How to decide

- **What it is for.** The app's reason to come back is what is fading, never
  a streak or guilt (CLAUDE.md, Today). A notification is that reason,
  arriving when it is true: something is slipping, an exam is near, the
  misses from a sitting are ready for their second look.
- **Who meets it.** A student on a phone, the app closed. That is the whole
  difficulty: a web app cannot wake itself. Anything that must arrive while
  the app is closed has to be sent from a server as a push.
- **What exists.** Accounts and sync on Supabase (`lib/cloud.ts`, table
  `user_state`); a service worker (`src/sw.ts`) with no push handler; the
  memory model, which knows on the device when each card will fall due.
- **The limits.** On iPhone, push reaches only an app added to the Home
  Screen, iOS 16.4 or later, after the student allows it from a tap. Android
  and computers allow it in the browser as well. Push needs an account, so
  the server knows where to send.

## What to notify (each its own tick in settings)

1. **Each day** (on): the daily study reminder (the owner, 2026-11-25: "you
   missed the most obvious kind which is like a daily study reminder"), at
   the time the student picks, on a day there is something to study, saying
   what: "12 to review in PSYC 351, and 2 more lectures. About 45 minutes."
   A day already studied in full loses it. This takes the place of the
   first plan's "Fading", which was the same reminder only on fading days.
2. **A second look** (on): the misses of a sitting are worth one more look
   three hours later (lib/memory, CATCH_UP_HOURS); one reminder then, never
   between 10 at night and 8 in the morning.
3. **An exam is near** (on): three days and one day before an exam with a
   date. That day's reminder becomes the exam's ("BIO 101 Midterm in 3
   days"), with the day's line under it, so it is still one notification.
4. ~~What's new~~: dropped while building. The device only learns of a change
   once the new version has loaded, when the student is already in the app
   and Help shows it; a push could only repeat what they just saw.

Never: streaks, "you haven't studied", more than two a day.

## The options for delivery

- **A. Web push from Supabase.** The device works out what to say and when
  (it has the memory model and the lectures), and saves the next few
  notifications to a small table; a scheduled function on Supabase sends
  the ones that are due, each minute, with web push. For: works with the app
  closed, on every platform that allows push; the server stays simple (it
  sends what it was given, so nothing about a class lives there). Against:
  setting up on the Supabase project (a table, a scheduled function, a key
  pair kept as a secret), and an account is needed.
- **B. Email.** For: no permission prompt. Against: an inbox is not a phone's
  lock screen; easy to ignore; a sending service to pay for and set up.
- **C. A calendar file.** The daily time and the exams as events the student
  adds to their own calendar, which reminds them. For: no server at all.
  Against: fixed times that cannot know what is fading; only a part of it.
- **D. Only inside the app.** For: nothing to build. Against: it is not what
  was asked: it cannot bring anyone back.

## The pick: A, with the question asked in the first run

It is the only one that does what was asked on a phone. The device decides
the message, so the server never needs to understand a lecture.

## The build

1. **Settings** (the student's page): Reminders, with the four ticks, the
   daily time, and Allow notifications. Shown with a plain line where push
   cannot work ("Add Arborous to your Home Screen to get reminders" on an
   iPhone in Safari; "Sign in to get reminders" without an account).
2. **The first run**: after the account page, "Remind you when things start
   to fade?" with Yes (asks for permission) and Not now, and "You can choose
   what you hear about on your page." Only where push can work.
3. **The device**: subscribes with the browser's push, and after each sitting
   and on each sync saves its next notifications (time, title, line) to a
   `reminders` table, replacing the last plan.
4. **The service worker**: shows a push; a tap opens the app at the right
   place (Today, or the lecture).
5. **Supabase**: the `push_subscriptions` and `reminders` tables, each row
   readable and writable only by its owner; a function that sends what is
   due, run each minute by the scheduler; the key pair for web push kept as
   a secret.

## Built (2026-11-25)

The owner, 2026-11-25: "yes to notifications if you can do the supabase stuff
yourself if you are connected". Done through the Supabase connector:

- Tables `arborous_push_subs`, `arborous_reminders` (each row its owner's
  alone, by row-level security) and `arborous_push_keys` (no policies: only
  the function reads it). In `docs/supabase.sql`.
- Function `arborous-push` (source in `supabase/functions/arborous-push`):
  GET gives the public key, made on the server on first use, so the private
  key was never seen by anyone; POST sends what is due, at most two a day
  per student, drops any more than six hours late, forgets dead devices.
- pg_cron job `arborous-push` posts to it each minute.
- App: `lib/reminderPlan.ts` (what to say and when, tested), `lib/push.ts`
  (subscribe, save the week's plan after each sync), `store/reminders.ts`
  (this device's settings), the service worker's push and tap handlers,
  Reminders on the student's page, and the first run's question after the
  account page, shown only when signed in on a device that can take a push.

Checked: the job runs each minute and the function answers; a made-up
subscription got a real encrypted send that the push service refused, and
was forgotten. Not yet seen: a notification on a real phone. It needs the
live site, so it waits for P4-3; on an iPhone, only from the Home Screen
app.
