// The canonical generator spec, imported straight from prompts/generator.md.
import GENERATOR_SPEC from '../../prompts/generator.md?raw';
import type { Course } from '@/schema/course';

/**
 * Sections of prompts/generator.md, for the prompts that need part of the spec rather
 * than all of it.
 *
 * The new-course and add-material prompts embed the whole file. The fix and
 * more-practice prompts used to carry their own paraphrase of the rules
 * instead — and a paraphrase drifts. When the option-length, source-citing
 * and recall-only rules were added to prompts/generator.md, those two prompts never
 * received them, so every batch of extra questions they produced could repeat
 * exactly the faults the app had just started reporting. Quoting the spec's
 * own sections means there is one copy of each rule.
 *
 * A heading is found by its exact text. Renaming one in prompts/generator.md would
 * otherwise empty a prompt silently, so generatorSpec.test.ts asserts that
 * every section used here exists and carries the rules it is relied on for.
 */
export function specSection(heading: string, source: string = GENERATOR_SPEC): string {
  const lines = source.split('\n');
  const level = heading.match(/^#+/)?.[0].length ?? 0;
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start < 0 || level === 0) return '';

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#+)\s/);
    // Ends at the next heading of the same or a higher level; a deeper one
    // belongs to this section.
    if (m && m[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trim();
}

const STUDY_BLOCK = /<!-- studies -->\n([\s\S]*?)<!-- no studies -->\n([\s\S]*?)<!-- end studies -->\n?/g;

/**
 * The generator spec with its studies passages chosen: teaching each cited
 * study in depth (its question, method, result and meaning, filled in from
 * the model's own knowledge where the slides only cite it), or a study only
 * as evidence for its point. In depth by default cost a lecture whose exams
 * never ask about studies much of the student's usage (the owner's
 * nutrition lectures, 2026-10-26), so it is a choice made when generating.
 */
export function generatorSpec(studies: boolean, source: string = GENERATOR_SPEC): string {
  return source.replace(STUDY_BLOCK, (_, inDepth: string, brief: string) => (studies ? inDepth : brief));
}

/** Whether a lecture already teaches studies: an item tagged with one (prompts/generator.md, `study:`). */
export function hasStudies(course: Course): boolean {
  return course.sections.some((s) => s.items.some((i) => !i.set_aside && i.tags?.some((t) => t.startsWith('study:'))));
}

/** How each item type is shaped — for prompts whose reader may not have the spec. */
export const ITEM_TYPES_SPEC = specSection('### Item types');

/** The rules for what makes an item good rather than merely valid. */
export const QUALITY_BAR_SPEC = specSection('## Quality bar');

/**
 * One item type's entry in the spec, from its bold name to the next type's,
 * for a prompt that asks for that type alone.
 */
export function itemTypeSpec(type: string, source: string = ITEM_TYPES_SPEC): string {
  const start = source.indexOf(`**\`${type}\`**`);
  if (start < 0) return '';
  const next = source.slice(start + 1).search(/\n\*\*`[a-z]+`\*\*/);
  return source.slice(start, next < 0 ? source.length : start + 1 + next).trim();
}

/** What an explanation is and how to write one. */
export const EXPLAIN_SPEC = itemTypeSpec('explain');
