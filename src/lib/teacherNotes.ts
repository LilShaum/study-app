/**
 * The student's notes on what their teacher said matters, handed to every
 * prompt for a lecture (new, add material, more practice, fix).
 *
 * The generator judges importance from the source alone, and a slide cannot
 * say that the teacher called its table "just to illustrate" or told the
 * class to know a pathway by heart. Only the student heard that. Kept on the
 * lecture (metadata.student_notes), so it is written once and travels with
 * every later prompt for it.
 */
export function teacherNotesBlock(notes: string | undefined): string {
  const text = notes?.trim();
  if (!text) return '';
  return `════════ WHAT MY TEACHER SAID ════════

These are my own notes from class about what matters. They outrank your
judgement of what is examinable. Where they say something does not need to
be memorised, write no items on it (list its terms under
inventory.mentioned). Where they say something must be known, cover it fully,
even if it looks like an illustration. Slide and page numbers refer to my
source material.

${text}

`;
}
