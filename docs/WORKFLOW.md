# How a change gets made

Written 2026-11-27 for the owner and for every session. The owner: "I am
not a software developer nor a manager so I dont know if there are already
well known systems in place for how apps like this get developed and
tested and split across different teams so I fully want you to be able to
help guide me". This is the standard way small product teams work, fitted
to one owner and Claude.

## The roles

A product team splits the work so that nobody judges their own work alone.
Here the roles are played by the owner, the session and its agents:

| Role | Who | Does | Never |
|---|---|---|---|
| **Product owner** | you | Says what and why. Tries the preview on your phone. Says yes to merge. | Has to say how, or check the code. |
| **Lead designer-engineer** | the session (Opus 5.5) | Sizes the ask, plans, designs and builds everything a student sees or feels. | Grades its own work as the only check. |
| **Builders** | agents on Sonnet 5.5 | Scripts, tests, data, searches, mechanical edits to an exact spec. | Touch a screen, a word or a motion. |
| **Design critic** | a fresh Opus agent (`taste-review`) | Reviews the screenshots as a student, never having seen the code or the plan. | Edits anything. |
| **Code reviewer** | `code-review` (and `security-review` where it applies) | Finds bugs in the diff. | Decides the design. |
| **Acceptance** | the session, with `scope-check` | Proves the change is the size you asked for, with before/after pictures. | Counts lines changed as proof. |
| **Automated checks** | GitHub, on every pull request | Build, lint, tests and the dead-code check run by themselves. | Get skipped to make a change pass. |

## The life of a change

1. **Ask.** You say what you want, however you like. It goes into
   `docs/ASKS.md` in your words at once; feedback on something built is
   broken down into `docs/FEEDBACK.md` (`owner-feedback`).
2. **Size it** (`scope-check`): macro, meso or micro, and whether you have
   asked it before. For a big ask, a short contract: what a student will
   notice, what goes, the cheap version not to build.
3. **Plan** (big or unclear asks only): options argued in
   `docs/proposals/`, one picked with the reason (CLAUDE.md, "Plans for
   reimagining").
4. **Build on a branch**, never on `main`. One pull request per ask, big
   enough to deliver the whole ask.
5. **Check, in this order**: the automated checks; screenshots of every
   screen it touches, phone first, both themes; the before/after
   comparison (`scripts/compare-shots.mjs`); the fresh-eyes taste review;
   code review; then the owner's own test (phone, zoomed, both themes,
   scrolled to the bottom, several taps).
6. **Show you**: a preview you can try on your phone
   (`scripts/preview.mjs`, published as one private link that each round
   replaces) and the review page with before/after pictures, each item
   standing alone, questions at the bottom.
7. **Merge** on your yes. The site deploys from `main` by itself.
8. **Confirm it is live** (the live site serves the change), add a line to
   What's new if a student would notice, and close the ask in ASKS.

A step is done when it is checked, not when it is written. "Done" for the
whole change means merged, live and checked on the live site.

## Why it is set up this way

- **Separate judges.** Whoever builds a screen reads it through what they
  meant. A critic who has not seen the plan sees what a student sees. That
  is why the design critic gets only screenshots.
- **Evidence of size.** A diff of 2,000 lines can still look the same to a
  student. Before/after pictures cannot hide that.
- **Preview before merge.** Feel (swiping, motion, a layout in the hand)
  can only be judged by trying it. Trying it before merge is cheaper than
  fixing it after.
- **Automatic checks on every pull request** catch a broken build or a
  failing test before you ever see it, at no cost to your usage.
- **Everything written in the repo** (asks, feedback, plans, this file),
  because each session starts without the last one's memory.
