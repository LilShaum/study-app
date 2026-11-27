# Rubric log

One entry per lecture made and graded (docs/rubric.md), newest first:
the date, the prompt's commit, the source's profile, the measured scorecard,
the judged scores with the ids of every 0, the time and size, and what it
changed. Numbers and ids only: no lecture content, no slide text.

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
