# Evidence behind the learning design

Arborous makes claims in its interface — that reviewing works better than
rereading, that a gap between sittings beats a block of them — and those
claims drive real behaviour: what Learn serves next, when an item is due,
how full a branch looks. This file is where those decisions cite something
checkable.

**The rule for this file: nothing goes in unless it was read from the source
itself.** A confident paragraph from a search-results summary is not a
citation, and the section on what could NOT be verified is as load-bearing
as the rest. It exists because the first pass at this research took a
figure from a web summary that attributed it to the wrong paper — see
"Attributed but not verified" below.

Sources retrieved from PubMed. DOI links are the primary record.

---

## Verified from the source abstract

### Testing beats restudying, and producing beats recognising

Rowland, C. A. (2014). *The effect of testing versus restudy on retention: a
meta-analytic review of the testing effect.* Psychological Bulletin.
[10.1037/a0037559](https://doi.org/10.1037/a0037559)

> "Key results indicate support for the role of effortful processing as a
> contributor to the testing effect, with **initial recall tests yielding
> larger testing benefits than recognition tests**."

**What it licenses in the app.** Two things.

First, retrieval outranks reading, which is the basis for treating the 50%
of a generated course that is definitions, examples and diagrams as a
problem rather than as content — see the `low-gradable` check.

Second, and more specifically: a **recall** test is a stronger learning
event than a **recognition** test. Multiple choice is recognition. Every
gradable item the app currently has is either an MCQ or a self-graded
flashcard flip, so nothing makes the student produce an answer from nothing.
That is the argument for typed-recall and cloze formats, and it is an
argument about *learning*, not only about matching the exam.

**What it does not license.** The abstract reports a direction, not a
number. Do not quote an effect size for the testing effect from this file.

### A gap helps, and the right gap depends on how far off the exam is

Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006).
*Distributed practice in verbal recall tasks: A review and quantitative
synthesis.* Psychological Bulletin.
[10.1037/0033-2909.132.3.354](https://doi.org/10.1037/0033-2909.132.3.354)

Scale, from the abstract: **839 assessments across 317 experiments in 184
articles.**

> "Analyses suggest that **ISI and retention interval operate jointly** to
> affect final-test retention; specifically, **the ISI producing maximal
> retention increased as retention interval increased**."

ISI is the inter-study interval — the gap between two sittings on the same
material. The retention interval is the gap between the last sitting and
the test.

**What it licenses in the app.** The scheduler cannot have one correct gap.
The interval that maximises retention *depends on when the exam is*, and
grows as the exam moves further away. So "how long until you need this"
is an input to scheduling, not a detail — which is why the app should ask
for an exam date rather than infer one, and why a single fixed ladder of
intervals would be wrong for a paper three months out and a quiz on Friday.

**What it does not license.** A specific ratio. See below.

### Interleaving helps with categories, not with words or prose

Brunmair, M., & Richter, T. (2019). *Similarity matters: A meta-analysis of
interleaved learning and its moderators.* Psychological Bulletin.
[10.1037/bul0000209](https://doi.org/10.1037/bul0000209)

Scale, from the abstract: **59 studies, 238 effect sizes, 158 samples.**

> "A multilevel meta-analysis revealed a moderate overall interleaving effect
> (Hedges' g = 0.42) … Results for studies using mathematical tasks revealed
> a small interleaving effect (g = 0.34), whereas **results for expository
> texts and tastes were ambiguous** with nonsignificant overall effects. **An
> advantage of blocking compared with interleaving was found for studies
> based on words (g = −0.39).**"

It also finds larger effects when categories are *similar to each other* and
the material is complex.

**What it licenses in the app.** Not what the old plan assumed. The plan was
to make Learn interleave sections instead of walking them in order. For this
app's material — terms and expository notes — the meta-analysis finds no
reliable benefit, and for words a reliable cost. So Learn keeps teaching a
section as a block. Interleaving is not the same thing as spacing: reviewing
old material later, mixed together, is spaced retrieval and is supported
above. What the similarity finding does support is narrow and targeted:
putting two *easily confused* items next to each other, which is what the
confusion pairs proposal does.

**What it does not license.** "Interleave everything", in either direction.

### Quizzing in real classes works, with feedback and repeats

Yang, C., Luo, L., Vadillo, M. A., Yu, R., & Shanks, D. R. (2021).
*Testing (quizzing) boosts classroom learning: A systematic and
meta-analytic review.* Psychological Bulletin.
[10.1037/bul0000309](https://doi.org/10.1037/bul0000309)

> "The current review integrated 48,478 students' data, extracted from 222
> independent studies … overall testing (quizzing) raises student academic
> achievement to a medium extent (g = 0.499). The magnitude of the effect is
> modulated by a variety of factors, including … test format consistency,
> material matching, provision of corrective feedback, number of test
> repetitions …"

**What it licenses in the app.** The testing effect holds up outside the
laboratory, in classes, at a medium size. That is the case for Learn asking
right after it teaches, not reading first and asking fifty cards later.
Feedback and the number of repeats are named as moderators, so a missed
question comes back in the same sitting with its answer shown.

**What it does not license.** The abstract names these moderators but gives
no direction or size for them. It gives no number for how many repeats,
and no evidence for any particular order of reading and asking.

### One correct recall is enough in a sitting, when there will be another

Vaughn, K. E., Dunlosky, J., & Rawson, K. A. (2016). *Effects of successive
relearning on recall: Does relearning override the effects of initial
learning criterion?* Memory & Cognition.
[10.3758/s13421-016-0606-y](https://doi.org/10.3758/s13421-016-0606-y)

> "Experiments 1 and 2 revealed that the substantial benefits of learning to
> a higher initial criterion during the first session do not persist across
> relearning sessions … if relearning is to occur, using extra time to learn
> to a higher initial learning criterion is not efficient. Instead, students
> should devote their time to subsequent spaced relearning sessions."

**What it licenses in the app.** Learn's stopping rule: an item missed in a
sitting comes back until it is answered right **once**, then leaves. Getting
it right three times in the first sitting buys nothing that lasts once
Review brings it back on later days. Review is the relearning session.

**What it does not license.** These were Swahili–English word pairs, which
is closest to the app's typed terms and furthest from its application
questions. It is also a single paper with two experiments, not a
meta-analysis.

---

## Attributed but not verified

These are claims I have seen stated confidently, and could not confirm from
a primary source I actually read. **They must not be used to set a constant
in the scheduler.**

- **"The optimal gap is 10–20% of the retention interval."** Widely
  attributed to Cepeda et al. 2006. It is not in that abstract, which gives
  the direction of the interaction and no ratio. The figure appears to come
  from a later experiment by an overlapping group, which is a different
  paper with a different evidence base, and the distinction matters if a
  number is going to be multiplied by a user's exam date.
- **d ≈ 0.71 for spacing over massing**, and **g ≈ 0.50–0.61 for testing
  over reading.** Plausible and frequently quoted; not read from source
  here.
- **Expanding intervals beat uniform ones.** Quoted as a Cepeda 2006
  finding. The abstract says expanding ISI effects "were examined" and does
  not state the direction in the text available here. Two single
  experiments by one group are the best found so far, and they disagree
  with the simple claim: an expanding schedule won in one
  ([10.1080/09658211.2014.944916](https://doi.org/10.1080/09658211.2014.944916)),
  and the follow-up found the advantage **only after weak initial learning,
  not after practice testing with feedback**
  ([10.3758/s13421-018-0815-7](https://doi.org/10.3758/s13421-018-0815-7)),
  attributing it to whether the earlier study is still retrievable at the
  next one. That points away from a fixed expanding ladder and toward
  spacing each item by how well *it* is currently remembered — which is what
  a stability model does. No meta-analysis found.
- **Segmenting a lesson into learner-paced pieces helps** (Rey et al. 2019,
  Educational Psychology Review, 10.1007/s10648-018-9456-4; reported as 56
  investigations, small to medium effects on retention and transfer).
  Found through search summaries only. The publisher and ERIC are blocked
  from this environment and PubMed does not index it. Learn's steps are
  **not** justified by this paper. They are justified by what was measured
  on a real course: runs of 37 definitions to read before any question,
  and recall arriving 50 to 60 cards after the reading it tests.
- **Pretesting / prequestions.** Reported as a large effect on the
  questions asked beforehand (g ≈ 0.54) and almost none on other material
  (St. Hilaire et al., 10.3758/s13423-023-02353-8). Also search summaries
  only. Even as reported, it helps only with the exact questions asked, so
  Learn does not ask before it teaches.
- **Practice tests beat restudying across many conditions** (Adesope,
  Trevisan & Sundararajan 2017, Review of Educational Research,
  10.3102/0034654316689306). Search summary only. Yang et al. 2021, above,
  covers the same ground and was read from source.

## Not yet searched

- Feedback in multiple choice: whether it reduces the risk that a student
  retains the lure they picked.
- Matching as a format. It is cheap to derive from the definitions a course
  already has, which makes it tempting — and that is exactly why it needs
  evidence before it is leaned on.

## A caveat about the search itself

PubMed indexes biomedical and life sciences literature. Educational
psychology sits at its edge: the two meta-analyses above are both in
Psychological Bulletin and are indexed, but a search for distributed
practice returned only two records in total, and a search for retrieval
practice returned an intensive-care symposium and a review of AI in primary
care among its top hits. Absence from these results is not evidence that a
literature does not exist.
