# Grading a generated lecture

The owner, 2026-11-27: lectures are made here from now on, and each one
should improve the prompt: "maybe we should make a rubric … ways to measure
the variables of the course generating … especially since different classes
can provide wide ranges of examples that the prompt gets tested on, for
example a class that involved math and worked problems vs a class with
slides that are diagram/study heavy with less words".

How a lecture is made and graded is in `.claude/skills/generate-lecture`.
This file is the rubric itself. Each run's scorecard goes in
`docs/rubric-log.md` (numbers and ids only: the lecture and the slides never
enter this public repo).

## 1. The source's profile

Recorded before generating, so results can be read by kind of class rather
than averaged into nothing. One line each:

| Field | Values |
|---|---|
| Kind | slides, textbook pages, transcript, handwritten notes, past paper, mixed |
| Slides or pages | the count |
| Text | dense (full sentences), sparse (bullets, titles), almost none |
| Figures | none, some, most slides; whether the text talks about them |
| Maths | none, formulas, worked problems |
| Handwriting | none, some, most slides |
| Studies | none, cited, taught (and whether the student's exams ask about them) |
| Student's extras | teacher notes, past questions, chosen kinds |

## 2. The measured part

`src/lib/rubric.ts`, run on the raw reply (see the test file's header for the
command). Targets come from the prompt; a measure that does not apply to the
source (no problems in a class with no maths) is n/a, never a pass or a
fail.

| Measure | Target | Why it matters |
|---|---|---|
| Every item quotes its passage | 100% | the grounding rule |
| Every quote names its slide | 100% where numbered | the student checks a card in seconds |
| Quotes found in the source word for word | ≥ 95% | a quote that is nowhere is a card that may be invented |
| Quotes on the slide they name | ≥ 95% | a wrong slide sends the student hunting |
| Items labelled Outside the slides | reported; none scored | added knowledge stays out of what is marked |
| Slides accounted for | every one | the one gap a student cannot see |
| Slide count stated vs source | equal | the AI saw the whole deck |
| Declared terms with a definition | 100% | the inventory kept |
| "Pick the longest" right | ≤ 25%, fail from the app's 35% | options that give the answer away |
| MCQ difficulty | easy ≤ 25%, hard ≥ 25% | questions that test understanding |
| Sections with nothing beyond recall | 0 | |
| Questions citing the slides | 0 | the cue is not in the exam |
| Lecture check: to fix | 0 | what the app would send back |
| Problems whose steps reach the answer | 100% | a wrong key marks a right student wrong |
| Figures marked know that nothing asks | 0 | |
| Size (characters, about tokens) and time | recorded | the owner's usage and wait |

Time is wall-clock from sending the prompt to the reply ending, taken by the
thread that runs it.

## 3. The judged part

Read by the session (Opus 5.5), with the slides open, on a sample: every
section's first and last gradable card, every hard MCQ, every problem, and
ten more at random; for a lecture under 60 items, all of them. Each scored
0, 1 or 2 by these criteria, and every 0 written down with the item id and
what the slide says.

| Criterion | 2 | 1 | 0 |
|---|---|---|---|
| **Accurate** | says what its slide says, no stronger or weaker | true, but drops or adds a qualifier, or rests on a neighbouring slide | wrong by the slide, or not on it at all |
| **Answer key** | the marked answer is the one right answer | right, but another option is defensible | another option is right, or the marked one is wrong |
| **Wrong options** | each a mistake a student who studied would make, with its reason | one is filler or strikes out by itself | answerable from the options alone |
| **Asks for understanding** (MCQs and problems) | needs the idea used, told apart or joined | one fact recognised | answered by the question's own words |
| **Teaches** (explanations, why, builds_to) | joins the slides the way a teacher would | true but only restates the slide | missing where the section turns on a mechanism, or wrong |

Then, for the lecture as a whole, a line each: the key ideas (the
objectives, what the teacher stressed) and whether each is asked from more
than one side; anything on the slides a student would be examined on that
no card asks; and, for the profile's kind of class, what it did worst
(figures for a diagram-heavy deck, problems for maths, handwriting).

## 4. What a result changes

A fault becomes a change to the prompt only when it is general (it would
happen on another class), and the change is the smallest that removes it,
in the section where the rule already lives, never a new check at the end
(Anthropic: re-checking lists over-verify; see `docs/proposals/trust.md`).
A fault seen only on a smaller model is not patched (CLAUDE.md, Models). A
fault the app can see becomes a lecture check instead, so Fix repairs it
on every lecture already made.
