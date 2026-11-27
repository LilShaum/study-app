# Rubric log

One entry per lecture made and graded (docs/rubric.md), newest first:
the date, the prompt's commit, the source's profile, the measured scorecard,
the judged scores with the ids of every 0, the time and size, and what it
changed. Numbers and ids only: no lecture content, no slide text.

## 2026-11-27 · Language, new prompt, raw (two runs)

Source: PSYC Language, 25 slides with text, typed notes and a few marked
questions, studies taught. Both runs on Opus 5.5 at high effort, the PDF
read as page images, raw replies untouched.

| | Run A (this branch) | Run B (diagrams branch) | Owner's file (old prompt, hand-revised) |
|---|---|---|---|
| Settings | studies on, study guide and Test 1 key pasted (prompt as at `caf2f52` but for its two study-tag clarifications) | studies off, nothing pasted | studies on, both pasted |
| Time | 18 min | 18 min | about 18 hours with revisions |
| Items / sections | 130 / 8 | 115 / 10 | 163 / 9 |
| Size (≈ output tokens) | 32k | 32k | 44k |
| Quotes found word for word | 99% | 99% | 89% |
| On the slide they name | 100% | 100% | 97% (by section) |
| Cards naming their slide | 100% | 100% | 4% |
| Slides accounted for | 25 of 25 | 25 of 25 | not recorded |
| "Pick the longest" right | 16% | 49% | 34% |
| Easy / hard MCQs | 4% / 26% | 15% / 30% | 8% / 29% |
| Lecture check: to fix | 1 (two-questions) | 3 | 2 |
| Notes for the student | 4 | n/a | 0 |

**Judged (run A, 9 items: 4 hard MCQs, 2 labelled reasons, 3 definitions):**
all 2 on Accurate and Answer key; wrong options are neighbours and
reversals from the lecture; the hard MCQs join two slides. Its notes for
the student flag the left-hander note against the Wada table, the note
that clashes with the other one on how often Wada is used, and answer the
student's marked questions; the left-hander slip is the one the owner's
hand revision found after the fact. Not yet judged: the whole lecture
against the study guide's model and study emphasis.

**Read:** run B's 49% used the prompt's older "as long … in words"; run A
counts characters and came in at 16%. One run each, so a hint, not proof;
the next lectures will show whether it holds.

## 2026-11-27 · Baseline: five lectures the owner made with the old prompt

Made before this log, with an older prompt (`ARBOROUS_PROMPT.txt`, before
slide accounting) on Opus 5.5, then revised by hand over long sessions, so
these are the best the old way reached, not raw replies. Scored by the
measured rubric (with `source_page` missing, quotes were looked up on their
section's slides). BIOL slides are pictures only: their text was read with
tesseract, which cannot read handwriting, so a quote of a note shows as
not found.

| | PSYC Language | PSYC Learning & Memory | BIOL Circulatory | BIOL Muscles | BIOL Nervous system |
|---|---|---|---|---|---|
| Profile | 25 slides, text, typed notes, studies taught | 52 slides + 2nd-half notes, text, studies taught | 43 pages (2 slides each), pictures + handwriting | 76 pages, pictures + handwriting | 64 pages, pictures + handwriting, 2 deck versions |
| Items / sections | 163 / 9 | 172 / 12 | 300 / 15 | 267 / 9 | 227 / 10 |
| Size (≈ output tokens) | 44k | 50k | 71k | 59k | 53k |
| Quotes found word for word | 89% | 75% | 72% (OCR) | 76% (OCR) | 79% (OCR) |
| Quotes on their section's slides | 97% | 92% | n/a (several files) | n/a | n/a |
| Cards naming their slide | 4% | 8% | 6% | 6% | 10% |
| Slides accounted for | not recorded | not recorded | not recorded | not recorded | not recorded |
| "Pick the longest" right | 34% | 38% | 27% | 34% | 11% |
| Easy / hard MCQs | 8% / 29% | 11% / 38% | 7% / 29% | 7% / 28% | 10% / 35% |
| Sections with nothing beyond recall | 0 | 2 | 4 | 0 | 2 |
| Lecture check: to fix | 2 | 3 | 0 | 1 | 0 |

**Read by eye:** Language's 15 quotes not found are not invented: they are
labelled working notes ("Note (slide 3): …", "Slide 13: '…'; slide 17:
'…'") stitching several slides into one excerpt, which a word-for-word
lookup cannot match and a student cannot check at a glance. The new
prompt's one clean quote and one `source_page` per card is aimed at this.
PSYC MCQs match the Test 1 style (None of the other options in 8 to 9 per
lecture, the answer in half; NOT questions; 11 to 14 written answers).

**Changed:** the rubric's slide lookup (an item with no slide of its own
falls back to its section's); the prompt edits in `docs/proposals/trust.md`
§6, from the owner's session summaries.
