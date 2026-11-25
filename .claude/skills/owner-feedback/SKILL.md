---
name: owner-feedback
description: How to take in the owner's feedback, expectations and corrections on Arborous without misreading them or taking the easy path. Use EVERY time the owner gives feedback on something built or shown (a screenshot, a review page, a note on a feature), states how something should be, corrects a misunderstanding, or says "you didn't listen / you took the easy way". Use it before answering or building, even when the feedback looks small or obvious, and when reading notes the owner left on a review page.
---

# Taking in the owner's feedback

The owner, 2026-11-25: "we need to address how you have continuously
misunderstood me or taken the easy path when I ask shit of you and
completely ignore my expectations." They asked that every piece of feedback
be written down, what went wrong named, what they are asking restated in
my own words, and each expectation broken down to what it really means
rather than accepted as an adjective.

Why this exists: the same failure kept repeating. A question was read as an
instruction ("does the user try a question?" became "add a question", and
the general wording they suggested was ignored). A correction was
over-applied ("use a stronger model" became "the strongest AI on its
highest effort"). An adjective was met in the cheapest way ("realistic"
motion became leaves starting a little earlier, still one step after the
other). Each time the words were followed and the meaning was missed.

## The steps, every time

Do these before replying with a plan or building anything. Write the result
into `docs/FEEDBACK.md` (newest first) so it outlives the session, and add
the ask itself to `docs/ASKS.md` as usual.

1. **Quote it.** Copy the owner's exact words for each point, including
   the screenshot or item it is about. Several points in one message are
   separate entries.
2. **Is it a question, an instruction, or both?** A question ("does the
   user try a question?", "what does this mean?") gets an answer first; it
   is not permission to build. If they suggested a fix inside the question,
   that suggestion is part of what they asked.
3. **What went wrong** (when it is a correction): in one or two plain
   sentences, what I did and why it missed. Name the habit, not just the
   instance: misread a question as an instruction, over-corrected, took the
   cheapest reading of an adjective, changed something they had not asked
   about, dropped part of the ask, asked them something I could have
   decided or shown.
4. **What they are asking, in my own words.** Restate it as I would explain
   it to someone who has not seen the conversation, concrete enough that
   two people would build the same thing from it. If I cannot restate it
   without guessing, that is the question to ask, and nothing else is built
   on the guess.
5. **Break down every expectation word.** For each adjective or standard
   they use (intuitive, elegant, realistic, clean, not AI slop, high
   quality, concise, not overcomplicated, easy to miss), write:
   - what it means for this exact thing (what a person would see or feel),
   - how I would check it is met (a test, a screenshot, a timing, a read
     through as a student),
   - the cheap reading I must not settle for.
   Example: "realistic" for the falling leaves meant things overlapping as
   in life: leaves starting within a moment of the shake and still falling
   while it goes on, measured in the browser, not "start 0.2 s sooner".
6. **Check against what they already said.** Read the related lines in
   CLAUDE.md ("How the owner wants it to work") and the earlier entries in
   `docs/FEEDBACK.md` for the same feature. A new note never cancels an
   older one silently; if they conflict, say so and ask.
7. **Ripple it.** A standing rule ("motion is realistic", "review pages
   hold only what is unseen") becomes a dated line in CLAUDE.md. Then walk
   `docs/RIPPLES.md` for anything the feedback touches (Help,
   EXPECTATIONS, the prompts, tests), and the skills that cover the area
   (`arborous-design` for anything a student sees).
8. **Before saying it is done**, reread the entry: does what was built meet
   each broken-down expectation, checked the way step 5 said? Show it so
   the owner can see that, on the review page, item by item.

## How to reply while feedback is coming in

When the owner is sending feedback in pieces (one screenshot at a time, or
"don't start yet"), reply in a line or two: that it is noted, and a
question only if the point cannot be restated without one. Build nothing
until they say to start. Write each entry into `docs/FEEDBACK.md` as it
arrives, so nothing depends on memory of the chat.

## The entry format in docs/FEEDBACK.md

```
### 2026-11-25 · <the thing it is about>
**Their words:** "…"
**Question or instruction:** …
**What went wrong:** … (habit: …)
**What they are asking:** …
**Expectations, broken down:**
- *<word>*: means … / checked by … / not: …
**Rules and ripples:** CLAUDE.md line added? RIPPLES rows walked?
**Status:** noted / built (commit) / shown on the review page / confirmed by the owner
```
