# The owner's decisions (2026-10-11)

On `learn.md` and `classes.md`.

## Learn: build all of A–F

A and B go through the simulator first (both students; re-baseline and log in
`sim/FINDINGS.md` if the numbers move), then C–F. Ship each as it is done.

## Classes: build as sketched, with these answers

1. **Yes, as sketched:** the class page, Today for the class, Add a lecture,
   and the class exam dialog.
2. **Call them lectures.** Rename "course" to "lecture" in everything the
   student reads (New lecture, Add a lecture, "4 lectures", Help). Files
   stay `.study.json`; code names and storage keys stay as they are.
3. **Several exams per class, not one.** Most of the owner's classes have
   more than one test before the final (say Midterm 1, Midterm 2, Final). A
   class has a list of exams, each with a name, a date, and the lectures and
   sections it covers.
   - For scheduling, each lecture follows the **nearest upcoming exam that
     covers it**. Once a midterm has passed, its lectures move on to the
     next exam that covers them (usually the final), with no action needed.
   - Keep the scheduler's per-lecture model by deriving each lecture's
     `exam_date` / `exam_sections` from the list, so Today, Review and the
     library's list need no change.
   - The exam list must sync across devices and survive export and share
     links. Decide where it lives and say why in the handoff.
   - The class page shows the class's exams, the next one first.

## Order

Learn A–F first (it is what the owner's friend ran into), then classes.
