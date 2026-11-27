# How Arborous teaches, checked against the research

Asked 2026-11-27. The owner wants every way the app presents material, the
diagrams and the simulator reviewed against learning science, with big,
student-visible recommendations to choose from before anything is built.
Nothing in the app was changed. Agents only gathered sources; every
judgment here is this session's.

Read with `docs/evidence.md` (the sources already verified) and
`docs/proposals/grade-2026-11-16.md` (the grade and its seven reworks, which
still wait on the owner). This review does not repeat them; where it agrees
with one, it says so and adds the evidence.

## The short version

**The app's core is right.** Retrieval over rereading, spacing that adapts
to each item, one correct recall per sitting then spaced relearning, mixed
practice near an exam, worked examples before problems, feedback held to the
end of a test, and the why under every answer are among the best-supported
choices in the field. Keep all of them.

**Three things the research says the app is missing**, in order of what
they cost a student:

1. **Diagrams are read and never practised.** A figure the student "needs to
   know" is shown once and never asked about in a form that uses the
   picture. Transfer from testing is weakest to material that was seen while
   studying but never tested (Pan & Rickard 2018). Fix: diagrams the app
   draws itself from a description, which it can then step through, quiz
   and make interactive. The real slide image, cropped from the student's
   own file, is the fallback.
2. **Learn's first telling of an idea is read-then-type-the-term.** Explaining
   why, in your own words, is one of the best-supported study activities
   (self-explanation, g = 0.55 over 64 reports; Bisra et al. 2018). Typing a
   term back from a definition is closer to rereading. Fix: Learn asks "why"
   and "what would happen if" where it now asks "name the term". This is
   the grade's rework 2, now with the evidence behind it.
3. **Starting is the hard part for a student with ADHD, and the app asks for
   30 minutes up front.** Fix: a short, winnable first sitting with an
   honest "keep going", so starting costs almost nothing.

**About the simulator.** It is a good tool for "when should a card come
back", and it has kept bad ideas out. But it treats every card as an
isolated fact and every student as one who always sits down. So it cannot
see the value of recommendations 1 to 3, and it must not be used to veto
them. Four upgrades below would let it.

Questions and decisions for you are at the bottom.

## 0. How this was decided

**What each way to study is for** comes from CLAUDE.md and
`docs/EXPECTATIONS.md`. **Who meets it**: a student who may have missed the
lecture, studying on a phone, often with ADHD. **The evidence**: peer-reviewed
meta-analyses and reviews first, then single experiments. A finding is used
only if its abstract or text was read; the few that were not are marked
"summary only" and none of them carries a recommendation alone. PubMed covers
little educational psychology, so publisher pages were read for the rest.

**The yardstick for a recommendation**: a student would clearly notice it
(the project's rule for big asks), it rests on evidence that holds for this
kind of material, and it does not break a line the owner already set. Each
is argued against its alternatives before it is picked.

**What the evidence cannot say.** Almost no study tests an app like this
one. Most are lab studies with short texts or word pairs. ADHD-specific
evidence on studying is thin and partly contradictory (section 4). Read
every recommendation as "the best-supported direction", not a promise.

## 1. Each way to study, graded

| Way to study | What the research says | Verdict | The gap |
|---|---|---|---|
| **Today** | Spaced retrieval with items spaced by how well each is held is the strongest combination known (Dunlosky et al. 2013: practice testing and distributed practice the only two "high utility" techniques; adaptive spacing in docs/evidence.md) | Right idea, keep | The time does not fit the material and the app does not say so (grade gap 1). The 30-minute default is a big first ask for ADHD (section 4) |
| **Learn** | Worked example then practice, read then retrieve soon after: supported. Pretesting (Questions first) helps the asked questions | Right order; weak first telling | Read-then-type-the-term takes two fifths of Learn (grade). Self-explanation beats it (section 3) |
| **Adaptive quiz** | Interleaved retrieval with feedback, misses first: supported. Transfer is strongest when retrieval is elaborated and when the later question differs in form (Pan & Rickard 2018) | Right idea | A miss comes back as the same card. It should come back as a different question on the same idea (its own "Not yet" line) |
| **Practice** | Choosing what to study is fine for a student who knows their gaps; students misjudge what helps them, favouring blocked and massed study (Kornell & Bjork 2008; Bjork, Dunlosky & Kornell 2013) | Keep; the defaults carry it | Mixed by default before an exam already counters the bias. Keep that |
| **Practice test** | Feedback at the end teaches as well as after each answer (docs/evidence.md). Confident errors are corrected best when feedback comes (Butler, Fazio & Marsh 2011; Metcalfe 2017) | Strong, keep | None worth a rework |
| **Flip cards** | Self-graded recall works, but self-grades drift kind (Bjork et al. 2013). Hard without Easy was the right call (sim/FINDINGS.md) | Keep | None |
| **Written answers, problems** | Producing an answer beats recognising it; worked examples first, problems spread and mixed (docs/evidence.md) | Strong, keep | None |
| **Select all that apply** | Multiple true-false shows half-known ideas (Couch et al. 2015, in EXPECTATIONS) | Keep | None |
| **The "why" after every answer** | Feedback that explains the reasoning is what makes errors useful (Metcalfe 2017) | The app's best feature | Make the why the start of the next question (rec. 4) |
| **Not sure / I don't know** | Feedback doubles what is kept of unsure right answers (Butler et al. 2008, in evidence.md) | Keep | None |
| **The tree** | Feedback that informs (what is held, what is fading) supports motivation; rewards for completing or for streaks undermine it (Deci, Koestner & Ryan 1999: completion-contingent rewards d = −0.36, positive informational feedback d = +0.33) | Right kind of feedback | It shows what fades but does not take you to it (rec. 6) |
| **Diagrams** | A diagram teaches when it is simple, signalled and used; animation helps only for change and processes; decoration hurts most next to a diagram (section 2) | The weakest part | Read once, never practised; mostly words about pictures that are not there |

## 2. Diagrams: what they are for, and how to make them teach

### What the research says

- **Simple beats detailed for understanding.** Students given simple,
  functional heart diagrams drew more inferences than with text alone, and
  tended to beat those given detailed diagrams (Butcher & Kintsch 2004,
  small study: suggestive, not settled).
- **Pointing out what matters helps, most for students new to the topic.**
  Signalling (highlighting, arrows, colour that ties a label to its part)
  improves comprehension and transfer, a small effect, larger for low prior
  knowledge (Richter, Scheiter & Eitel 2016, meta-analysis of 45 comparisons).
  That is exactly the student who missed the lecture.
- **Labels belong near what they name, but not crammed on.** A middle
  distance between label and part did best (Beege et al. 2019); one careful
  replication found no split-attention effect at all (Cammeraat et al. 2020).
  So: labels close, uncluttered, no legend to look up.
- **Animation helps only when the thing to learn is change.** Animation beat
  static pictures overall (d = 0.37), but decorative animation did nothing
  (d = −0.05) and procedures gained most (Höffler & Leutner 2007,
  76 comparisons). A re-analysis found animation helped when learners had to
  grasp how something changes (g = 0.34 to 0.65) and did nothing otherwise
  (g = 0.04) (Ploetzner, Berney & Bétrancourt 2020, read through a review).
- **Decoration next to a diagram hurts.** Seductive details lower learning,
  most of all beside informative diagrams (Sundararajan & Adesope 2020;
  summary only, effect sizes not read). The book look must stay out of the
  diagram itself.
- **Asking the student to explain the diagram is the best generative
  activity.** Self-explanation g = 0.55 (Bisra et al. 2018). Having students
  draw is not reliably better than studying a good diagram and costs time
  (Fiorella & Zhang 2018).
- **What is never tested transfers least** (Pan & Rickard 2018). A figure the
  student only reads is the case the app's own check already warns about
  (`untested-figures`).

### What the app does now

The generator writes a `graphic` for each figure a lecture turns on: a
`why`, a purpose (`know` or `picture`), and either its own SVG or a pointer
("slide 10"). On the owner's three real lectures there were 58 figure notes
and 2 drawings for 189 slides with a figure (grade, gap 3). The Diagrams
page is twelve phone screens of words about pictures that are not there.
And a diagram is read, never scored.

### The options

- **A. Better instructions for the AI's SVG.** Cheap. But every drawing is
  one-off markup in its own style, hard to check, unsafe to make
  interactive (it would mean running code the AI wrote), and the grade
  found the AI declines most figures anyway, rightly, because a redrawn
  photograph or plate is a crude copy.
- **B. The app draws diagrams itself from a description.** The file says
  what the diagram is: a pathway (steps and what acts on what), a cycle, a
  comparison, a hierarchy, a labelled structure kept schematic, a graph's
  shape. The app draws it in its own style, both themes, phone size. Because
  the app knows the parts, it can do things a picture cannot: build it up
  one step at a time at the student's pace, hide a label and ask for it, ask
  "trace the path from A to D", and, for a mechanism, let the student break
  a link and see what follows (the owner's aphasia example). The AI is
  strict about the shape and free about the content; no AI-written code
  ever runs.
- **C. The real figure from the student's slides.** The owner's question:
  could the AI put screenshots in the file? Sometimes, if the chat that
  makes the lecture can run code. But it is unreliable across chats, makes
  the file many megabytes, and every share link would carry the teacher's
  slide images. Better: the file records which page and which part of it
  (a crop box), the student adds their slides' PDF once, it stays on the
  device, and the app cuts the figure out when it is shown. This is the
  grade's pick for gap 3, made sharper by the crop.
- **D. Leave it**, a note and a pointer. Fine at a desk with the slides
  open; useless on a bus.

**For B:** it fixes quality, theme, safety and practice at once, and every
interaction it allows is one the research supports (stepping through for
processes; signalling; retrieval; explaining). It answers the owner's
interactive-diagrams idea with a plan that can be checked. **Against:** the
biggest build here (a renderer per kind, a schema, the generator taught to
use it), and it cannot draw a photograph, an anatomical plate or a real
results plot.

**For C:** it is the only honest way to show those. In a herbarium-style
book a pasted-in plate fits the look rather than breaking it, so the theme
worry is smaller than it seems. **Against:** nothing for a lecture made
from pasted text; a OneNote export puts three slides on a page (the crop
box handles that); a new store on the device.

**Pick: B as the main road, C as the fallback, both.** They cover different
figures: B for anything with parts and relations (pathways, cycles,
comparisons, simple structures), C for what cannot be redrawn. A is folded
into B (the AI describes instead of drawing). The rule for when a diagram is
made, and why, follows the research:

| The figure shows | Made as | Interaction |
|---|---|---|
| A process, pathway, cycle (change over steps) | B | Stepped through at the student's pace; then trace it from memory |
| A causal system the slides talk about (what breaks what) | B | "Break a link, see what follows", then a question on it |
| Parts of a structure, kept schematic | B | Labels hidden one at a time, named from memory |
| Two or three things set side by side | B | Toggle between them; a question on the difference |
| A photograph, plate, real data plot | C (crop of the real page) | The `why` points at what to see; questions about it |
| Decoration, or only "to picture it" | Nothing, or C without questions | None |

**Every `know` diagram gets practised.** Under B the app makes the
label-from-memory and trace-it cards itself from the diagram's parts, so the
generator does not have to write them. That closes the "read, never scored"
gap without longer files.

## 3. Learn's first telling: explain, don't name

The owner's rule: Read, Recall, Apply, never read-then-name. The grade found
two fifths of Learn is still reading a definition and typing its term, with
definitions written as riddles to make the typing fair.

**The evidence.** Self-explanation, explaining in your own words why
something is so, gives g = 0.55 across 64 reports, g = 0.67 over no
explanation and g = 0.35 even over being given the explanation; multiple
choice prompts to self-explain looked weakest (Bisra et al. 2018).
Elaborative interrogation ("why would this be true?") is rated moderate
utility (Dunlosky et al. 2013). Testing transfers best to application and
inference questions when retrieval is elaborated (Pan & Rickard 2018).

**The options.** A: keep naming, write better definitions (cheap, still
low-value). B: after reading, ask a typed "why" or "what would happen if",
compared with the explanation the file already has, the student ticking
what they got, as written answers already work; terms move to the next
sitting's review. C: replace reading with questions throughout (Questions
first for everyone): too far from "Learn follows the slides".

**Pick B.** It uses what the file already writes (`explain`, the why on
each question), it is what the grade's rework 2 proposed, and it is the
change with the most evidence behind it in this review. It bends "no
drastic changes to how it teaches" (2026-10-21), so it is your call
(question 2).

## 4. Studying with ADHD: lower the cost of starting

**What the evidence shows, and its limits.**

- Working memory is weaker in ADHD, large deficits in children and moderate
  ones that persist into adulthood (Kasper, Alderson & Hudec 2012; Alderson
  et al. 2013, meta-analyses). So: one thing on screen at a time, nothing
  to hold in mind between screens. Arborous mostly does this already.
- People with ADHD choose small immediate rewards over larger delayed ones
  more often (Marx et al. 2021, meta-analysis, small to medium). So the
  payoff of a minute of studying should be visible in that minute.
- Whether testing helps students with ADHD as much is unsettled. One study
  found a moderate testing effect for both groups (Knouse et al. 2016,
  summary only); another found none in the ADHD group and tied it to poor
  recall on the first test (Dudukovic et al. 2015). The likely lesson: the
  first retrieval of a sitting should be winnable, with feedback, which
  Learn's easy-first order already does.
- No peer-reviewed study was found on streaks or loss aversion in learning
  apps. The case against Duolingo-style tricks rests on the rewards
  meta-analysis: rewards for showing up or completing undermine the wish to
  do the task, while feedback that informs strengthens it (Deci, Koestner &
  Ryan 1999). That is the right basis for "no cheap tricks".

**What to change.** Starting is where a student with ADHD loses the day, and
nothing in the app is aimed at it. Today asks for the day's minutes up
front. **Recommendation:** Today opens as a short sitting, about five
minutes, that ends on a natural stop with what was gained shown plainly
("4 ideas back to strong"), and offers to keep going in the same tap. The
day's plan still counts the full time; a student who stops at five has
still done the most urgent five. This is an inference from the evidence
above, not a tested result, so the simulator's "stops early" student
(section 6) should check it costs nothing before it is built.

## 5. The recommendations, ranked

Ranked by what each costs a student today, times how strong the evidence is.

| # | What the student would see | Evidence | Size | Relation to past work |
|---|---|---|---|---|
| 1 | **Diagrams the app draws**: pathways, cycles, comparisons, simple structures, in the app's style, stepped through, labels quizzed, mechanisms you can break | Signalling; simple over detailed; animation for change only; self-explanation; untested material transfers least | Large: weeks, in stages | New. Answers the interactive-diagrams idea (ASKS 2026-11-23) |
| 2 | **The real figure from your own slides** when it cannot be redrawn, cut from the PDF you add once | The only honest way to show plates, photos, plots | Medium: about a week | The grade's gap 3 pick, with a crop |
| 3 | **Every "know" diagram practised**: name the label, trace the path, from memory | Pan & Rickard 2018; testing effect | Small once 1 exists | Closes `untested-figures` |
| 4 | **Learn asks why, not "name the term"**, after reading | Self-explanation g = 0.55; elaborative interrogation | Medium | The grade's rework 2 |
| 5 | **A short first sitting** in Today with "keep going" | Working memory; delay aversion; first retrieval winnable | Small to medium | New |
| 6 | **The tree takes you to what is fading**: tap a fading branch, study that part | Informational feedback; the reason to come back is what fades (CLAUDE.md) | Small | Builds on tree.md |
| 7 | **A miss comes back as a different question on the same idea** | Transfer is best across formats and with elaborated retrieval | Medium; needs the file to say which cards share an idea (grade gap 4) | The adaptive quiz's own "Not yet" |
| 8 | **The simulator learns to see ideas, diagrams and real students** (section 6) | Needed to judge 1, 4, 5 and 7 | Medium, invisible to students | New |

**The order I would build them in:** 8's first two steps (cheap, and they
let the simulator judge the rest), then 5 and 6 (small, felt every day),
then 1 with 3, then 2, then 4 on a switch, then 7 once the file records
ideas. The grade's reworks 1 (the plan runs to the exam) and 3 (home is the
student's term) still stand and fit beside these.

## 6. The simulator

**What it does well.** It runs the app's real code against a separate model
of forgetting, under three memory models, and logs every assumption. That
habit is rare and it has paid off (it kept Easy and the confidence schedule
rules out). Its approach is close to how scheduling is studied: recall
probability governs when to review (Tabibian et al. 2019), and memory models
of the FSRS and half-life-regression kind are fitted to real logs (Settles &
Meeder 2016; Ye, Su & Cao 2022).

**What it cannot see, and why that matters now.**

1. **Every card is an isolated fact.** Learning one idea never helps a
   neighbour. So an explanation, a diagram or a "why" question can only cost
   time in it, never pay off. It would score recommendations 1, 3, 4 and 7
   as losses. Real memory models link practice of related items (Pavlik &
   Anderson 2005 model strength per item; knowledge-component models group
   items by the idea they test).
2. **The student always does what the app says, for as long as it says.**
   Real students stop early and skip days, more so with ADHD. Only
   `busy-20` misses days.
3. **The score is recall of the cards studied.** The owner's goal is
   understanding and application, which transfer research measures
   separately (Pan & Rickard 2018).
4. **Every number is an assumption until fitted to real answers.** The
   grade's rework 5 (keep every answer) is what makes fitting possible.

**Upgrades, in order.** (a) Ideas: cards grouped by the idea they test,
with a share of each retrieval strengthening the others in the group; run
every conclusion with and without it, as with the memory models. (b) A
student who stops early and skips, at a few rates, so a short first sitting
can be judged. (c) A second score for application: questions on an idea
that were never practised as such. (d) Fit the student to the real answer
log once there is one. Until (a) and (c) exist, the simulator should judge
when cards come back, not whether a new kind of teaching is worth it.

## 7. Sources

✓ = read from the abstract or text. "Summary only" = seen in a search
result or press release; used only beside verified sources.

- ✓ Alderson, Kasper, Hudec & Patros 2013, Neuropsychology. Working memory in adults with ADHD, meta-analysis. [10.1037/a0032371](https://doi.org/10.1037/a0032371)
- ✓ Beege et al. 2019, Frontiers in Education. Spatial distance of labels. [10.3389/feduc.2019.00086](https://doi.org/10.3389/feduc.2019.00086)
- ✓ Bisra, Liu, Nesbit, Salimi & Winne 2018, Educational Psychology Review. Self-explanation meta-analysis. [10.1007/s10648-018-9434-x](https://doi.org/10.1007/s10648-018-9434-x)
- ✓ Bjork, Dunlosky & Kornell 2013, Annual Review of Psychology. Self-regulated learning. [10.1146/annurev-psych-113011-143823](https://doi.org/10.1146/annurev-psych-113011-143823)
- ✓ Butcher & Kintsch 2004, Diagrams 2004 (LNAI 2980). Simple vs detailed diagrams. Small study.
- ✓ Butler, Fazio & Marsh 2011, Psychonomic Bulletin & Review. Hypercorrection over a week. [10.3758/s13423-011-0173-y](https://doi.org/10.3758/s13423-011-0173-y)
- ✓ Cammeraat, Rop & de Koning 2020, Computers in Human Behavior 105:106203. Split attention not replicated.
- ✓ Deci, Koestner & Ryan 1999, Psychological Bulletin. Rewards and intrinsic motivation, meta-analysis. [10.1037/0033-2909.125.6.627](https://doi.org/10.1037/0033-2909.125.6.627)
- ✓ Dudukovic, Gottshall, Cavanaugh & Moody 2015, Memory. Testing in college students with ADHD. [10.1080/09658211.2014.977921](https://doi.org/10.1080/09658211.2014.977921)
- Summary only: Dunlosky, Rawson, Marsh, Nathan & Willingham 2013, Psychological Science in the Public Interest. Utility of ten techniques. [10.1177/1529100612453266](https://doi.org/10.1177/1529100612453266)
- ✓ Fiorella & Zhang 2018, Educational Psychology Review. Limits of learning by drawing. [10.1007/s10648-018-9444-8](https://doi.org/10.1007/s10648-018-9444-8)
- ✓ Höffler & Leutner 2007, Learning and Instruction. Animation vs static pictures, meta-analysis. [10.1016/j.learninstruc.2007.09.013](https://doi.org/10.1016/j.learninstruc.2007.09.013)
- ✓ Kasper, Alderson & Hudec 2012, Clinical Psychology Review. Working memory in children with ADHD, meta-analysis. [10.1016/j.cpr.2012.07.001](https://doi.org/10.1016/j.cpr.2012.07.001)
- Summary only: Knouse, Rawson, Vaughn & Dunlosky 2016, Clinical Psychological Science. Testing for college students with ADHD.
- ✓ Kornell & Bjork 2008, Psychological Science. Interleaving helps, learners think it does not. [10.1111/j.1467-9280.2008.02127.x](https://doi.org/10.1111/j.1467-9280.2008.02127.x)
- ✓ Marx, Hacker, Yu, Cortese & Sonuga-Barke 2021, Journal of Attention Disorders. Delay discounting in ADHD, meta-analysis. [10.1177/1087054718772138](https://doi.org/10.1177/1087054718772138)
- ✓ Metcalfe 2017, Annual Review of Psychology. Learning from errors. [10.1146/annurev-psych-010416-044022](https://doi.org/10.1146/annurev-psych-010416-044022)
- ✓ Pan & Rickard 2018, Psychological Bulletin. Transfer of test-enhanced learning, meta-analysis (d = 0.40). [10.1037/bul0000151](https://doi.org/10.1037/bul0000151)
- ✓ Pavlik & Anderson 2005, Cognitive Science. Activation model of spacing. [10.1207/s15516709cog0000_14](https://doi.org/10.1207/s15516709cog0000_14)
- ✓ (through a review) Ploetzner, Berney & Bétrancourt 2020, Journal of Computer Assisted Learning. When animation helps.
- ✓ Rawson, Vaughn, Walsh & Dunlosky 2018, Journal of Experimental Psychology: Applied. Successive relearning. [10.1037/xap0000146](https://doi.org/10.1037/xap0000146)
- ✓ Richter, Scheiter & Eitel 2016, Educational Research Review 17:19-36. Signalling meta-analysis.
- ✓ Roediger & Karpicke 2006, Psychological Science. Testing beats restudy after a delay. [10.1111/j.1467-9280.2006.01693.x](https://doi.org/10.1111/j.1467-9280.2006.01693.x)
- ✓ Sailer & Homner 2020, Educational Psychology Review. Gamification meta-analysis (small positive effects). [10.1007/s10648-019-09498-w](https://doi.org/10.1007/s10648-019-09498-w)
- ✓ Settles & Meeder 2016, ACL. Half-life regression.
- Summary only: Sundararajan & Adesope 2020, Educational Psychology Review. Seductive details. [10.1007/s10648-020-09522-4](https://doi.org/10.1007/s10648-020-09522-4)
- ✓ Tabibian et al. 2019, PNAS. Optimal spaced repetition. [10.1073/pnas.1815156116](https://doi.org/10.1073/pnas.1815156116)
- Summary only: Ye, Su & Cao 2022, KDD. FSRS's model. [10.1145/3534678.3539081](https://doi.org/10.1145/3534678.3539081)

The verified ones worth keeping should move into `docs/evidence.md` when a
recommendation is built on them.

## Questions for you

1. **Diagrams.** Go with the app drawing its own diagrams (B) as the main
   road, and cropping the real figure from your slides (C) as the fallback?
   Or only one of them first? I recommend both, B first.
2. **Learn.** May Learn ask "why" after reading, and move typing terms to the
   next day's review? It bends "no drastic changes to how it teaches". (The
   grade asked this too, as its question 7; still unanswered.)
3. **A short first sitting.** May Today open as about five minutes with
   "keep going", the full plan still counted?
4. **Where to start.** My order: the simulator's first two upgrades, then the
   short sitting and the tree's link to what fades, then diagrams. Or
   diagrams first, since that is what you raised?

## Decisions I made on my own

- Reviewed the work branch, not `main`, since it holds parts 1 to 4.
- Agreed with the grade's picks where they overlap (gap 3, rework 2) instead
  of re-arguing them, and added the evidence.
- Did not run the simulator: none of these recommendations exists as a
  policy yet, and its current form cannot score them (section 6).
- Said "no cheap tricks" rests on the rewards meta-analysis, since no study
  of streaks was found.
