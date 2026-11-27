---
name: taste-review
description: Judges an Arborous screen, flow or motion the way a real student would meet it, for human taste rather than technical correctness, with a fresh-eyes reviewer who never saw the code or the reasoning. Catches what screenshots-by-the-builder miss: feels tacked on or "vibe coded", too much to read, the next step unclear, friction for a student with ADHD, a feature nobody would find, motion that looks mechanical, content a student could not trust. Use BEFORE showing the owner anything a student sees or feels (a screen, a redesign, the first run, the tree, motion, a review page), after the build and the screenshots, and whenever the owner says something feels cheap, ugly, slop, unintuitive, cluttered or "not elegant". Use with arborous-design (the house style) and scope-check (the size).
---

# Taste review: would a student like using this?

The owner, 2026-11-27: Claude "struggles to understand human taste and what
matters to a human"; "I really want this app to feel good and look good …
a first and last resort for a student when studying … no cheap tricks like
Duolingo … make learning and studying feel effortless, especially for
people with ADHD like me, where decreasing the difficulty to study helps a
lot … users can trust that the course they are studying is very accurate
… even if they missed lecture". Earlier: "intuitive and cleaner more
elegant feel, everything should look and feel intentional"; "I really want
this app to not look like vibe coded slop".

Why builders miss it: whoever built a screen reads it through what they
meant it to do. They know the row scrolls, so it looks scrollable; they
wrote the caption, so it seems needed; they fixed the bug, so the screen
feels finished. The owner keeps finding what a person sees in the first
seconds. So this review is done by eyes that do not know the intent, and
judged against a short list of what people actually feel.

## 1. Gather what a person would see

From `scripts/screenshots.mjs` (and Playwright for states it does not make):
every screen touched, phone 390px first, then computer; light and dark;
the top and the bottom of every long screen; a few frames of any motion
(or a short recording), and the state after two or three taps in a row.
Make sure the screenshots are viewed at the size a person sees them and
also zoomed to 2x on the parts that changed: the owner looks both ways.

## 2. Fresh eyes: a reviewer who never saw the code

Spawn one reviewer agent on **Opus 5.5** (judging is Opus work, CLAUDE.md
"Models"; name the model, never inherit it) with the prompt in
`references/reviewer-prompt.md`. Give it only:

- the screenshots (paths), in the order a student meets them;
- one line on what the student is trying to do on these screens, in a
  student's words ("I have 15 minutes before class and want to study the
  lecture from Tuesday");
- the vision paragraph below and the house style's short list (the look,
  the words) from `arborous-design`.

Never give it the diff, the plan, the owner's feedback entry, or why
things were built the way they were. The point is that it cannot excuse
anything. One reviewer is enough for a screen or two; for a whole-app
pass, one per flow (phone and computer can share).

The reviewer is a reviewer: it changes nothing. Its findings come back to
the session, which decides and builds (anything a student sees is built by
the session, CLAUDE.md).

## 3. Your own pass, as a student: the human checklist

Walk the screens yourself as the student in the one-line task, phone in
one hand, slightly distracted. For each point, write what you see, not
whether the code is right.

**First three seconds**
- Where does the eye land first? Is that the most important thing on the
  screen? If two things compete, one must give way.
- Is there one obvious next action, in thumb reach on a phone?
- Could a student who skipped Help say what this screen is for?

**Effort to study (the ADHD lens)**
- Count the taps and decisions between opening the app and the first
  question. Every one is a chance to drift off. Can any be removed or
  given a good default?
- Count the words a student must read before they can act. Instructions
  on screen are a sign the design is not doing its job (arborous-design:
  what to do on screen, why in Help).
- Is anything asking the student to remember, plan or choose what the app
  could decide for them (what to study, how long, which mode)?
- Coming back after a break: does the screen pick up where they were and
  say what is next, without guilt?
- Nothing that rewards the app instead of the learning: no streaks, no
  badges, no confetti for opening it, no loss aversion. The reason to come
  back is what is fading.

**Feels made, not generated**
- Does every element look like it belongs to the same book, or was
  something added in its own style on top? (The owner's word: "tacked
  on".)
- Generated-UI tells: a caption under every control; everything the same
  size and weight; boxes inside boxes; badges and pills; centred
  everything; a sentence explaining what the button already says;
  symmetric padding with nothing breathing; em dashes in the copy; icons
  that mean nothing; a heading that repeats its button.
- Spacing has rhythm: related things close, groups apart. Alignment lines
  run through the page.
- Motion overlaps as in life and settles; nothing waits for the previous
  animation to finish; nothing moves without meaning (CLAUDE.md "Motion is
  realistic").
- Both themes look designed, not one inverted from the other: check the
  dark paper zoomed for specks, flat patches and lost grain.

**Can it be found and understood**
- Every control looks like what it does: a row that scrolls looks
  scrollable, a tappable word looks tappable (blue), a static word does
  not.
- Nothing opens from a stray tap on empty space or a picture.
- A feature the student needs, but would not find in the first minute, is
  a fault to design away (arborous-design, "A control nobody finds").

**Trust**
- Could a student who missed the lecture trust this content? Does the
  screen show where a card comes from (its section, its slide), and is
  anything said with more certainty than the notes support?
- Do numbers and states (fading, due, learned) mean what a student would
  think they mean?

## 4. Decide, then fix the big things first

Merge the reviewer's findings with yours into one list, each marked:

- **Felt** (a student would notice or be slowed by it in normal use),
- **Seen** (noticed if looked for),
- **Fine print** (only a designer would notice).

Fix every *Felt* item before the owner sees the work. A list of fine-print
fixes is not a taste pass; if that is all you found, look again at the
first three seconds and the effort count. When a finding is "this looks
ugly", redesign it, never remove the function (arborous-design).

Write the felt and seen items, and what was done about each, on the review
page, so the owner can see the reasoning in a line each.

## The vision, for the reviewer

> Arborous is a study app built from a student's own lecture notes. It
> should be the first and last place a student goes to study: it takes
> them through a lecture the way a good tutor would, in the slides' order,
> and keeps bringing back what is fading. It should feel effortless to
> start and to keep going, especially for a student with ADHD: few
> decisions, little to read, an obvious next step. It is set like a
> printed book or a herbarium sheet, with a tree that grows as you learn;
> it should feel made by a careful person, never like a generic web app,
> and never use streaks, guilt or game tricks. A student who missed the
> lecture must be able to trust what it teaches.
