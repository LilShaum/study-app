// The canonical generator spec, imported straight from prompts/generator.md so
// the prompt this app hands out can never drift from the format the app
// actually parses. Editing it updates both at once.
import GENERATOR_SPEC from '../../prompts/generator.md?raw';
import type { Course } from '@/schema/course';
import { allItems } from '@/schema/fragment';
import { sortedSections } from './sortedSections';
import { freshIdPrefix } from './idPrefix';

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

  const prefix = freshIdPrefix(course);

  // Everything the course already asks, by section. It used to be a sample
  // of the first 40, which was nothing like enough for the common case: the
  // same lecture again with slides added, where the model needs to see all
  // of what is covered to write only what is new. A stem is short, so even a
  // 500-item course stays a reasonable paste.
  const covered = sections
    .filter((s) => s.items.length)
    .map((s) => [`Section "${s.id}" — ${s.title}:`, ...s.items.map((i) => `  - [${i.type}] ${promptOf(i)}`)].join('\n'))
    .join('\n\n');

  return `I'm adding new material to an existing Arborous course. Below is the
generator spec, then the state of the course I'm adding to, then my source
material.

My source may be entirely new (a later lecture), or a longer version of a
lecture the course already has, with slides added. Either way, write items
ONLY for content the course does not already cover. Everything it covers is
listed below; where my source repeats it, skip it. Where it adds to a lecture
already here, put the new items in that lecture's existing section.

Return ONLY JSON in this shape — just the sections I'm adding to or creating,
each holding ONLY the new items, plus the inventory of what you added. Do not
repeat items the course already has, and do not return the whole course.
Where the spec below describes the output as a whole course file
(schema_version, metadata), this shape replaces it:

{
  "sections": [
    { "id": "<existing section id, or a new slug>", "title": "<only needed for a new section>", "items": [ /* new items */ ] }
  ],
  "inventory": { "terms": [ /* terms the NEW material explains */ ], "mentioned": [ /* terms it only names */ ] }
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

Item ids: start every new id with "${prefix}" (e.g. "${prefix}def_1"). No id
already in the course begins that way, so none of yours can collide.

Everything the course already asks — do NOT write another item testing the
same fact the same way (exact repeats are skipped when the new items are
merged in, but near-repeats are not):
${covered || '(none yet)'}

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
  return String(text ?? '').slice(0, 100);
}
