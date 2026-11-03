# Understanding, not memorising: confidence, explanations, questions

The owner, 2026-11-03 (docs/ASKS.md, in full there):

- "you should be able to note how confident you are in your answer before
  locking it in or maybe it should be after … based on if u get it right
  or wrong and based on ur confidence something happens. like something
  you are confidently wrong about gets retested or worked on sooner. maybe
  there would be a special in depth explanation";
- "use the new like explanation things … to help explain different things
  in the app … think of clever ways it can be used";
- "people shouldnt memorize, they should learn, meaning understand why";
- questions "that test application": concepts combined, the nuance between
  similar things, misconceptions, the opposite, similar terms mixed in,
  "everything but one little detail right". "Use it as a guide or
  inspiration".

## 0. How this is decided

1. **What each piece is for.** Confidence: to tell what is known from what
   was guessed, and to catch the wrong belief held firmly. Explanations:
   the connections a teacher makes aloud, for a student who may never have
   heard them. Questions: to test whether the idea is understood, not
   whether its words are recognised.
2. **Who meets it, and how often.** Every multiple-choice question in
   Learn, Today, Review and Practice; the practice test at the end. A tap
   added to every question is paid hundreds of times a week, so it has to
   earn it (Today is meant to be as easy as Duolingo).
3. **Evidence.**
   - Confident errors are corrected more often after feedback than unsure
     ones (Carpenter et al. 2018, docs/evidence.md).
   - A week later, correction fades. The confident errors are the ones
     more likely to come back unchanged once the right answer is forgotten
     (Butler, Fazio & Marsh 2011,
     [10.3758/s13423-011-0173-y](https://doi.org/10.3758/s13423-011-0173-y)).
   - Feedback that restudies the source beats feedback without it
     (Karpicke & Roediger 2010, docs/evidence.md).
   - A right answer among four options is a guess a quarter of the time:
     arithmetic, not a finding.
4. **Anything that changes the schedule goes through the simulator
   first** (sim rule 8). The graded flips (2026-11-03) were decided that
   way.
5. **Built for any class.** Nothing switches on from one class's exam;
   only from what a lecture contains.

## 1. What exists now

- **Explanations** (`explain`, generator.md): 2 to 4 sentences on a key
  idea: what it is, why, how it follows from the one before. Learn shows
  each before the cards it prepares (lib/learnSteps `practises`). That is
  their only use. They are not shown:
  - after a miss;
  - in the test's review of what was missed;
  - on the section page or the glossary;
  - in Today or Review, which ask the cards cold.
- **Wrong options**: the generator already asks for the neighbour, the
  reversal, the qualifier swap, the wrong step, another case's answer,
  the half-truth and the misconception, each with its reason
  (`distractor_rationale`). A hard question chains two or more facts.
  Not named: **integration across ideas** (two key ideas, possibly two
  sections, needed together), and **right but for one detail** (the
  half-truth is close, but is defined as "true but not an answer").
- **Confidence**: none. A multiple-choice answer is marked on the tap.
  Flip cards now have Got it · Hard · Missed it. Answer times are logged.

## 2. Confidence

**When to ask.**
- **A. Before the answer shows ("lock it in").** Pick an option, then
  Sure or Not sure before it is marked. Honest (said before knowing),
  but a second tap on every question.
- **B. After it is marked.** One tap afterwards. Hindsight colours it:
  told it was right, "I was sure" is easy to say.
- **C. Not sure, only when it is so.** A "Not sure" mark beside the
  options, tapped before the pick when it applies. Sure is the default,
  so only the doubtful answers cost a tap.
- **D. From the answer time alone.** No taps, but slow can mean careful
  or unsure. Untested until the study log exists.

**C wins.** It is A's honesty, made before the answer shows, without A's
cost on every question. It is the owner's "before locking it in". A
student who never taps it gets the app as now. B's hindsight is the bias
the feature exists to avoid. D waits on real answers.

**For which cards.** Multiple choice: four options make guessing real,
and the owner named it. Typed terms and problems are checked against an
answer that was produced, not picked; a guess there is rare. Flip cards
already say how well they were known (Hard). Written answers are ticked
point by point. **Multiple choice only**, in every mode, the practice
test included (its marking waits for the end, the not-sure mark goes with
the answer).

**What each answer does.**

| | Right | Wrong |
|---|---|---|
| Sure | As now | **A firm wrong belief**: the explanation the question rests on, open with the passage; asked again sooner (the catch-up today, then the next day); the wrong option kept as a mix-up |
| Not sure | **Probably a guess**: grows as Hard does, so it comes back sooner; its explanation offered | As now: a miss |

The firm wrong belief is where the evidence points: corrected now,
likely to return later. The guess discount is where the arithmetic
points: a lucky tap no longer counts as known for days.

**Simulator first.** It has to answer: does "not sure" on a right answer
(treated as Hard) gain anything when the student marks guesses, and what
does it cost a student who marks too much, or never? A confident miss
asked again sooner: does it help, under fsrs and harsh? The simulated
student has no beliefs, only recall, so the firm wrong belief is modelled
as a lapse that returns. The one-tap price is not in the simulator; it is
weighed above. Built only if the simulator finds a gain and the
over-cautious student loses little, as with graded flips.

**Decided after the simulator (2026-11-03, sim/FINDINGS.md).** Counting
an unsure right answer as Hard cost up to 3 points and gained nothing, so
**Not sure changes what is shown, not when**. An unsure right answer gets
its why and its passage open, as a miss does: feedback doubled the
retention of right answers given unsure (Butler, Karpicke & Roediger 2008,
[10.1037/0278-7393.34.4.918](https://doi.org/10.1037/0278-7393.34.4.918)).
A sure miss was to go back to the floor; across the whole suite that cost
a point in 16 of 42 scenarios, every unmarked miss counting as sure, so it
is dropped. Sure or unsure is logged with each answer, for the real log to
test. In the practice test, the "?" a question
still carries when it is handed in is its Not sure, as on paper: no third
mark per question.

## 3. Explanations, used where they teach

Ways to use them, each with its case:

1. **After a miss**: the explanation of the idea a question practises,
   under its answer, beside the passage. This is where a student most
   needs the why, and in Today they never read it. **Yes**, and it is
   the owner's "special in depth explanation" for a firm wrong belief.
2. **In the test's What you missed**: the same, under each miss. **Yes.**
3. **A "Why?" on any right answer**, folded: for the curious and for a
   right guess. **Yes, folded**: it costs nothing unopened.
4. **The section page and glossary**: the section's explanations as its
   outline, to read before an exam. **Later**: a reading page, not a
   study one.
5. **The generator writing more**: one on how each section follows from
   the last. **Weighed in 4 below.**

Which explanation goes with a card is already worked out for Learn
(`practises`: most of the card's words are in it). The same match serves
1 to 3. Where none matches, the passage alone shows, as now.

## 4. Questions that test understanding

What the app can do, in order of how sure the gain is:

1. **Name the two missing kinds in the generator** (generator.md,
   section 3):
   - *integration*: a question that needs two key ideas together, written
     in the later section;
   - *right but for one detail*: the most tempting option is the right
     answer with one detail changed, which the student must spot.
   Cheap, and it applies to every new lecture.
2. **Make the lecture check see the balance.** It already counts hard
   questions. It could also flag a lecture whose questions are mostly
   recall of a definition (the question's words are the definition's), as
   it flags thin sections, with a Fix request. Worth it if real lectures
   show the problem; a real one is read first.
3. **Teach the connections between sections**: an `explain` at a
   section's start on how it follows from the last, in the generator. It
   costs reply length; to weigh after 1 and 2.
4. **Integration across lectures**, for a class: questions mixing two
   lectures' ideas. The mixed Practice already mixes them; a question that
   needs both is the generator's, per lecture, and cannot see the other
   lectures. Later.

## 5. Build order

1. **Explanations where they teach** (3: 1 to 3). No model change, and it
   serves both asks. Built 2026-11-03: after a miss, folded after a right
   answer, in the test's review; a made-up lecture with explanations
   (`scripts/__fixtures__/explained.study.json`) so the checks see them.
2. **The generator's two kinds** (4: 1). Written 2026-11-03 into
   generator.md section 3: "Two ideas together" as a seventh kind of
   question, where the material builds one idea on another, and "the one
   detail off" among the wrong options. To check on the next real
   generation.
3. **Confidence**: simulator first, then C on multiple choice in every
   mode, if it holds.
4. **The lecture check** (4: 2), after reading a real lecture.

This is reimagining across the memory model, the prompt and the study
screens: the work to run on max or ultracode (the owner's standing ask).

## 6. What would change this plan

- If the simulator finds the guess discount costs a cautious student more
  than it gives, "not sure" only brings the explanation and changes no
  schedule.
- If the owner wants confidence on every question (A), the cost is
  theirs to choose; C stays the default.
