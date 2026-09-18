// The canonical generator spec, imported straight from the repo's CLAUDE.md so
// the prompt this app hands out can never drift from the format the app
// actually parses. Editing CLAUDE.md updates both at once.
import GENERATOR_SPEC from '../../CLAUDE.md?raw';
import type { Course } from '@/schema/course';
import { allItems } from '@/schema/fragment';
import { sortedSections } from './sortedSections';

/**
 * Builds the prompt a student pastes into their AI chat to generate items for
 * a course they already have.
 *
 * The point of doing this in the app rather than leaving it to the student is
 * the course context: the model is told the existing section ids, how many
 * items each already holds, the item ids in use, and the tag vocabulary. Those
 * four facts are what stop the three failure modes of a blind re-run —
 * inventing a parallel section, colliding ids, re-emitting items you already
 * have, and inventing a fifth spelling of a tag you already use.
 *
 * `planMerge` defends against all of that anyway; telling the model up front
 * just means it produces less that has to be thrown away.
 */
export function buildAddPrompt(course: Course): string {
  const sections = sortedSections(course);
  const items = allItems(course.sections);

  const sectionLines = sections
    .map((s) => `- id: "${s.id}"  title: "${s.title}"  (${s.items.length} items already)`)
    .join('\n');

  const tags = [...new Set(items.flatMap((i) => i.tags ?? []))].sort();
  const tagLine = tags.length
    ? tags.map((t) => `"${t}"`).join(', ')
    : '(none yet — pick a small, reusable set)';

  const existingIds = items.map((i) => i.id);
  const idLine = existingIds.length
    ? `${existingIds.slice(0, 60).join(', ')}${existingIds.length > 60 ? `, …and ${existingIds.length - 60} more` : ''}`
    : '(none yet)';

  const prompts = items.slice(0, 40).map((i) => `- ${promptOf(i)}`);

  return `I'm adding new material to an existing Arborous course. Below is the
generator spec, then the state of the course I'm adding to, then my source
material.

Return ONLY JSON in this shape — just the sections I'm adding to or creating,
each holding ONLY the new items. Do not repeat items the course already has,
and do not return the whole course:

{
  "sections": [
    { "id": "<existing section id, or a new slug>", "title": "<only needed for a new section>", "items": [ /* new items */ ] }
  ]
}

════════ COURSE I'M ADDING TO ════════

Title: ${course.metadata.title}${course.metadata.course_code ? `\nCourse code: ${course.metadata.course_code}` : ''}
Total items already present: ${items.length}

Existing sections — reuse one of these ids to append to it, or invent a new
slug only for genuinely new material:
${sectionLines || '(no sections yet)'}

Tag vocabulary already in use — reuse these spellings rather than inventing
near-duplicates:
${tagLine}

Item ids already taken (yours must not collide with any of these):
${idLine}

Prompts already covered — do NOT write another item testing the same fact:
${prompts.join('\n') || '(none yet)'}${items.length > 40 ? `\n…and ${items.length - 40} more.` : ''}

════════ GENERATOR SPEC ════════

${GENERATOR_SPEC}

════════ MY SOURCE MATERIAL ════════

<<< PASTE YOUR NOTES, SLIDES, OR CHAPTER BELOW THIS LINE >>>
`;
}

function promptOf(item: { type: string; [k: string]: unknown }): string {
  const text =
    item.type === 'mcq'
      ? item.question
      : item.type === 'flashcard'
        ? item.front
        : item.type === 'definition'
          ? item.term
          : item.title;
  return String(text ?? '').slice(0, 120);
}
