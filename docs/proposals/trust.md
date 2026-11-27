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
5. **What the AI left out or doubted never reaches the student.**
   `notes_for_student` and `unclear_figures` are shown in the lecture
   check's lower groups; a student opening Learn never meets them.

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

## 4. The pick

**C, then A, then B, with E folded into C.** C is the foundation and cheap,
and alone it makes the big failure (a skipped slide) visible. A is the only
option that catches a wrong fact on any source, which is the failure that
does real harm; its friction is one paste, offered once after a lecture is
made, never required to study. B is the strongest proof but the narrowest
reach and the most code, so it waits until A and C have shown what real
lectures need.

What the student sees, all together: after making a lecture, one line on
its page, e.g. **"Checked against your slides: 42 of 42 slides covered,
208 of 214 cards confirmed, 3 held back for Fix."** Each card shows its
slide ("slide 12") on its "From your notes" line. A held-back card is out
of study until fixed, the way Set aside "wrong" already works. A lecture
nobody checked says so plainly, without nagging.

## 5. Build plan

**Phase 1 (C + E).** Schema: optional `source_page` on items, optional
`metadata.source_map` (`[{ page, title?, covered_by?: sectionId, skip?:
reason }]`). Prompt: one short section in Pass 2 and the output contract,
excerpts quoted word for word where the slide has text, plus the same
fields in Add and Fix. App: the slide on `SourceNote`'s line; a lecture
check finding for holes in the map and for slides with no section;
`notes_for_student` and unclear figures shown on the lecture's page, not
only in the check. Tests, EXPECTATIONS, RIPPLES row, What's new.

**Phase 2 (A).** `buildCheckPrompt.ts`, a compact card list and a strict
reply format; import of the reply (`lib/checkReply.ts`, Zod, bounded,
untrusted input); a `checked` mark per item and per lecture; wrong cards
set aside as "wrong" with the slide's version, so Fix rewrites them. The
lecture page line above.

**Phase 3 (B).** Local PDF/PPTX text, verbatim lookup, page per card. Decide
after phase 2 is used on real lectures.

**Proof before trust.** A real lecture made with the new prompt on Opus 5.5
at high effort (the owner's way, `CLAUDE.md`), read for whether the slide
map and pages are right, before the app relies on them. Then the check
prompt run on it in a fresh chat, with one planted wrong card, to see it
caught. Both cost the owner's usage, so they wait for a yes.

## 6. Questions for the owner

1. Is one extra paste after making a lecture acceptable for the check, or
   should it be folded into making it (cheaper for the student, weaker,
   since it is the same chat)?
2. Can a real lecture's slides be used to test (kept off the repo, as
   always)?
