# Trusting a lecture the AI made

Asked 2026-11-27: "it needs to be built in a way where users can trust that
the course they are studying is very accurate to what they are meant to be
studying, even if they missed lecture for example and werent able to
annotate the slides."

## 0. How this was decided

**What trust is for.** A student who missed the lecture cannot tell a wrong
card from a right one: that is why they are using the app. So trust cannot
rest on the student noticing. It has to come from checks that do not depend
on the AI that wrote the lecture grading itself, and the result has to be
visible enough that the student stops wondering.

**Who meets it.** The student right after a lecture is made (is this
complete, is it right?), and the student mid-study on one card (is *this*
true, where is it in my slides?).

**What bears on it.** `prompts/generator.md` (obligations 1 and 2, the four
passes, the inventory), `src/schema/course.ts` (`source_excerpt`,
`source_range`, `inventory`, `notes_for_student`), `lib/courseHealth.ts` and
`CourseHealthPanel` (the lecture check), `SourceNote.tsx` ("From your
notes"), Set aside "wrong" and Fix, and `grade-2026-11-16.md` gap 4 ("the AI
decides things the file never records").

## 1. What is there today

The prompt side is strong. Nothing may be invented; every item must carry a
`source_excerpt`; anything added from general knowledge is labelled
"Outside the slides" and can never be scored; unreadable handwriting and
figures go in `inventory.unclear_figures`; a note that contradicts its
slide is reported in `notes_for_student`; the inventory of terms is checked
against the definitions.

The app side checks **shape**, not **truth**. The lecture check finds
give-aways, duplicates, missing reasons, terms never defined, thin
sections. It never compares a card to the slides, because the app never
sees the slides.

## 2. Where accuracy can fail

1. **A card says something the slides do not.** A swapped cause and effect,
   an overstatement, a number off. The only defence is the excerpt, and the
   excerpt is written by the same AI in the same breath. It can be a
   paraphrase that carries the same mistake. It is shown folded, with no
   slide number, so checking it means hunting through the deck.
2. **A slide is skipped.** The inventory is the same AI's own list, so a
   skipped slide is missing from both the cards and the inventory, and the
   term-coverage check passes. Section density compares sections with each
   other, never with the deck. Nothing knows the deck had 42 slides.
3. **A page was never seen.** A PDF pasted as text loses its figures; an
   upload limit drops the last pages; a long reply is cut off. The prompt
   asks the AI to say so, which depends on it noticing.
4. **Handwriting or a figure misread.** Reported only if the AI knows it
   was unsure.
5. **What the AI doubted is easy to miss.** `notes_for_student` is shown
   on import and in About this lecture; `unclear_figures` only in the
   lecture check.

1 and 2 are the ones that break trust. A wrong fact studied well is worse
than a gap.

## 3. The options, argued

**A. A second AI checks the first ("Check against my slides").** The app
hands out a short prompt with every card in compact form. The student
pastes it into a *fresh* chat with the same slides. That AI gives each card
a verdict (supported, not in the slides, wrong: what the slide says) with
the slide number, and lists slides that have no cards. The app reads the
reply, marks checked cards, and holds back the wrong ones for Fix.
- For: catches fact 1 on any kind of source (handwriting, images, scans),
  which nothing else here can. A fresh chat has not committed to the first
  answer, which is where self-checks fail. Uses the tool the student
  already has open.
- Against: one more paste, which is friction (the app's whole promise is
  less of it). Still an AI. Costs the student a reply's worth of usage.

**B. The app reads the slides itself.** The student drops the PDF or PPTX
into the app; it is read on the phone, never uploaded. Each excerpt is
looked up in the text: found on slide 12, or not found. Slides with text
and no cards are listed.
- For: no AI at all, so it is the check a sceptic believes. Gives every
  card an exact slide. Could later show the slide itself beside the card.
- Against: only for sources with a text layer (not scans, not
  handwriting). Only proves the excerpt is real, not that the card says
  what the excerpt says. Adds a PDF reader to the app (loaded only when
  used). Excerpts must be verbatim quotes, which the prompt allows but
  does not require: on the made-up test lectures 5 of 6 excerpts matched
  the source word for word on the one with a source; real lectures are
  not in the repo to measure.

**C. The file accounts for every slide and every card says where it came
from.** Each item carries `source_page` ("slide 12"). The metadata carries a
slide map: every slide or page number from first to last, each with what
covers it, or why nothing does ("title slide", "repeat of 8", "could not
read"). The app checks the map has no holes and shows the slide number on
every card.
- For: cheap (optional fields, a prompt section, a check). A skipped slide
  becomes visible: leaving slide 19 out of a numbered list of 1 to 42 is
  far harder than leaving it out of a free list of terms. The slide number
  on each card makes the excerpt checkable in seconds. It is the
  foundation A and B both need. Gap 4 of the grade already picked this
  direction (labels in the file, optional, old lectures still load).
- Against: still the same AI's word. A slightly longer reply.

**D. The AI marks the cards it is unsure of.** Rejected: a model's own
confidence is poorly calibrated, and a "check this" mark on one card in
five teaches students to ignore it. The narrow cases where the AI really
knows it is unsure (unreadable writing, a cut-off page) are already
reported, and C makes them visible.

**E. Only show what exists better.** Surface `notes_for_student` and the
unclear figures where the student studies. Needed, but it does not catch
anything new.

## 4. The pick, after the owner's answers

First pick (C, then A as a second chat, then B) was overruled twice, for
good reasons:

- 2026-11-27, on A: the owner dislikes that AI has to make lectures at
  all, so no extra AI step: the prompt audits itself (`docs/FEEDBACK.md`).
- 2026-11-27, on cost: a lecture from two decks already takes about 30
  minutes on Opus 5.5. A second walk over every card was the first draft of
  that audit, and Anthropic's guidance argues against it: Opus 5 and later
  check their own work unprompted, and explicit verification steps "cause
  over-verification … removing them reduces wasted tokens with no loss in
  quality" ([Prompting Claude Opus 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5)).
  What it recommends against made-up facts is grounding in word-for-word
  quotes and citing each claim's source
  ([Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)).

**So: C, folded into writing, then B.** Every card quotes its passage word
for word and names its slide as it is written (no extra pass; about seven
output tokens a card). Pass 4, which already walked the inventory, also
walks the slide list once and accounts for every slide. The app, not the
AI, finds the slides nothing came from. A (a second chat) is dropped. B
(the app reads the slides itself, no AI) is next: with word-for-word quotes
and slide numbers in the file, it can confirm each quote is on its slide.

Estimated cost of phase 1: the prompt grows by about 360 words, read once;
the reply by about 2%. Not yet measured on a real lecture.

## 5. Build plan

**Phase 1 (built on `claude/project-thread-tckngc`).** Schema: `source_page`
on every item, `metadata.source_pages` (`count`, `unit`, `not_taught`),
cleaned on import, dropped whole if malformed. Prompt: quote word for word
and name the slide in obligation 1; the slide list in Pass 2; the slide walk
in Pass 4; the output contract; More practice, Explain, Add and Fix ask for
`source_page`. App: `lib/sourceCoverage.ts`; the lecture check's
`uncovered-slides`; Fix asks about those slides and takes back the ones
that teach nothing; "From your notes, slide 12" on every card; "42 slides,
all accounted for" in About this lecture. Help, EXPECTATIONS, What's new.

Known limit: a lecture with material added later (Add) may number a second
deck from 1 again; its slides then count against the first deck's numbers.
Add leaves `source_pages` out, so nothing is marked untaught wrongly; a
skipped slide of the second deck can go unreported.

**Phase 2 (B).** The student opens their PDF or PPTX in the app (read on
the device, never uploaded); each quote is looked up on its slide; a card
whose quote is not there is marked to check. Needs a PDF reader loaded only
when used.

**The prompt's efficiency (done 2026-11-27, owner's go-ahead).** Read
through whole. The substance holds; the waste was the end. "Before you
output" was twelve points and about 925 words, nearly all repeating rules
stated where they are used (coverage, options, stems, difficulty, cards per
idea, narration, order, types), and it had the AI count every option's
words and tally the MCQs' difficulty, then rewrite until the counts held.
Anthropic's Opus 5 guidance: explicit verification steps over-verify and
waste tokens with no loss in quality when removed. The prompt's own history
agrees: a lecture came out at 42% longest-is-right while its self-check
passed. Now four checks, about 180 words, only what cannot be seen while
writing: work every problem, the answer keys, coverage (Pass 4), valid
JSON. What the old list held that was stated nowhere else moved to its
home: "every fact a question tests is taught in its section" into Quality
bar part 1; the option-length rule is now done per question as it is
written. Fixed on the way: a wrong cross-reference (1.2 for part 1, point
4) and the MCQ shape's `[4 strings]` rationale when five options are
allowed. The prompt is about 11,600 words, from 11,970 before this work.

**To measure:** one real lecture made with the old prompt and the new, on
Opus 5.5 at high effort: time, reply size, and the lecture check's
findings (length pattern, difficulty mix, coverage) side by side. The
owner approved this test on 2026-11-27; it waits on their slides.

## 6. The owner's four session summaries (2026-11-27)

The owner pasted summaries of the sessions that made their PSYC 351C and
BIOL 365 (Circulatory, Muscles and movement, Nervous system) lectures, each
listing what went wrong and what to change, with the caveat: "take some of
the problems and stuff with a grain of salt. like some of them are less of
problems" (one was their own half-attached deck). So a point was adopted
only if it recurs across sessions or clearly cost quality, and only where
today's prompt does not already cover it. Those sessions used an older
prompt; much of what they asked for had been added since.

**Adopted** (each the smallest change, where the rule already lives):

| Point | Seen in | Change |
|---|---|---|
| Notes marked unsure ("idk", "maybe", red, unfinished) were dropped; the owner wanted them answered | Circulatory, Muscles | "Handwriting and highlights": answer them, never drop; a "maybe" may be the teacher's hedge |
| Notes that disagree with the slide: an obvious slip needs the right version and why; a teacher's in-class correction wins; check the figure before calling a conflict | Circulatory, Muscles, PSYC | "When the notes and the slide disagree": all three |
| Image-only pages cost most of the 30 to 50 minutes | all three BIOL | "Sources differ in shape": read each page once, enlarge only what is unreadable |
| Two versions of a deck; repeated slides | Nervous system, Muscles | taught once, from the newer version; repeats in `not_taught` |
| Which page to cite with two slides per page or several files | Nervous system, PSYC | `source_page`: the numbers of the file the student opens, file named |
| Abbreviations not spelled out | Circulatory, Nervous system | Wording rule 5 |
| "Definition must not contain its term's words" forced awkward rewording of common words | all three BIOL | the rule now matches what the app checks: all of the term's words, not one shared word |
| "No card answers another" stripped facts out of definitions | all three BIOL | a definition keeps the source's meaning; the question asks the fact as a use instead |
| Option length in words or characters? | Nervous system | characters, as the app counts |
| Correct answers all at index 0, balanced by hand | Circulatory, Muscles | the app shuffles at every showing; said where `correct_index` is |
| A "why" card with no reason in the source came out circular | Muscles | "Explain why" side: ask how or what instead |
| The previous lecture's terms only listed its last sections | Circulatory | the prompt block lists every term it defines, and skipped repeats go in `not_taught` (they went in the description, which the slide accounting does not read) |

**Already in the prompt:** delivering a file, `notes_for_student`, notes
addressed to Arborous, "None of the other options" and its answer share,
written answers sized to the exam, studies only when taught, keeping the
source's qualifier, no invented labels, the wrong option's rationale naming
the belief, fixing overlap by rewording, re-covering after a swap, Learn's
real order, model-evidence questions as hard.

**Not adopted:** half the deck attached (the owner's slip); several note
takers and two slide numberings (one class, one session, covered by citing
the file the student opens); a fixed item-mix share (dropped from the
prompt earlier on purpose: the mix follows the material); speed tricks
naming a tool (the student's chat decides how it views pages); the
graphic-or-decoration line (the diagrams thread owns `graphic`).

The rubric's judged part now reads the student's notes, abbreviations and
the example questions' style; its profile records whether the pages have
text to copy.

## 7. Questions for the owner

1. One real lecture's slides for the before-and-after test (kept off the
   repo, as always).
