import type { Course } from '@/schema/course';
import { sortedSections } from './sortedSections';

/** How much of the previous lecture's end the prompt lists: its last sections, a bounded list. */
const LAST_SECTIONS = 3;
const MAX_EXCERPTS = 40;

/**
 * What the lecture before this one already covers, for the new-lecture
 * prompt.
 *
 * The owner's biology and psychology teachers start each slide deck with
 * the last slides of the one before. Generated separately, those slides got
 * cards twice, and the student studied them twice. The AI making the new
 * lecture cannot see the old one, so this tells it: the last sections of the
 * previous lecture, with their slide ranges, terms and source quotes, and
 * what to do with a slide that repeats them.
 */
export function previousLectureBlock(previous: Course | undefined): string {
  if (!previous) return '';
  const sections = sortedSections(previous).slice(-LAST_SECTIONS);
  if (!sections.length) return '';
  const lines = sections.map((s) => {
    const terms = s.items.filter((i) => i.type === 'definition').map((d) => d.term);
    const excerpts = [...new Set(s.items.map((i) => String(i.source_excerpt ?? '').trim()).filter(Boolean))];
    return [
      `### ${s.title}${s.source_range ? ` (${s.source_range} of that deck)` : ''}`,
      terms.length ? `Terms already defined: ${terms.join(', ')}` : '',
      ...excerpts.slice(0, Math.ceil(MAX_EXCERPTS / sections.length)).map((e) => `  • ${e}`),
    ]
      .filter(Boolean)
      .join('\n');
  });
  return `════════ MY PREVIOUS LECTURE ════════

This deck follows my lecture "${previous.metadata.title}", which I already
study in the app. My teacher often repeats the last slides of one deck at
the start of the next. Below is what the end of that lecture already covers.

1. For a slide in my new material whose content is already covered below,
   write no items, and do not define its terms again.
2. If a repeated slide adds something (a detail, a new example, a link to
   this lecture's topic), write items only for what it adds.
3. Name the slides you skipped and why in \`metadata.description\`, e.g.
   "Slides 1–6 repeat the end of ${previous.metadata.title}; not repeated here."
4. A term from the previous lecture that this lecture uses may still appear
   in this lecture's questions. It just does not get a second definition.

${lines.join('\n\n')}

`;
}
