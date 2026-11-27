# The owner's feedback, broken down

Every piece of feedback the owner gives, newest first, taken in by the
`owner-feedback` skill (`.claude/skills/owner-feedback/SKILL.md`): their
words, whether it was a question or an instruction, what went wrong, what
they are asking in my words, and each expectation broken down into what it
means, how to check it and the cheap reading to avoid. Asks themselves
are also in `docs/ASKS.md`; standing rules in CLAUDE.md.

The entries before 2026-11-25 (late) were written afterwards, from the
conversation, as the first examples of the habits this file is meant to
stop.

### 2026-11-27 · The new diagrams, first try (preview of PR #7)
**Their words:** "I tried them out and they are a good start but I feel like
improvements could be made or maybe the examples just arent doing them
justice. id wanna know how they fair going through the tests we have to have
a student go through it and stuff"
**Question or instruction:** Both. A question (how do they do when a
student goes through them, by our tests?) and an implied instruction (make
them better; find out whether the examples or the design is the limit).
**What went wrong:** The preview showed the diagrams only on a made-up
lecture with three hand-written figures, so the owner could not tell the
design from the examples. (habit: shown on the cheapest example, not the
real case the ask came from.)
**What they are asking:** Judge the diagrams on real lectures (their
Language slides; ideally a diagram-heavy BIOL one), with a student task and
the fresh-eyes review, and with before/after proof of size; then show what
would make them better as two or three visual options to pick from.
**Expectations, broken down:**
- *"a good start, but improvements could be made"*: means the student
  should learn more from a diagram than from the slide's figure alone /
  checked by a fresh critic doing a timed task on a real lecture (can they
  explain the pathway after?) / not: polish to the boxes and arrows.
- *"the tests we have to have a student go through it"*: means
  taste-review with a real task and time limit, and scope-check's
  before/after / checked by both reports, shown / not: my own read of
  screenshots.
**Rules and ripples:** none yet; the options decide.
**Status:** noted; waiting on the Language lecture run.

### 2026-11-27 · The audit's cost
**Their words:** "I thought it did before? … generating a lecture based on
two sets of slides takes ~30 minutes. if you are making it do two checks now
of each slide … i worry about how it will affect course generating costs and
time. we have to make sure the prompt is as efficient as possible without
being to vague … and also without having parts that say opposite things …
Maybe do some looking into what goes into a good prompt and make sure your
sources are reputable".
**Question or instruction:** Both: a question (did it audit before?) and
an instruction (efficient, clear, consistent, researched from reputable
sources).
**What went wrong:** The first audit draft added a second walk over every
card. (habit: met a quality goal by adding work, without weighing its cost
on the owner's slowest step.)
**What they are asking:** Every prompt change pays for itself in time and
tokens; the prompt stays clear, specific and free of contradictions;
prompt choices rest on Anthropic's own guidance, cited.
**Expectations, broken down:**
- *efficient*: means no extra pass where the work can happen while writing /
  checked by word count of the prompt and an estimate of reply size (timed
  on a real lecture once approved) / not: "it's only one more section".
- *not vague, no opposite things*: means each rule stated once, where it is
  used, with its reason / checked by grepping for the old wording when a
  rule changes / not: a new rule beside an old one that half-says it.
- *reputable sources*: means Anthropic's prompting docs for the model the
  owner uses / checked by links in `docs/proposals/trust.md` / not: blog
  posts or memory.
**Rules and ripples:** trust.md section 4 rewritten; the second walk removed
from `prompts/generator.md`.
**Status:** built (no second walk); prompt-wide efficiency read-through
offered, waiting on the owner.

### 2026-11-27 · How a lecture's accuracy gets checked
**Their words:** "the thing is I already dont like that much that ai has to
be used to make the lectures but the prompt itself should already have some
checks or methods to ensure the lectures are audited properly. id go with B
thou if I had to choose. maybe see what the prompt already does before
adding new things" (B: fold the check into making the lecture, not a second
paste in a fresh chat).
**Question or instruction:** Instruction: no extra AI step for the
student; the audit belongs inside the generator prompt; read what the
prompt already does before adding.
**What went wrong:** I recommended a second AI pass, adding AI and a paste
for a student who already dislikes needing AI at all. (habit: answered a
trust problem with more of the thing the owner trusts least.)
**What they are asking:** The one prompt that makes a lecture must audit it
properly before handing it back, with a method, not a hope. Build on the
checks it has (the inventory, Pass 4, "Before you output") rather than
piling new rules beside them. Where the app can check without AI, it should.
**Expectations, broken down:**
- *audited properly*: means every card is checked against the slide it came
  from and every slide against the cards, by a method the AI follows step by
  step / checked by a lecture made with the prompt (Opus 5.5, high effort,
  once the owner OKs the usage) with the audit's slide accounting holding up
  against the deck / not: one more line in the end checklist.
- *see what the prompt already does*: means extend Pass 4 and checklist
  item 2 instead of a parallel section, and say what was there / checked by
  the diff of `prompts/generator.md` / not: a new block repeating old rules.
**Rules and ripples:** CLAUDE.md line (courses: the prompt audits itself,
no extra AI step). `docs/proposals/trust.md` phase 2 changed from a second
chat to an audit pass inside the prompt; the app reading the slides itself
(no AI) moved up.
**Status:** noted; building on branch `claude/project-thread-tckngc`.

### 2026-11-27 · Big asks answered with small fixes; taste

**Their words:** "an issue I faced a lot while working on arborous is
asking for big wider scoped macro updates changes and improvements to how
the app functions and feels, and then the ai goes and focuses on minute
fixes or changes that a user would barely notice"; "claude struggles to
understand human taste and what matters to a human".
**Question or instruction:** instruction: fix the process, skills
pre-approved.
**What went wrong:** on record: the grading session "kept focusing on the
smallest things that didnt matter" (2026-11-17); an overhaul reworked only
step 1 of New lecture (Testing 7); "realistic" became 0.2 s sooner; "no
made-up lecture" asked three times and kept each time (2026-11-26). Small
edits are safe and easy to verify, so they win by default, and nothing
checked the size of a change against the size of the ask. Screens were
judged by whoever built them, who reads them through what they meant.
(habit: cheapest reading of a big ask; the builder as the only judge.)
**What they are asking:** a big ask produces a change a returning student
notices at a glance, shown with before and after; an ask made before gets
a different approach; screens are judged by how a person feels using
them, not by whether the code is right.
**Expectations, broken down:**
- *macro*: layout, flow, hierarchy or what a screen is for changes /
  checked by: `scripts/compare-shots.mjs`, the named screens mostly
  "reworked" (over 20% visibly changed), and a sentence per screen on what
  a student notices / not: a long list of small fixes.
- *human taste*: judged by a reviewer that has not seen the code or plan,
  as a student with ADHD with 15 minutes / checked by: the `taste-review`
  report, every Felt item fixed before the owner sees it / not: the
  builder's own screenshots, or a list of fine print.
**Rules and ripples:** CLAUDE.md lines "Big asks get big changes" and
"Judged as a student, by fresh eyes", skill table; arborous-design's
Checking a change; RIPPLES row; docs/WORKFLOW.md.
**Status:** built (skills and scripts on claude/project-thread-dfsq36);
first taste review run on part 4's phone screens.

### 2026-11-26 · The first run should explain the tree in general, not through a made-up lecture

**Their words:** "I expressed several times that I don't want it to have a
specific example of making the user learn how it works through trying a
made up lecture, I wanted a more general explanation of the tree and what
its parts represent. How difficult would it be to fix this and how much
would it cost in usage?"
**Question or instruction:** a question (difficulty, cost), about a
correction that was missed.
**What went wrong:** it is on record three times: 2026-11-11 "no sample
lecture", Round 3 "why use a specific example?", Round 4 "make it a general
example … leaves grow when you learn a topic or concept". Each time the
words were changed and the water-cycle lecture, its named parts and its
questions were kept. (habit: answering the sentence quoted, not the ask
behind it; keeping what was built.)
**What they are asking:** the first run explains what the tree is and what
each part stands for (a branch is a section of a lecture, leaves are what
you have learned, falling leaves are what is fading, the ground keeps what
fell), in general terms, with no made-up topic, no part names and no quiz.
Still something to do and watch rather than read (2026-11-24): the student
touches the tree, sees a branch fill, sees leaves fall.
**Expectations, broken down:**
- *general*: no topic, no section names, no question anywhere in the first
  run; every sentence true of any lecture / checked by: reading every page's
  words and grepping the component for the old topic / not: renaming the
  water cycle's parts.
- *what its parts represent*: branch = section, leaves = what you learn,
  falling leaves and the ground = what fades / checked by: each said on the
  page where the student acts on that part / not: a labelled diagram to read.
**Status:** built 2026-11-27 (go-ahead given): sections numbered, no names, a
tap on a number studies it and its branch grows; checked on a phone and a
computer, light and dark, the tree's box identical across every state.
Waiting on the owner's look.

### 2026-11-26 · The other static blue marks

**Their words:** "make them go plain if you can't tap them. Or like just not blue I guess."
**What they are asking:** the practice test's "?" (marked to come back to) and the glossary's held letter, neither tappable, not blue.
**Status:** built: both in the text ink, the ? set bold so it still stands out; the picked answer in the test stays blue (a choice you tap).

### 2026-11-26 · The first run's tree feels laggier than a lecture's

**Their words:** "in the onboarding the tree felt more laggy than when in an
actual lecture. Does that have to do with it being on the preview or is it
with how the tree in the onboarding differs from the lecture ones?"
**Question or instruction:** a question; answered, the fix waits on the owner.
**Answer (measured, emulated phone at a quarter speed):** not the preview.
Sweeping is equally smooth in both (17 ms frames). The first run has short
freezes at moments a lecture has only once, on opening: each right answer
regrows the whole tree, "Skip ahead three weeks" draws the whole tree again
with the shake and the fall, and the change to the find page. The time is the
browser painting about a thousand paths at once, not the app's code. The
paper-filled leaves of round 2 (after the owner's test) make those moments
about two to three times heavier.
**What they are asking:** whether it is the preview or the first run's tree;
implied, that it should not lag.
**Status:** built 2026-11-27: the grain's images (turbulence filters with a
blend mode) were painted inside every leaf; now baked once into one picture
per theme and density (lib/usePaperFill), same look (leaf interiors measured
equal to the page in both themes). Emulated phone at a quarter speed: "Skip
ahead three weeks" longest freeze 1.3 s → 0.25 s; a branch growing 0.35 →
0.2-0.3 s; the change to the find page 0.7 → 0.45-0.55 s. Waiting on the
owner's feel on a real phone.

### 2026-11-26 · Review page round 2: all the leaves alike

**Their words:** "I didn't specifically mean the falling and on the ground
ones. I meant ALL of them, including the ones on the tree. The whole issue …
was literally that I hated how the falling leaves were not the same as the
ones on the tree … Now that I think about it though, if we make them not
filled in it may look weird when they are sitting on the tree with all the
overlapping lines. How about instead all the leaves are just filled in with
the same colour and texture of the background plus the vein."
**Question or instruction:** instruction, with the fix named.
**What went wrong:** I read "make the leaves line art" as applying only to
the moving and fallen leaves, because the standing ones already had a vein;
the point was one look for every leaf. (habit: narrowing an ask to the
literal subject of the sentence instead of the problem it described.)
**What they are asking:** every leaf, on the branch, falling and on the
ground, drawn one way: outline, vein, filled with the paper itself (its
colour AND its grain), so a leaf hides the lines behind it yet looks cut
from the same page.
**Expectations, broken down:**
- *the same*: a standing, a falling and a fallen leaf are indistinguishable
  apart from where they are / checked by: zoomed shots of each, both themes
  / not: the same outline with different fills.
- *colour and texture of the background*: the fill shows the grain, at the
  page's scale, not a flat patch / checked by: zoomed dark screenshot, the
  grain continuous through a leaf / not: fill with the flat bg colour (what
  standing leaves had, and why they "looked cheap" in dark).
**Status:** built (CourseTree's paper pattern, lib/usePaperFill): every leaf filled with the page's colour and grain, at the page's scale, outline and vein. Checked: a lecture's tree mid-fall and settled, zoomed, light and dark: standing, falling and fallen leaves alike, the grain continuous through them.

### 2026-11-26 · Review page round 2: blue means tappable; the first run's tree

**Their words:** "I'd say the blue could indicate that they are a
"hyperlink" like they are clickable. If that's the case then keep them
blue. If they are static on touch then make them plain. Also, in the
onboarding, the background branches still do not turn translucent until
like the third or fourth page … after you get the first question right and
the first branch grows leaves, they do not go translucent. I also really
don't like how the tree will like jump up when new text appears below it.
There are other smooth tree transitions in the onboarding so please go iron
out the remaining things … it may be more than just there."
**Question or instruction:** an answer (blue only on what can be tapped),
and two faults, with "go iron out the remaining things" meaning walk the
whole first run, not just the spots named.
**What went wrong:** (1) I kept every branch dark on the grow page because
of the earlier note "branches growing leaves aren't greyed out"; that note
was about the leaves growing, not about touching a branch. (habit:
over-applying an old note to a moment it was not about.) (2) The phone
layout centres the tree and the words together, so any change in the
words' height moves the tree. Never watched across page changes.
**What they are asking:** on every page of the first run, touching a branch
fades the others, as on a lecture; while a branch is growing its leaves,
the whole tree is in full ink (both notes kept). The tree stays exactly
where it is when the words under it change; it moves only by a deliberate,
smooth transition. Walk every page change and smooth any jump.
Blue: tappable things only. The tree's numbers open a section, so the
touched one stays blue; "fading" in the words under the tree opens nothing,
so it goes plain.
**Expectations, broken down:**
- *translucent from the first page*: touch on the grow page fades the rest /
  checked by: screenshot of a touch on the grow page / not: removing the
  full-ink moment while leaves grow.
- *no jump*: the tree's position is identical before and after any words
  change on a page / checked by: measuring the tree's box across every
  state of every page / not: animating the jump.
- *iron out the remaining*: every page-to-page change of the tree is a
  smooth transition or none / checked by: a list of each transition and
  how it moves.
**Status:** built. A touch fades the others from the first page; while a question is open and for 2.2 s after a right answer the tree rests in full ink, numbers away. The phone layout anchors the tree at a fixed place from the top, the words below it; on a computer the row has a fixed height; the install page keeps the tree (small) instead of dropping and redrawing it. Checked: the tree's box measured at every state of every page on a 390 and a 375 phone and a computer: it never moves; it changes size only in the animated shrink when the questions end. "Fading" under the tree, the step numbers and "(new section)" are plain; the rule is in the design skill.

### 2026-11-26 · Review page round 2: what grows leaves

**Their words:** ""Get a section right, and its branch grows leaves" … is
wrong … A branch does not grow leaves when a "section" is right. It grows
leaves when a question is answered correctly … the leaves grow on the
branch corresponding to the "section" … that the question answered
correctly belongs to."
**Question or instruction:** correction.
**What went wrong:** I swapped "part" for "section" mechanically, which made
a section the thing you get right. (habit: a find-and-replace fix without
rereading what each sentence now claims.)
**What they are asking:** the words say what happens: a question answered
right grows leaves on the branch of the section it belongs to.
**Status:** built: "Answer a question right, and its section's branch grows leaves." I reread every first-run line for what it now claims.

### 2026-11-25 · Who builds what, and how it is checked

**Their words:** "Build anything a student sees yourself, not with agents;
use Sonnet only for mechanical work (scripts, data, tests). Before calling
anything done, check it the way the owner tests: on a phone, zoomed in,
light and dark, scrolled to the bottom, trying several taps, and against
each expectation in its docs/FEEDBACK.md entry."
**Question or instruction:** instruction, standing.
**What went wrong:** I was about to hand the swipe motion and the paper
grain, both things a student sees and feels, to Sonnet agents as
"exact-spec work". (habit: treating a screen change as mechanical because
it can be written as a spec.)
**What they are asking:** every change a student sees or feels (layout,
words, motion, the tree, a control) is built by the session itself;
agents only write scripts, data, fixtures and tests. And "done" means
walked as the owner walks it: 390px phone, zoomed screenshots, both
themes, every long surface scrolled to its bottom, several taps in a row
(not one), then each broken-down expectation in its entry ticked off.
**Expectations, broken down:**
- *yourself*: no agent edits a component, a style or a word on screen /
  checked by: every agent's diff touches only scripts, tests, fixtures /
  not: an agent "just doing the CSS".
- *the way the owner tests*: phone first, zoomed, light and dark, bottom of
  every scroll, repeated taps / checked by: those screenshots exist for
  each item before it is marked done / not: one desktop screenshot.
**Rules and ripples:** CLAUDE.md "Use agents" line updated; HANDOFF unchanged.
**Status:** standing rule from now.

### 2026-11-25 · Testing 11: the enlarged tree that opens by accident

**Their words:** "This seems to me like a vestige of the first way to
interact with the tree. … is there any function in this pop up menu that
isn't available by default? … Does it serve some purpose I'm not aware of?
Does it do anything different? I accidentally opened it when trying to
navigate the page and also when I was trying to unselect some text … by
tapping somewhere else on the page, and instead of unselecting, I
accidentally opened this page." (screenshot: the lecture's tree in a sheet,
title, info and close buttons, "11 sections · 28 to review".)
**Question or instruction:** questions. Answer: it does nothing the page
can't. It is the same tree, larger, with the same branch picking, plus an
info card explaining the tree and the line "11 sections · 28 to review"
(both already on the page). It opens when a tap lands on the tree but not
on a number, which is why it opens by accident.
**What went wrong:** a leftover from when the tree could only be used
inside it; kept after the tree on the page became usable, and its tap
target catches stray taps. (habit: not removing what a change made
pointless.)
**What they are asking (likely):** remove it, or give it a real reason;
taps on the page must never open something unexpected. To confirm with
the owner when work starts; the info card's words may belong in Help.
**Lesson for every screen:** when a feature is replaced, remove what the
old way needed; a tap on empty space or a drawing should not open a new
layer.
**Status:** built (the owner: "remove it, and move its info card's wording into Help"). The sheet, its "navigate" mode and its caption are gone; a tap on the drawing picks the branch under it and opens nothing; the card's words are in Help, The tree. Checked: three taps on the lecture page's drawing on a 390px phone, light and dark: no dialog, no route change; tests for taps and Enter.

### 2026-11-25 · Testing 10: the paper texture stops partway down a sheet

**Their words:** "Also the fucking texture doesn't continue the whole way
through for no apparent reason. You have to really pay attention to when
you use the paper texture and when you don't and why." (screenshot: New
lecture on a phone, dark: the top of the sheet has the paper grain, from
"More" down it is flat.)
**Question or instruction:** a fault, and a rule to keep.
**What went wrong:** the grain is painted on a box only as tall as the
first screen (or on one part of the sheet), so a scrolling sheet runs out
of paper. Never checked by scrolling to the bottom. (habit: looking at the
first screen of a long sheet only.)
**What they are asking:** one surface, one material: wherever paper is
used it covers the whole surface, however far it scrolls; and a reason,
written down, for which surfaces are paper and which are not.
**Expectations, broken down:**
- *continues the whole way*: grain from top to bottom of every sheet,
  dialog and page, at any scroll position / checked by: screenshots at the
  top and bottom of the longest sheet, phone, both themes / not: fixing
  this one dialog.
- *pay attention to when and why*: a rule in the design skill naming which
  surfaces carry the grain and why, applied everywhere / checked by: every
  surface listed and matched.
**Lesson for every screen:** a material belongs to a whole surface; check
long, scrolling surfaces at their bottom, not only their first screen.
**Status:** built. The grain sits on a sheet's content (and the first run's), not on its scrolling box; the bottom bar lost its glass for solid paper; sticky rows, the status-bar band, flashcards, toasts and the resume note carry it; the filled preview box became a rule. Rule written in the arborous-design skill ("Which surfaces are paper, and why"). Checked: New lecture opened out to its longest, scrolled to the bottom, grain measured at top and bottom (same spread, light 3.2, dark 1.8); the bottom bar's grain matches the page's.

### 2026-11-25 · Testing 9: Diagrams on a phone, the row of sections

**Their words:** "My first instinct when testing the diagram feature on the
phone was that it feels too restrictive to have to tap "next" to go through
each diagram but then I noticed the scroll at the top. The design of it
needs to be fixed to be more intuitive. And reminder that intuitive doesn't
mean remove it or make it a more simple but less interesting way. I'm not
telling you to replace it with static buttons, I like the idea on paper but
it needs to be easy for the users to assume they can scroll it to see the
other diagrams. This involves figuring out why a student might struggle to
figure it out in the first place and then you can think of changes to make
to fix the issue." (screenshot: Diagrams, the sideways row of section names
under the count, the first underlined, the second cut off at the edge.)
**Question or instruction:** instruction, after all screenshots; the method
is part of the ask.
**What they are asking:** keep the sideways row of sections; make it
obvious at a glance that it scrolls and that it is how you move between
diagrams. First work out why a student misses it, then design from those
reasons.
**Why a student might miss it (to verify on the phone, then design from):**
- it reads as a heading or a line of text, not as something to move: the
  names sit like plain words with an underline, and its rule looks like a
  divider;
- the cut-off at the right edge is a hard clip that looks like a layout
  fault, not "more this way";
- nothing moves or hints on arrival; a phone hides scrollbars;
- it sits above the diagram, away from where the thumb and eyes are, and
  "Next" at the bottom offers the obvious way, so the row is never tried;
- it doesn't follow you: scrolling down the page, the row is gone, and
  moving between diagrams doesn't visibly move along it.
**Expectations, broken down:**
- *intuitive*: a student who has never seen the page would try swiping the
  row within seconds / checked by: the reasons above each answered by
  something on screen, and a fresh look at the phone screenshot / not: an
  instruction line ("swipe to see more"), not static buttons, not removing
  the row.
- *not simpler or less interesting*: keep the paper-like row and its feel;
  add cues that belong to the book look (a soft fade at the edge as paper
  continues, the current one centred, a glimpse of motion on arrival) /
  not: generic chips or arrows.
**Lesson for every screen:** when a control is hard to discover, list why
a student would miss it before changing anything, and answer each reason
with design, not text.
**Status:** built (docs/proposals/diagrams-row.md, option C). Each reason answered by the row: the section shown marked in the accent, a count on each name, a fade at whichever edge has more, a glide once on arrival, the mark following Next and swipes and the row scrolling to keep it in view, held at the top of the screen. Checked on a 390px phone, light and dark: arrival glide measured (0 → 56 → 0 px), Next six times across sections, a swipe back, a tap on a name, scrolled down (the row holds at the top on a short screen); no instruction line.

### 2026-11-25 · Testing 8: stray dots where the numbers sit (dark mode)

**Their words:** "On dark mode sometimes these dots where I assume the
labels for the branches appear are visible as tiny dots that you probably
missed on light mode." (screenshot: a lecture's tree in dark mode, about
ten faint dots circled around the crown, where the branch numbers appear.)
**Question or instruction:** a fault, after all screenshots.
**What went wrong:** with the numbers hidden, something of each number
(probably a hairline's round cap, or the dot at its end) still draws as a
speck; it shows against dark paper. Not caught: hidden states never looked
at zoomed in, in both themes. (habit: checking a state only in the theme
where faults hide.)
**What they are asking:** nothing of a hidden number shows at all, in
either theme.
**Expectations, broken down:**
- *nothing visible*: hidden means no pixels drawn / checked by: a zoomed
  screenshot of the hidden state, both themes, and a check that every
  number part is invisible / not: making the dot darker in dark mode.
**Lesson for every screen:** check hidden and resting states zoomed in,
in dark mode as well as light; dark paper shows specks light paper hides.
**Status:** built. The cause was the hidden hairlines: dashed down to nothing they still painted their round caps as dots. Hidden numbers and lines are now invisible as well as dashed off, with flat ends; the paper halo round each number (a flat patch on grained dark paper) is gone, the hairline stops short of its figure instead. Checked: the first run's and a lecture's tree zoomed, after the numbers went away, dark and light: no specks.

### 2026-11-25 · Testing 7: New lecture's step 2

**Their words:** "This is another relic I'm surprised you still kept after I
told you to overhaul the page. … No reason to have to explain this at all
let alone right here. If anything it belongs in help … it's honestly pretty
implied why the user needs to attach their notes. But also, the parts I
underlined as well as the circles part which is usually hidden in a drop
down are the only places that explicitly tell you to attach your notes. It
needs to be more explicit and part of the step. We do this by fixing the
step 2 titles. It's redundant that step 2 is titled the same thing as the
button right under it. The button should keep the name … but the title for
step 2 should be something like give the prompt and the lecture notes you
want to use to the ai. … Since ai has no taste, I hope … you take detailed
non specific to this example notes that are ripples to all the skills and
memory and stuff you have so future app building with ai will know to
consider these different things." (screenshot: step 2, "Why attach them to
the message?" open, the attach instruction underlined.)
**Question or instruction:** instruction, after all screenshots; plus
general lessons to record now.
**What went wrong:** the overhaul only touched step 1. Step 2 kept a fold
explaining why, and its heading repeats its button, while the one thing
the student must do (attach their notes in the same message) sits mid
sentence. (habits: an overhaul that only reworks what was added last;
explaining instead of making the step say it; a heading that names the
button instead of the student's task.)
**What they are asking:** step 2's heading says the whole task: give the
AI the prompt together with your lecture material (in one message); the
button keeps "Copy the prompt"; the "why attach" fold goes (to Help, if
anywhere).
**Expectations, broken down:**
- *explicit, part of the step*: the attach instruction is in the heading,
  not only in a sentence or a fold / checked by: reading only the step
  headings tells a student everything to do / not: bolding the sentence.
- *not redundant*: heading and button never say the same thing / checked
  by: compare each step's heading with its controls.
- *worded better than my example*: short, plain, the same meaning:
  prompt + notes, to the AI, together.
**General lessons:** written into `.claude/skills/arborous-design/SKILL.md`
("Screens a student works through") and the owner-feedback habits list.
**Status:** built. Step 2's heading: "Give the AI the prompt and your slides or notes, in one message"; its button "Copy the prompt"; the Why fold gone, its words in Help. Every step heading now reads as the task (1 "Choose what to make", 3 "Bring back the file it makes", its button "Upload the file"), set as a sentence, not a grey label; Add material's two steps the same. Checked: New lecture on a 390px phone, both themes, top and bottom.

### 2026-11-25 · Testing 6: the AI-picks-the-kind option was removed

**Their words (screenshot):** "you fucking removed the option that I
specifically asked you to add just because I said the way you first
implemented it was ugly." **On the review page:** "I never asked you to
remove it, circling it in red didn't mean that either, it was to show you
specifically what I'm talking about. I specifically asked for that feature,
I was telling you it LOOKED ugly, not to remove it. Why remove the feature
I specifically asked for after I called it ugly instead of redesigning how
the button looks or is positioned, especially after I specifically asked
you to give that whole menu a good look and overhaul it. … Remove the
shitty explainer line under the ticking of types. I have told you a million
times, this needs to be intuitive and elegant design that makes the user
understand how it works without needing to put shitty ai explainer text.
And if it's about the specifics of how the prompt works or whatever, save
that shit for the help area where you can explain how it decides."
**Question or instruction:** instruction, after all screenshots.
**What went wrong:** "looks ugly" was read as "remove it". All boxes ticked
does give the AI the choice in the prompt, so I folded the option into the
boxes and replaced the visible choice with a line of explainer text, which
both removed a control they asked for and added the kind of text they keep
asking me to stop writing. (habits: a complaint about looks treated as a
complaint about the feature; the easy path of deleting instead of
redesigning; explainer text in place of a clear control.)
**What they are asking:** keep both ways of choosing, visibly: let the AI
choose the kinds that suit the material, or tick exactly the kinds I want.
Redesign how that choice looks and sits so it is clear without words under
it. No explainer line on the screen; how the AI decides goes in Help.
**Expectations, broken down:**
- *feature kept*: a visible, named choice between the AI choosing and
  only the ticked kinds / checked by: both reachable in one tap / not:
  "all ticked means the same".
- *intuitive and elegant, no explainer text*: the controls say what they do
  by their labels and layout alone / checked by: a new student can tell
  what happens in each case without reading a sentence below / not: a
  smaller or greyer explainer line.
- *how it decides goes in Help*: a short Help passage on what the AI does
  with each choice / checked by: Help has it / not: on the screen.
**Status:** built (docs/proposals/new-lecture-screen.md, option C): "The AI chooses" and "Only these" over the boxes, which stay in view (quiet and ticked when the AI chooses; touching one moves to Only these). No line under them; how the AI decides is in Help. Checked on a phone, both themes: tap a box (moves to Only these, 8 ticked), another (7), The AI chooses (9, quiet), Only these (9); tests for each.

### 2026-11-25 · Review page notes (left on the page)

**Swipes:** "I like the little testing you did. If possible make the
transition from one to the next page more smooth. Right now it looks like
you swipe halfway and when you let go it just jumps to the corresponding
page." Keep swiping. *Smooth*: the card carries on moving the way the
finger sent it and the next card slides in from the side, one continuous
motion / checked by: a recording at full frame rate / not: a shorter jump.
**Reminders and settings:** "we need a settings area for all this kind of
shit to live. It's not okay that settings are just openly available. It's
unclean and creates clutter, and it's disorganized and makes it hard for
the user to find where to go to change settings. Things like light mode
needs to go there, changing their username goes their, notifications, help,
changing your email associated with your account, changing your password,
everything like that." A real Settings place: theme, name, reminders,
Help, account email and password (and so on), out of the open pages / not:
a heading on the student's page. (Joins Testing 5.)
**The first run's words:** "this is a fucking lie I ran through it and on
several occasions it will refer to random topic names like evaporation.
Not even "the evaporation section" to help the user learn about sections,
it's just referred to as "Evaporation"." What went wrong: I changed the
headings and told them no line names a part, but the question's label and
the find page still say a bare part name. (habit: claiming done without
walking the whole flow.) Ask: no bare topic names; where a part must be
named, say it as a section ("the Evaporation section") so the student
learns the word.
**Falling leaves:** "The leaves that fall look completely different than
the leaves on the tree and the leaves on the tree very frequently aren't
attached/touching any branch … free floating, looks shit and unclean, and
not elegant." (Joins Testing 2 and 4.)
**Icon:** "This is good it's what I asked for but … I saw you made a whole
bunch of other designs and wonder what that was all about … I never asked
for more designs so why were they made initially." Answer: the ask was to
update the icon without a design named, so I drew options to choose from;
that should have been a question first.
**Dark paper, Figure 1.:** approved earlier ("assume anything I didn't
mention was good"). Lesson: don't present as new what they already passed.
**Anything else:** "Don't start updates yet."
**Status:** swipes built (one motion, measured frame by frame: the page leaves at the finger's speed and the next arrives at that speed, no frame over 40 px; a short drag settles back; a vertical drag scrolls); Settings built (Testing 5); first run's words built: every section named as "the Evaporation section", and "part" is "section" throughout the first run; falling leaves built (Testing 2, 4). Icon and dark paper: answered, nothing to build.

### 2026-11-25 · Testing 5: the name field under the name on your page

**Their words:** "I really don't like the design choice here of having the
name at the top and then "your name ________" right under it. The part
under looks like it would be better as a setting to change the username,
but on any app that has this kind of setting, it's not usually right there
under the name and you have to enter user settings or something to edit
your profile details. Clutter and also looks redundant because the name
just repeats twice … it does not belong here by default, it is a setting to
change the username." (screenshot: the student's page, dark.)
**Question or instruction:** instruction, after all screenshots.
**What went wrong:** the page shows the name as its title and again as an
always-open field right beneath it. (habit: putting an edit control where
something is displayed, so it reads twice and looks unfinished.)
**What they are asking:** the page shows the name once. Changing it is a
setting, reached the way apps usually do it (a settings or edit-profile
place), not a field sitting on the page.
**Expectations, broken down:**
- *not redundant / not cluttered*: the name appears once at the top; no
  open field on the page by default / checked by: the page at phone size,
  both themes / not: shrinking or restyling the field in place.
- *like other apps*: a clear way into settings (with the name among
  them), as a student would expect to find it / checked by: can a new
  student find where to change their name without being told / not: a
  hidden tap-the-title trick with no sign it exists.
**Ripples:** the first run's name page sets it (stays); EXPECTATIONS (the
student's page); Help mentions of "your page"; reminders and sync sections
may belong in the same settings place (to think through, not assume).
**Status:** built (docs/proposals/settings.md, option A): a Settings page with the name, Light/Dark/Match this device, reminders, the account (sign in, sync, change email and password, sign out), backups and Help; the foot of every page holds only your page and Settings; your page shows the name once. Checked on a phone, both themes, scrolled to the bottom, the theme tapped four times; the signed-in side by tests only (no test account on the real project).

### 2026-11-25 · Testing 4: falling leaves look different and cheap

**Their words:** "both have different falling leaves that the ones on the
trees, the ones on the trees have a line in the middle but the falling ones
don't. Furthermore, this is more apparent on the dark mode ones but the
colour they are filled in really makes them stand out and look cheap
against the background. My suggestion is to make the leaves not filled with
any colour so they are line art like the trees and so the background can be
seen through them. And also put a line in the middle for a vein like the
ones on the tree." (screenshots: the fade page, light and dark, falling and
fallen leaves circled.)
**Question or instruction:** instruction with a suggested fix, after all
screenshots.
**What went wrong:** the falling and fallen leaves are drawn without the
vein the standing leaves have, and filled with a colour that reads as a
pasted shape on the page, most of all in dark mode.
**What they are asking:** falling and fallen leaves drawn as the same line
art as the tree: the same outline, the same vein, no fill, the page showing
through.
**Expectations, broken down:**
- *same as the ones on the tree*: same outline weight and vein, so a leaf
  looks like the one that just let go / checked by: a falling leaf beside a
  standing one, zoomed, both themes / not: adding a vein but keeping the
  fill.
- *not cheap, background seen through*: no fill at all on moving and
  lying leaves / checked by: dark mode screenshot / not: a fill nearer the
  background colour.
- *both themes*: light and dark checked / not: dark only.
**Note:** standing leaves are filled with the page colour so the wood
behind is hidden; that stays unless the owner says otherwise.
**Status:** built: falling and fallen leaves are the tree's line art, outline and vein, no fill, the page showing through; the ground's leaves spread a little wider so the outlines don't tangle. Standing leaves keep their paper fill (it hides the wood behind them). Checked: mid-fall and settled, light and dark, zoomed.

### 2026-11-25 · Testing 3: the find page's colours and highlighting

**Their words:** "The first branch touched turns blue and doesn't switch to
the one you are touching … the one you touch does actually change as shown
by the 4 which seems perhaps bigger or bolded compared to the numbers on the
right, but then you have the 6 at the top which stays blue no matter what
and then the 2 on the left randomly is black instead of the same as the
others which makes it so much more confusing what is supposed to be what
colour. … branch 4 is the one being touched yet the branch that it is
sitting on (branch 2) is not turning translucent like I thought I
established it should be, making it unclear which branch is highlighted and
what is part of the branch I'm touching. Also on branch 2 we see many more
floating leaves near the bottom."
**Question or instruction:** faults to fix, after all screenshots.
**What went wrong:** (1) the number states are muddled: one stays blue
from the first touch, the touched one only grows a little bolder, and one
is black for no reason a student can see. (2) Their note on the grow page
("branches growing leaves aren't greyed out") was applied to the whole first
run (`noDim`), so on the find page the other branches no longer fade and
the touched branch can't be told from the one it grows on. (habit:
over-applying a correction beyond the screen it was about.) (3) More
floating leaves, on branch 2.
**What they are asking:** when sweeping, exactly one branch is clearly the
touched one: its number marked one way, every other number the same, and
every other branch (including the one it grows from) faded. No leftover
marking from an earlier touch. Every leaf on a twig.
**Expectations, broken down:**
- *clear which branch is highlighted*: one marked number and one solid
  branch at a time, the rest faded / checked by: screenshots of three
  successive touches on a phone, each showing only the current one marked
  / not: making the blue bolder.
- *same colour for the same state*: every number not touched looks
  identical; any difference must mean something the student can learn /
  checked by: listing each number's style in each state / not: leaving a
  "visited" or "in leaf" style the student was never told about.
- *translucent like established*: the fading that the lecture page uses
  when a branch is picked, here too; only the grow page keeps all branches
  dark / checked by: the find page with a branch touched / not: removing
  noDim everywhere and greying the grow page again.
**Status:** built. Numbers: every one in the same ink but the one under the finger, in the accent and larger; a branch's state is never a colour on its number. The find page fades the other branches as a lecture does (only the grow page keeps them dark). Checked: three successive sweeps onto three branches on a 390px phone, light and dark: each time one marked number, the words naming the same section, and only two inks among the numbers.

### 2026-11-25 · Testing 2: leaves floating in the air

**Their words:** "Examples of leaves floating in the air" (screenshot: the
first run's "The more you learn, the fuller the tree", two circled spots
where leaves hang off the branch tips with no branch under them).
**Question or instruction:** a fault to fix, after all screenshots.
**What went wrong:** leaves are placed past or away from the twigs that
should carry them, so some sit in empty air. Not caught because the tree
was looked at as a whole, not leaf by leaf at phone size.
**What they are asking:** every leaf visibly attached to a twig; no leaf
drawn where there is no branch.
**Expectations, broken down:**
- *not floating*: each leaf's base touches a twig or a branch's end /
  checked by: a check on the tree's geometry (each leaf's base within a
  small distance of a branch path) plus a zoomed look at the first-run tree
  and a lecture tree on a phone / not: nudging the two circled leaves.
**Status:** built: every leaf grows from the nearest point of its section's twigs, pointing to where the clump wants it (no draw from the seeded stream, so trees keep their shape). A test checks every leaf's stalk on its section's wood over eight trees (worst gap now under 0.8 units; it was 15.7), and fails without the fix. Checked zoomed on the first run's and a lecture's tree.

### 2026-11-25 · Testing 1: the first run's find page, the blue number

**Their words:** "Why does the number first branch touched turn blue? And
it never changes no matter how much I touch the other branches? Is there a
functional reason?" (screenshot: 1 in blue, "That's Rivers.")
**Question or instruction:** question. Answered; fix waits for "start".
**What went wrong:** the blue is meant to follow the finger (it marks the
part the line names), but on their phone it stuck on the first branch
touched. Not checked by touching more than one branch on a real phone.
(habit: testing one touch, not the way a student plays with it.)
**What they are asking:** whether the blue means anything, and why it
stays on the first branch.
**Status:** answered and fixed with Testing 3: the blue was the fading colour, not the touch; numbers no longer carry a state colour.

### 2026-11-25 · How feedback is taken in

**Their words:** "we need to address how you have continuously
misunderstood me or taken the easy path when I ask shit of you and
completely ignore my expectations. I need you to create a skill or commit
to memory that whenever I give you feedback on something and explain
expectations, you mark them down, write what you did wrong, write what I'm
asking, all in your own words … and then going through my expectations and
don't just accept them as adjectives but break down each one and see what I
really mean and want from you when I say them. This probably applies to
memory and notes you already keep or skills you already use so update them
accordingly with the ripple idea."
**Question or instruction:** instruction; the build (from their testing
screenshots) waits until they have shown all of them and say to start.
**What went wrong:** across this session, words were followed and meaning
missed: a question read as an instruction, corrections over-applied,
adjectives met in the cheapest way (entries below). (habit: no step
between hearing feedback and building where the meaning was checked.)
**What they are asking:** a fixed routine, written where every session
finds it, run on every piece of feedback before acting: record it, name
the mistake, restate the ask in my words, and turn each quality word into
something concrete and checkable. And the same routine wired into the
notes and skills that already exist, so none of them still works the old
way.
**Expectations, broken down:**
- *mark them down*: written in the repo, not only in chat or a task list,
  so a new session sees them / checked by: an entry here per point / not:
  "noted" in a reply.
- *in your own words*: a restatement concrete enough to build the same
  thing from / checked by: it does not repeat their sentence back / not: a
  paraphrase that keeps their adjectives unexplained.
- *don't just accept them as adjectives*: each quality word gets a meaning
  for this thing, a check, and a named cheap reading / checked by: the
  three parts present for every word / not: "made it more intuitive".
- *with the ripple idea*: CLAUDE.md, HANDOFF, ASKS, RIPPLES and the skills
  that touch feedback all point to this / checked by: grep for the skill's
  name in each / not: a skill nobody is told to load.
**Rules and ripples:** CLAUDE.md (skill table and "How to work here"),
HANDOFF §7, ASKS (header and entry), RIPPLES (new row), arborous-design
(points here for UI feedback).
**Status:** built 2026-11-25. For now: replies to the owner stay to a line
or two, and nothing is built, until they have shown every testing
screenshot and say to start.

### 2026-11-25 · Review pages and questions

**Their words:** "make it only the things I haven't given you feedback
on/seen yet and make sure you include any info or questions in that
document … do not overcomplicate things for me, do not bombard me with
information, do not go so concise and context deprived that I'm not sure
what you are referring to, make it intuitive to go through, make it so it's
not easy to miss details."
**Question or instruction:** instruction.
**What went wrong:** the page grew round after round, with old versions
kept beside new ones and the questions split between chat and the page.
(habit: adding instead of replacing; leaving the reader to work out what
is current.)
**What they are asking:** one page that shows only what they have not seen,
each thing as it is now, every question and decision on the page beside
the item it is about.
**Expectations, broken down:**
- *not overcomplicated*: one question per decision, plainly asked, with
  the choices named / checked by: each question answerable in a word or a
  line / not: several sub-questions or jargon.
- *not bombarded*: only what is new or needs them; no history of how it
  got there unless it explains the change / not: every round kept.
- *not context deprived*: each item says what it is, what changed and
  where to look without needing the chat / checked by: reading one item
  alone / not: "as discussed", "Round 4-2".
- *intuitive, not easy to miss details*: items numbered, the one needing an
  answer marked as such, decisions taken alone listed under their item /
  checked by: a skim finds every question.
**Status:** built (the review page, its notes boxes); rule in CLAUDE.md.

### 2026-11-25 · Swipes: "I can't give you an answer … unless I can test it"

**Their words:** "I can't give you an answer for shit like swiping unless I
can test it myself or if you can show me a demonstration."
**What went wrong:** I asked them to decide on a feel they had no way to
try. (habit: asking for a decision without giving what is needed to make
it.)
**What they are asking:** anything that is a matter of feel comes with a
way to feel it: a build they can open on their phone, or a recording.
**Status:** built (the preview artifact, the swipe recording).

### 2026-11-25 · New lecture's "What suits my material / Only the kinds I tick"

**Their words:** "it looks ugly and low effort. That whole screen honestly
needs some reorganization especially after tacking on new things. It needs
to be a lot more intuitive without losing function."
**What went wrong:** each new option had been added in its own style on
top of the last. (habit: tacking on instead of fitting into the whole.)
**Expectations, broken down:**
- *intuitive*: every control says what it decides; a new student can tell
  what to do in each row / checked by: reading the screen as a first-time
  student / not: a two-way choice that hides the boxes behind it.
- *without losing function*: every earlier option still reachable /
  checked by: a list of the options before and after.
**Status:** built (rows: Class, Make, Also, More).

### 2026-11-25 · Leaves falling during the shake

**Their words:** "I want it to seem realistic rather than a step by step
animations … very soon after it starts shaking the leaves should start
falling and continuing to do so while the shake continues."
**What went wrong:** the first fix only moved the start earlier, and never
measured; the real cause (the drawing-on rule holding the leaves) was
found only after the second note. (habit: cheapest reading of an
adjective, no measurement.)
**Expectations, broken down:**
- *realistic*: overlapping motion, as a shaken tree: leaves let go one by
  one during the shake / checked by: timing in the browser when the shake
  starts and when each leaf moves / not: one animation starting after the
  other ends.
**Status:** built; measured (shake at 1.79 s, first leaves moving 2.00 s).

### 2026-11-25 · The first run's "does the user try a question?"

**Their words:** "does the user go through and try a question or
something? otherwise the studying two parts screenshot … lacks context. …
why not just write something like leaves grow when you learn a topic or
concept."
**What went wrong:** I read the question as an instruction to add a
question and kept the specific wording they had asked me to make general.
(habit: question read as instruction; part of the ask dropped.)
**What they are asking:** an answer to whether the student tries a
question, and words that explain leaves in general, with no part names.
**Status:** built (general words; the question per part kept, said on the
review page).

### 2026-11-25 · The copy step's model advice

**Their words:** "this is too far the other way now. we dont want them using
fable 5.2 on ultracode effort … it should just be a general suggestion like
for best results, use a more capable model on high effort."
**What went wrong:** asked to suggest a stronger model, I wrote "the
strongest AI you can use, on its highest effort". (habit: over-correcting.)
**Status:** built.
