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
**Status:** noted; to fix after all screenshots.

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
**Status:** noted; to fix after all screenshots.

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
**Status:** noted; to fix after all screenshots.

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
**Status:** noted; to fix after all screenshots.

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
