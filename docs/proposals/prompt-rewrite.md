# The generator prompt, round of 2026-11-22: what the PSYC run taught

For the owner. Questions at the bottom.

## What this covers

Six open asks meet here, because each one changes `prompts/generator.md`,
and some also change the app around it:

1. **The prompt tells the AI how the app uses what it makes** (2026-11-17,
   again 2026-11-20).
2. **Use what generating the PSYC midterm 2 lectures taught** (2026-11-20).
   The audit that chat wrote, plus three of its files and the teacher's
   example test, were read for this. They stay outside the repo (they are
   the student's course), so this plan describes them without quoting them.
3. **"None of the other options" and "All of the other options"**
   (2026-11-22, the owner's decision).
4. **Wrong slides and wrong notes handled, not obeyed blindly** (2026-11-22).
5. **The AI hands back a file, never pasted text** (2026-11-16, held while
   the owner was generating).
6. **Say when to regenerate or use Fix** (2026-10-26), answered again once
   this ships.

## How to decide

- **What the prompt is for.** A course file that teaches a student who may
  never have heard the lecture, for any class (CLAUDE.md "Built for any
  class"), made by Opus 5.5 on high effort from the student's own notes.
- **The main lesson of the audit.** In about eight rounds of fixes, most of
  them enforced rules the prompt already has, which the first pass skipped
  under load. So adding rules is not the cure on its own. What made rules
  stick was writing something down per item (the counted option lengths,
  the source excerpt). A fix should be a step the model has to write, or a
  check it has to count, more than a sentence it has to remember.
- **Length.** The prompt is about 1,050 lines. Every addition is paid for by
  cutting a repetition elsewhere. The budget is no more than 5% net growth.
- **Evidence.** The audit; the three files (what the model actually made:
  12% of questions had a None option, half of them correct, every None item
  marked hard, content options like "Both X and Y" used well); the
  teacher's test (four- and five-option questions, "None of the above"
  never correct there, one letter combination, negated stems, fill-in-the-
  blank stems, short answers with a mark split); the app's own checks.
- **The test.** A course made with the new prompt, Opus 5.5 on high effort,
  from the made-up source in `scripts/__fixtures__/`, checked against the
  old prompt's on the points below (CLAUDE.md "Courses are generated the
  way the owner does it").

## The decisions, each argued

### 1. How the prompt tells the AI about the app

- **A. A short section near the top, "How the student meets what you
  make"**, about 25 lines: Learn's steps (Read, Recall, Apply, with
  difficulty deciding where a question lands: easy in Recall, medium and
  hard in Apply); each section opening with "Read it here first or
  Questions first", so with Questions first the student meets no
  explanation before the questions and the why after a miss is where they
  learn it; the source excerpt shown under every answer as "From your
  notes"; the explanation opening after a miss or Not sure; a figure card
  shown in its section; Practice filtering by kind and section (so no
  extra drill files are needed); a second file not sharing progress with
  the first.
- **B. Spread through the rules**, each fact beside the rule it bears on.
- **C. Both**: the short section, and each rule that depends on it points
  back ("the excerpt is shown to the student: write it for them").

**C wins.** A alone is read once and forgotten under load (the audit's
lesson). B alone never gives the picture of how a student goes through
the file, which is what the owner asked for. The section pays for itself
by replacing the old description in part 1 that no longer matches the app
(the audit's point 5).

### 2. Wrong slides and wrong notes

The owner (2026-11-22): slides are sometimes wrong and the teacher says so,
which they mark in their notes; their notes are sometimes wrong because
they misheard. For BIOL midterm 2, the generating chat listed what the
notes got wrong in a report beside the file, and that worked.

- **A. Notes always win** (the audit's "always obey notes to Arborous").
  Against: a misheard note becomes a card.
- **B. The slide always wins.** Against: a teacher's correction of a slide
  is lost.
- **C. By kind of note.** A note that marks the slide as wrong, to ignore,
  or not on the test (crossed out, "wrong", "ignore", "not on test") wins.
  A note that addresses the generator ("Note for Arborous: …") is followed
  as an instruction about what to cover. A note that states a fact against
  the slide, or against what is settled in the field, with no such mark, is
  not used silently: the file keeps the slide's version and the conflict
  goes in the report to the student, to check.

**C wins.** It keeps the teacher's corrections and catches the mishearing,
and it is what the BIOL chat did by hand.

### 3. Where the AI tells the student things

Today a model can only use `metadata.inventory.unclear_figures`, which is
for figures, and the prompt's "reply with JSON and nothing else"
contradicts its own "say so in one line" (the audit, point 1).

- **A. Text before the file.** Against: with file-only output (decision 4)
  the text is in the chat, not in the app, and it is easy to miss.
- **B. A field in the file, `metadata.notes_for_student`**: a list of short
  plain lines (a note that disagreed with its slide and which was used; a
  part of the deck missing from what was given; a slide that would not
  render; notes that stop partway). The app shows it once on import, and
  under About this lecture after.
- **C. A second file.** Against: two files to download and keep together.

**B wins.** It travels with the lecture and reaches the student where they
study. `unclear_figures` goes back to figures only.

### 4. A file, never pasted text

- **A. File only**: the prompt asks for a downloadable `.study.json`; New
  lecture and the Add dialogs keep only "upload a file", the paste box
  goes. The owner asked for this.
- **B. File first, paste kept behind a link** for an AI that cannot make
  files.

**A**, as asked. The risk: an AI chat that cannot make a downloadable file.
Claude and ChatGPT can; the prompt says, for one that cannot, to put the
JSON in a single code block the student saves as a file. That keeps one way
in (a file) without a paste box.

### 5. None of the other options, All of the other options

The owner's decision (2026-11-22), for every class:

- **"None of the other options"**: right about half the time it appears. When
  right, every listed option is right but for one detail, and each wrong
  option's reason names that detail. When wrong, it replaces the weakest
  distractor, and one listed option is fully right.
- **"All of the other options"**: each option one part or property of a
  concept; the question can be negative ("which does a prokaryote NOT
  have"); the answer All, None, or one option.
- **Still banned**: options that point at other options by letter or
  position ("A and C only", "Both A and B", "C & D"). That is what
  select-all is for.
- **Allowed, and worth saying so**: content bundles as options ("Both
  procedural memory and priming", "Phonetics only, with syntax intact"). The
  PSYC files used these well, and the ban written on 2026-11-17 reads as if
  it covered them.

The choices inside it:
- *How often.* In the PSYC files 12% of questions had a None option. A cap
  of about one question in eight with All or None keeps them from becoming
  the pattern; within those, All, None and a single option each right
  often enough that no answer is a safe guess.
- *Length.* These options are short, so they are left out of the
  option-length count.
- *Difficulty.* A right None is not automatically hard: hard is still the
  join (part 3 of the prompt, 2026-11-20). The PSYC files marked every
  right None hard; most were medium by that rule.
- *The explanation.* When None is right, the explanation gives the correct
  version, since no option shows it.
- *Where it sits.* Always last. The app's option shuffle already keeps an
  option that points at the others last (`lib/optionOrder`); these two are
  added to it by exact wording. Since None is right half the time, its
  place gives nothing away.

### 6. Written answers that match the exam

The prompt says written cards are rare; the PSYC exam was largely short
answers in a fixed format.

- **A. Keep them rare.** Against: the most valuable test practice was left
  out until round two.
- **B. Follow the exam when the student's materials show its format**
  (past questions, a study guide, assignments): a short-answer set per
  lecture in that format, labelled parts and the mark split included.
  Without such materials, as now.

**B**, which is the owner's rule already ("what you practise should look
like what the exam asks", and "Built for any class": it switches on from
what the student gives, not from assumptions). The app's "same fact"
check stops counting written cards, which repeat facts on purpose.

### 7. Studies cited but not taught

- **A. As now**: any cited study may be taught from the model's own
  knowledge.
- **B. Only taught studies get cards**: the method or result shown, or the
  study discussed in the notes. A study only cited goes in `mentioned`.

**B.** Cards on studies the class never taught look authoritative and cost
time; the student's own notes said to skip them. This sits inside the
`<!-- no studies -->` passages, so classes without studies are untouched.

### 8. What makes rules stick (the audit's round-3 lesson)

Four checks, each something the model writes or counts per item, replacing
prose that says the same less firmly:

1. **Each wrong option's reason names the belief that picks it** ("picked by
   a student who thinks …"). No belief, no distractor. This turns the
   existing strike-out test into a written step.
2. **Every fact a question tests is taught first** in the section, by a
   definition, explanation or flashcard; a checklist line, counted.
3. **The stem keeps the source's qualifier**: "most often" is never quietly
   "always" in the right answer (the qualifier rule covered wrong options
   only).
4. **No invented labels**: an explanation names nothing the source does not
   (a word that reads as a technical term but is not one confused the
   student).

And one hard form named outright, from the PSYC files: **which result would
support or challenge a model, or which is NOT evidence for it**. It is the
honest hard question in a course of studies and models, and it fits the
"hard is the join" rule.

### 9. Messy sources

Three lines, for what no rule covered: several people's notes (the
student's own win over a classmate's; a conflict goes in the report);
notes that stop partway (taught from the slides alone, said in the report);
two slide numberings (the student's own file's numbering).

## What changes in the app

- **Import**: show `metadata.notes_for_student` once, then under About this
  lecture. Schema: an optional list of strings.
- **New lecture and the Add dialogs**: the paste box goes; upload only.
- **Lecture check**: "None of the other options" and "All of the other
  options" stop being flagged; "of the above" and letter pointers still
  are. Written cards leave the same-fact check.
- **Option shuffle**: the two new wordings stay last.
- **A figure card** names its section, so one met at a section's edge is
  not taken for the next section's figure.
- **What's new** gets one line; Help's New lecture text loses the paste.

## Second round: the owner's principles (2026-11-22)

The owner's words are in docs/ASKS.md. Three changes to the plan follow.

**A prune pass comes first, before anything is added.** Every passage of
the prompt is read against one question: does it change what the model
makes? A passage goes, or is cut down, when it is:
- too vague to act on ("make good questions");
- in conflict with another passage (the audit found "JSON and nothing
  else" against "say so in one line");
- detail past what the model needs, or a rule restated in three places;
- specific where it should be general: an example lifted from one of the
  owner's classes or from a planning conversation, which teaches the model
  that class's habits instead of the principle. Examples stay where they
  show a principle better than words can, and are made up and varied
  across subjects.

Each cut is listed with its reason in the commit, so a rule taken out by
mistake is easy to find.

**Question types: a guide to choosing, not quotas.** Options:
- *A. Quotas per type* (so many select-all, so many None). Against: the
  owner's point. A model meeting a count writes a select-all where an
  mcq fits better.
- *B. Free choice.* Against: the other half of the owner's point. Left
  alone, a model writes the same plain mcq for everything.
- *C. A short table of what each type tests best*, with one line of when
  to reach for it (a set of properties that get confused: select-all; a
  bundle with one subtle error: None of the other options; whether every
  part belongs: All of the other options; a method: a problem; a full
  explanation the exam asks for: a written answer). One check in Before
  you output: "Does any type that fits this material appear nowhere?"
  Caps only where a pattern would give answers away (All or None as the
  answer).

**C wins.** It points the model at the right tool for each idea and
catches the "same type for everything" failure, without counts that force
bad questions. The existing quotas get the same test: the difficulty mix
stays (the audit found it useful once hard meant hard), and any count that
only forces padding goes.

**Five options, as a maximum.** Four stays the usual; a fifth is allowed
where it earns its place (a fifth plausible misconception, or both All and
None of the other options, which only fit together in five). The app shows
up to five (letters A to E, keys 1 to 5), and its lecture check stops
expecting exactly four.

## The build, in order

1. App changes above, and five options (Sonnet 5.5 to an exact spec; I
   review the diff).
2. The prune pass, then the additions (mine: it is what a student's
   courses are made from).
3. The test: one course from the made-up source with the new prompt, Opus
   5.5 on high effort, checked on: the None and All shares and how often
   each is right; every wrong option's named belief; facts taught before
   asked; no "Both A and B"; the report field used for the source's gaps;
   the file valid and opening in the app.
4. Then the owner is told which lectures to regenerate and which to Fix.

Cost: the app changes and prompt edits are about half a session; the test
generation is the costly part (an Opus 5.5 run on a whole source).

## Questions for the owner

1. **The test generation** (step 3): run it, or skip it and judge the
   prompt on your next real lecture? (Answered in part 2026-11-22: both
   only in five options; five as a maximum.)
