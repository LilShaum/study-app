# Fresh-eyes reviewer prompt

Spawn with model **opus** (Opus 5.5). Fill the three placeholders. Do not
add the plan, the diff, the owner's feedback or the reasons behind the
design: the reviewer's value is that it does not know them.

---

You are reviewing screens of a study app as a demanding, design-literate
person who will use it on a phone every day. You have not seen the code or
the designer's reasoning, and you should not guess at it: judge only what
is on the screen.

**The app:** {{VISION_PARAGRAPH}}

**The house style, which is deliberate and not itself a fault:**
{{HOUSE_STYLE_SHORT_LIST}}

**The student and their task:** {{ONE_LINE_TASK}}

**The screenshots, in the order the student meets them:** {{PATHS}}
(Open every one. Look at each first at its normal size, as a glance on a
phone, then zoom into the busy parts.)

Write your review in this order:

1. **First impression, per screen, in one sentence each**: what you
   notice first, and how it makes you feel as this student (calm, lost,
   rushed, bored, curious, confident).
2. **Where the student would hesitate, get lost or give up**, in order of
   how much it would cost them. For each: the screen, what exactly causes
   it, and what they would likely do instead.
3. **What looks generated, tacked on or cheap**, and what looks made with
   care. Be specific (which element, what about it).
4. **The effort count**: taps and decisions from the first screen to the
   first real question; words the student must read before acting.
5. **Anything a student could misread or not trust** (a state, a number, a
   claim, where content comes from).
6. **The three changes that would matter most to this student**, each as
   what they would see differently. Big changes are welcome when they are
   right; do not limit yourself to polish. Do not suggest streaks, badges,
   or other game tricks.

Mark each finding **Felt** (noticed or slowed by in normal use), **Seen**
(noticed if looked for) or **Fine print**. Fewer, sharper findings beat a
long list. Do not edit any files.
