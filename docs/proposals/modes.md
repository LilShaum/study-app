# Every mode: why it is here, and how well it does it

For the owner. Short answers at the bottom. Research is in
`docs/evidence.md` (the entries dated 2026-10-12 are new).

The goal: a student can come to Arborous at any stage (first meeting the
material, keeping it, the week before the exam, the night before) and each
stage has one obvious place, which is the best tool for that stage.

## What there is now

On a lecture's page: **Today**, **Review**, **Learn**, then six practice
modes (**Quiz, Flashcards, Terms, Mixed, Weakest first, Review missed**),
then four pages to look at (**Progress, Browse and edit, Glossary,
Diagrams**). Thirteen doors.

| Mode | Why it is here | How well | Verdict |
|---|---|---|---|
| Today | The one thing to press each day | Well. Every rule in it was checked in the simulator | Keep; it is the heart |
| Review | What is due, nothing new | Fine, but Today already does it first | Fold into Today ("only review" as an option) |
| Learn | First time through new material | Fair. Fixed a lot this week, but see "Learn" below | Rework |
| Quiz / Flashcards / Terms / Mixed | One card type each | They sort by *format*, which is not a goal a student has | Merge into one Practice |
| Weakest first / Review missed | Drill what is going badly | Overlaps Review and Today | Merge into Practice as a choice |
| (none) | The last days before an exam | Today shifts a little toward review; that is all | **Add Cram** |
| Progress, Browse, Glossary, Diagrams | Look things up, check how it is going | Fine | Keep, as pages, not modes |

After: **Today, Learn, Cram, Practice**, plus the pages. Four doors, each
with one job.

## Learn

**What A does now.** A flashcard you haven't met is shown open ("read this,
it comes up in a moment"), then asked two or three cards later.

**Does it work?** It fixed the real problem (asking about things never
shown), and costs nothing in the simulator. But as a way to learn it is the
weak version. Two or three cards later the answer is still in your head, so
you are repeating it, not recalling it. Karpicke & Roediger (2007) found
that *delaying the first test* is what improves long-term memory. The
simulator cannot see this either way; it treats every answer the same.

**What I'd change.**

1. **Ask later.** The first ask comes at the end of the step, or after the
   next step, not two cards on. A miss comes back at the end of the section
   as well as in its step.
2. **Ask first when you've just read it elsewhere.** When the student is
   working through their slides (your plan, below), Learn asks first and
   shows the answer after, like Anki. Kornell et al. (2009): trying first
   helps even when the try fails. When the student hasn't seen the material
   at all, Learn keeps teaching first.
3. **Show the passage after every answer, right or wrong.** Feedback with
   the passage beat feedback without it (Karpicke & Roediger 2010).

## Your plan: Learn while going through the slides

Good plan, with one change. Reading slides alone is rereading, the weakest
way to study. Reading a chunk and then answering questions on it is one of
the best-supported things there is. The change: **read a chunk, then put
the slides away and answer.** With the slides open beside you, you copy the
answers instead of recalling them, and you'll feel you know it when you
don't.

Then let Today bring it back over the next days. Most of the gain comes
from those later reviews, not from the first pass.

To fit this, Learn gets a **"with my slides"** setting:

- Each step says which slides it covers ("Slides 12–18"). The generator
  prompt would add slide numbers to each section; old courses fall back to
  the section's name.
- You read those slides, tap "Done reading", and Learn asks first (no
  answer shown before), with the passage after each answer.
- Without the setting, Learn works as now, with the later first ask.

## Anki

Arborous already is Anki underneath: cards you recall, each with its own
memory estimate, brought back when they are fading, and a daily queue.
Anki's evidence is real but mostly observational: daily users do better on
board exams, and results on course exams are mixed, partly because course
exams come quickly (Frappa et al. 2026). That last part is what Arborous
adds: the exam date drives the plan.

Worth taking from Anki:

- **Ask first, everywhere.** Already true in Review; the change above
  brings it to Learn.
- **Fit the memory model to you.** Anki's FSRS fits itself to your own
  answers. The app has a calibrator for this, waiting on a month of real
  study (task 63). Spacing that adapts to the person and the item beats
  fixed spacing (Mettler et al. 2016).
- **One clear daily number.** Today already says how many minutes.

Not worth taking: no teaching, decks you have to build yourself, and the
backlog that piles up when you skip days. Today's time budget is the answer
to that last one.

## Cram

**Why it's here.** You have an exam in one to three days and parts of it
are unseen or shaky. Spacing over weeks is no longer possible. For a test
that close, short gaps are fine (Cepeda et al. 2006: the best gap shrinks
as the exam nears). It won't last after the exam, and Cram should say so
once, plainly.

**What it would do.**

- Only what is on the chosen exam.
- First a fast pass over everything unseen: a short teach, then a question.
- Then rounds over what is weakest, each card asked again after a few
  minutes, then after an hour or more.
- Plan for several sittings across the day with breaks between, and a last
  short round the evening before, not at 3 a.m.

**First**, it goes into the simulator as a policy against Today's last
days, under both students. If it doesn't beat what Today already does in
the crammer and late-start scenarios, it doesn't get built, and Today's
last days get whatever part of it did help.

## Practice

**Why it's here.** "Drill this lecture now", outside the plan: before a
class quiz, or to feel ready. One screen: pick the lectures or sections,
then all cards, the weakest, or the ones missed. The card types mix in, the
way Mixed does now.

It should say that cards which aren't fading yet count for little, so
nobody mistakes it for the daily work.

## Order

1. Learn: the later first ask, and the passage after every answer (small,
   simulator check).
2. Cram, simulator first.
3. Modes down to Today, Learn, Cram, Practice.
4. Learn "with my slides" (needs slide numbers in the generator prompt).
5. Fit the memory model to the student, once there is a month of real
   study.

## Your call

- Fold Review and the six practice modes into Today and one Practice?
- Cram: build it if the simulator says it helps?
- "With my slides": worth adding slide numbers to the generator prompt?
