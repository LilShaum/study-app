---
name: generate-lecture
description: Make an Arborous lecture (.study.json) from a student's slides or notes the way the app hands out the prompt, then grade it with the rubric and turn what it shows into prompt changes. Use whenever the owner sends slides or notes to turn into a course, asks for a before-and-after test of the generator prompt, or asks how good generation is for a kind of class.
---

# Making and grading a lecture

The owner, 2026-11-27, makes courses through this project from now on, so
each one also tests the prompt. The rubric is `docs/rubric.md`; this is the
procedure, so every thread runs it the same way.

## Never in the repo

The repo is public. Slides, notes and the lecture stay in
`/mnt/project-files/lectures/<class>/` (or the scratchpad), never under the
repo folder, never in a commit. `docs/rubric-log.md` takes numbers and ids
only.

## 1. Profile the source

Fill in `docs/rubric.md` §1 from the files before generating. Get the text
out with `pdftotext -layout file.pdf slides.txt` (it puts a form feed
between pages, which the rubric uses to check a quote's slide). Look at a
few slides as images too (`pdftoppm -png -r 60 -f N -l N`), because the
text alone hides how much is in the figures.

## 2. Generate exactly as the app does

- The prompt is `buildNewCoursePrompt(notes, undefined, studies, kinds)`
  from `src/lib/buildNewCoursePrompt.ts`, written out with a one-line
  `npx tsx -e` call, with the student's settings (studies only if their
  exams ask about studies; the kinds they ticked; all kinds by default).
- Run it in a fresh session on Opus 5.5 at high effort, with the files
  attached as the student would attach them (the PDF, not the extracted
  text). Never on a smaller model to save usage (CLAUDE.md, Models). The
  thread asks the owner before starting one, because a lecture costs about
  30 minutes of their usage.
- Note the wall-clock time. Keep the raw reply untouched as
  `raw.study.json`: it is what gets scored, not a repaired copy.

## 3. Score it

```
RUBRIC_COURSE=raw.study.json RUBRIC_SOURCE=slides.txt \
  npx vitest run src/lib/rubric.test.ts --reporter=verbose
```

Then the judged sample (`docs/rubric.md` §3), with the slides open. Write
every 0 down with its item id and what the slide says.

## 4. Hand it over

Give the owner the lecture as a file from `/mnt/project-files/`. If the
scorecard found faults, the owner gets the raw file plus a short list of
what is wrong, and a fixed copy only if they want it: the point is that a
student without this thread gets the raw quality, so the fix belongs in the
prompt. Fix the course itself the way a student would (the app's Fix), not
by hand, when a fixed copy is wanted.

## 5. Log it and change the prompt

Add an entry to `docs/rubric-log.md`. Turn a fault into a prompt change only
by `docs/rubric.md` §4 (general, smallest, where the rule already lives, no
new end-of-reply check), on a branch with a PR, and say which log entry it
answers. A before-and-after test reruns the same source on both prompts
(the old one from the commit before the change) and logs both.
