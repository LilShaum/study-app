# Prompt test on real lecture slides — 2026-09-27

**Setup.** Two real slide decks from the owner's course (two exam topics,
about 130 slides, most of the content inside figures). The course writer was
the model the owner uses day to day, given the in-app "New course" prompt
word for word and every page as an image, with no access to checks or
tools, as in a chat. A different model then graded each course against the
slides, and `scripts/audit-course.mjs` ran on both. The slides and courses
are not in this repo.

**Result.** Both courses were trustworthy. No MCQ had a wrong answer key (150
checked), no definition contradicted the slides, and every calculation
re-derived correctly. The correct option was the longest 15–42% of the time
(chance 25%, earlier baseline 55%), no stem cited the slides directly, and
every section had an application question. What was missing were 2–4 small
points per course, all inside unannotated figures. These were fixed by hand
in the courses handed back.

**Systematic problems, seen in both, now addressed in CLAUDE.md:**

1. *Inventory padding and a false coverage failure.* The prompt said to list
   every term, including figure labels, and not to define ones only named.
   The checker then failed the course for obeying. The inventory is now split
   into `terms` (explained) and `mentioned` (named only). The schema, the
   in-app coverage check and the CLI check all read the split.
2. *Definitions that make poor typed answers.* Symbols, descriptive phrases,
   headings, and zone/structure twins that read identically but accept
   different answers. Definitions are now for names a student could be asked
   to produce; the rest goes into the parent's definition or `related_terms`.
3. *Figure-sourced excerpts.* These are real but invisible to a text-layer
   check (29 and 88 "not found", all grounded). Excerpts from a figure,
   table or equation now start `Figure:`/`Table:`/`Equation:`; the checker
   lists them for checking by eye instead of failing them.
4. *Bullet lists turned into strict sequences.* This produced one card that
   taught a false order. Order questions are now only for orders the source
   gives.
5. *Items about the artwork.* Where a label sits, or values read to false
   precision off a small graph. Now excluded.
6. *Soft source-citing stems* ("shown", "listed for", "given in the
   lecture"), now named alongside the existing examples.
7. *Uniform density and redrawn figures.* Items per idea now scale with
   weight, and a `graphic` must beat the source's own figure.

**Checker fixes.** Greek letters are spelled out before comparing, since
"α cells" and "β cells" had read as duplicates. Figure-prefixed excerpts are
a warning, not a failure. Terms listed as `mentioned` are not expected to
have a definition.

**Not re-tested.** The new prompt wording has not been run on a fresh
generation. Next time a course is made, check that `mentioned` appears and
that the definition count drops without losing coverage.
