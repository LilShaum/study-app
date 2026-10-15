# Content quality: what gets asked, in what order, and how well

From the owner's first real study of a biology lecture (2026-10-13). What was
measured on the test lecture before any change:

- **7 of 54 definitions give their term away.** Every word of the term is in
  its own definition (in the style of "the cell that guards a stoma" for
  *guard cell*; the lecture's own wording stays out of this public repo). A
  typed answer to those tests reading, not memory.
- **The same fact is asked twice in a row.** A flashcard "What range do Km
  values fall in?" is followed straight away by an MCQ "Typical Km values
  fall in which range?". The second is answered from the first.
- **A flashcard is shown with its answer, then asked three cards later**
  (the reading card for an unanswered flashcard). That is the "given the
  answer, then asked" pattern.
- **43% of a sitting is reading** (79 of 183 cards).
- The generator writes every item type it can for a term, with the same
  wording, because nothing tells it how the app uses them.

The goal is mastery, not recognition: every key idea asked from more than
one side (name it, tell it from its neighbour, use it, explain it), none of
it answerable from the card before, and less reading for more asking.

## Plan, in order

Everything marked **app** works on lectures already made. **Prompt** changes
reach new lectures, and existing ones through one paste of Fix or More
practice, which keep every score.

1. **iPhone header under the clock** (app). The home-screen app reports no
   status-bar inset, so the header sits under the clock even at the top.
   Measure whether the page covers the status bar and pad it ourselves.
2. **No typed term that gives itself away** (app). A definition whose words
   spell out its term is still read, but never asked as "name the term".
   The course check lists them, and Fix asks the AI to rewrite the
   definition without the term's own words.
3. **No answer shown before it is asked** (app). Flashcards are asked
   first, answer after (the reading card for them goes). Simulate.
4. **One fact, once per sitting, never back to back** (app). Two items that
   ask the same fact (most of their words shared) are never in the same
   step; the second waits for a later step or day. The course check lists
   them and Fix asks for one to be asked from a different side. Simulate.
5. **Order reviewed as a student, by measurement** (app). A session audit
   prints a sitting's order with, for each term, every card on it and the
   gap between them, the reading share, and every give-away. Run on the
   test lectures after each change; the numbers go in this file.
6. **Automated tests that hold the line** (app). The audit's rules become
   tests on the test lectures: no give-away asked, no fact asked twice
   within a step, no answer shown before it is asked, reading share capped.
   New course-check rules have unit tests.
7. **The generator knows how its items are used** (prompt, all four
   prompts). A section on what the app does with each item type; a plan
   per idea (key ideas get several items from different sides, minor ones
   one or none); no two items on one fact in the same words; definitions
   that never use the term's own words; nothing a non-student could answer
   from common sense; MCQ stems that paraphrase, not quote; anchors to the
   slide's text, previews tested where taught, figure-only detail kept
   light (the earlier "anchors" plan). A self-check list before replying.
8. **Course check for thin key ideas** (app). A term the lecture marks as
   key (objective, flagged, defined) with fewer than two questions beyond
   its typed name is listed, and More practice targets exactly those.
9. **Simulator** for 3 and 4, both students; log in sim/FINDINGS.md.
10. **The walk-through checklist** (skills). The arborous-design and
    simulate skills get the content walk: print the order, check gaps,
    repeats, give-aways and angles, not only the screens.

## Results

Measured on the biochemistry test lecture (`scripts/__fixtures__`), a whole
Learn and a 60-minute Today with no history. `src/lib/sessionAudit.test.ts`
holds the "after" column on every change.

| | Learn before | Learn after | Today before | Today after |
|---|---|---|---|---|
| Cards | 243 | 198 | 183 | 164 |
| Reading share | 43% | 34% | 43% | 34% |
| Typed terms that spell themselves out | 7 | 0 | 4 | 0 |
| Answers shown, then asked | 38 | 0 | 31 | 0 |
| A card within 5 cards of one that answers it, or in its step | many | 0 | many | 0 |

Steps 2 to 4 and 6 shipped together (2026-10-13):

- `lib/contentChecks.ts` is the one place that decides a give-away
  (`givesAway`), the same fact (`sameFact`) and a card answered by an
  earlier one (`answeredBy`). Calibrated on every pair the test lecture
  flagged: a plot's slope and intercept, two inhibitors side by side, and a
  fact with a worked problem that uses it are not repeats; "What range do
  Km values fall in?" twice, or "why does feedback inhibition target the
  committed step?" turned round, are.
- Learn and Today never ask a give-away, never show a flashcard open, and
  move the later card of a pair to the next step (`learnSteps.apart`). A
  section with nowhere further puts it at the end of its last step if that
  is far enough, or in a short step of its own after a pause.
- The course check lists both (`gives-away`, `same-fact`) and Fix asks for
  the definition reworded without the term's words, and the repeat asked
  from a different side.
- The simulator is level under both students (sim/FINDINGS.md).

Known: a section whose repeats cannot be spaced ends with a step of one or
two cards. The content fix (Fix, or the generator below) is what removes
those.

**Rechecked 2026-10-15 by reading the whole walk card by card** (the
owner asked for each checked item to be confirmed, not taken from the
log). The counts above held, but reading found a fact turned round asked
back to back ("what does a competitive inhibitor do to Km and Vmax?", then
"raises Km, leaves Vmax: which mode?") and a short answer three cards after
the definition that printed it. Both are now caught (`shortReveal`,
sim/FINDINGS.md). Today's walk of the test lecture: Learn 165 cards, 38%
reading; Today 116 → 111 cards, 36% reading; still 0 give-aways, 0 answers
shown before asked, 0 cards close to one that answers them.
