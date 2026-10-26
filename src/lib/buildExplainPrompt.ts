import type { Course, StudyItem } from '@/schema/course';
import { sortedSections } from './sortedSections';
import { freshIdPrefix } from './idPrefix';
import { EXPLAIN_SPEC } from './generatorSpec';
import { teacherNotesBlock } from './teacherNotes';

/** Enough of a section's questions to show what its explanations prepare for. */
const MAX_QUESTIONS_PER_SECTION = 60;
const MAX_EXCERPTS_PER_SECTION = 40;

function questionOf(item: StudyItem): string | null {
  if (item.type === 'mcq') return item.question;
  if (item.type === 'flashcard') return item.front;
  return null;
}

/**
 * Builds the prompt that gives a lecture made before explanations existed
 * its `explain` cards, without regenerating it.
 *
 * Learn taught terms, worked examples and pictures, and left every
 * connection between ideas (the mechanism, the why, how one slide leads to
 * the next) to the questions, asked cold (2026-10-26). A student who never
 * went to the lecture met those connections first as a wrong answer. The
 * questions each section asks are listed, because they are what its
 * explanations must prepare the student for; the reply holds explanations
 * only, merged into the sections by id, and Learn shows each just before
 * the cards on it.
 *
 * Pasted into the chat that wrote the lecture, the model has the slides and
 * writes from them. Elsewhere it falls back to the source excerpts the
 * lecture's items recorded, as More practice does.
 */
export function buildExplainPrompt(course: Course, notes = course.metadata.student_notes): string {
  // A section the student set wholly aside is not asked about.
  const sections = sortedSections(course).filter((s) => s.items.some((i) => !i.set_aside));

  const sectionBlocks = sections
    .map((s) => {
      const live = s.items.filter((i) => !i.set_aside);
      const explained = live.filter((i) => i.type === 'explain').map((i) => `    - ${i.title}`);
      const terms = live.filter((i) => i.type === 'definition').map((i) => i.term);
      const questions = live.map(questionOf).filter((q): q is string => !!q);
      const shown = questions.slice(0, MAX_QUESTIONS_PER_SECTION);
      const excerpts = [...new Set(live.map((i) => String(i.source_excerpt ?? '').trim()).filter(Boolean))].slice(
        0,
        MAX_EXCERPTS_PER_SECTION,
      );
      return [
        `### Section "${s.id}" — ${s.title}${s.source_range ? `  (${s.source_range})` : ''}`,
        '',
        terms.length ? `  Terms it defines: ${terms.join(', ')}` : '  Terms it defines: (none)',
        '',
        '  What it asks:',
        shown.map((q) => `    - ${q}`).join('\n') || '    (nothing yet)',
        questions.length > shown.length ? `    (…and ${questions.length - shown.length} more)` : '',
        '',
        ...(explained.length ? ['  Already explained, do not write these again:', ...explained, ''] : []),
        '  Source material its items were written from:',
        excerpts.map((e) => `    • ${e}`).join('\n') || '    (none recorded)',
      ]
        .filter((line, k, all) => line !== '' || all[k - 1] !== '')
        .join('\n');
    })
    .join('\n\n');

  return `I want EXPLANATIONS added to an Arborous lecture I already have. Its
questions are fine; what it lacks is the teaching before them. I may never
have been to this lecture, so the connections the teacher made out loud
(why something happens, how one slide leads to the next, what makes two
things different) reach me only as questions I get wrong.

**If this conversation still has my slides or notes for this lecture, write
from them: they are complete.** If it does not, use the source material
listed under each section below, which my lecture's items quoted from the
slides. Either way, every sentence must be something that material says or
shows.

What I want back: \`explain\` items only, no other type. One for each key
idea a section's questions turn on that its terms alone do not teach: a
mechanism, a cause and effect, a comparison, a principle and its reason, a
list whose items each mean something. A key idea is one the slides build
toward: an objective, a slide title, a summary slide, a bullet the next
slides lead from. A section of plain terms needs none, so leave it out;
most sections need one to three. Read each section's questions to see what
its explanations must make sense of, but teach the idea, never a question's
answer as a fact to remember.

Ground each one: its \`source_excerpt\` quotes the passage it explains.
Where the slides only name a study or a figure and you fill in what it
showed from your own knowledge, start the excerpt with "Outside the
slides:" and name the source, and write it only if you are sure.

Where the rules at the end say "part 2's table", they mean the key ideas
above; where they say "obligation 1", the paragraph just above.

Return ONLY JSON in this shape, compact (each item on one line of its own),
holding only the sections you add to:

{
  "sections": [
    { "id": "<one of the section ids below>", "items": [ /* explain items */ ] }
  ]
}

Every item needs an \`id\` starting with "${freshIdPrefix(course, 'exp')}" (no id in the
lecture starts that way, so none can collide). The app places each
explanation in Learn just before the cards that ask about it, so write
its title and text in the words those cards use.

════════ HOW TO WRITE AN EXPLANATION ════════

${EXPLAIN_SPEC}

${teacherNotesBlock(notes)}════════ THE LECTURE ════════

Title: ${course.metadata.title}${course.metadata.course_code ? `\nCourse code: ${course.metadata.course_code}` : ''}

${sectionBlocks}
`;
}
