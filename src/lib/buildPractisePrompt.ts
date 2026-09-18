import type { Course, StudyItem } from '@/schema/course';
import { sortedSections } from './sortedSections';
import { analyseCourseGaps } from './courseGaps';

/** Keeps a very large course's prompt inside a sane clipboard paste. */
const MAX_EXCERPTS_PER_SECTION = 40;
const MAX_PROMPTS_PER_SECTION = 40;

function promptOf(item: StudyItem): string {
  switch (item.type) {
    case 'mcq':
      return item.question;
    case 'flashcard':
      return item.front;
    case 'definition':
      return item.term;
    default:
      return item.title;
  }
}

/**
 * Builds the prompt for generating MORE practice on material the course
 * already covers — for when you've memorised the existing questions, or the
 * first pass tested a concept too lightly.
 *
 * The trick that makes this work without the original notes: every item
 * carries a `source_excerpt`, a quote or tight paraphrase of the passage it
 * came from. Collected and grouped by section, those excerpts are a
 * compressed reconstruction of the source — enough grounded material to write
 * genuinely new items from, while still obeying the rule that nothing may be
 * invented.
 *
 * That reconstruction is lossy, and the prompt says so: anything the notes
 * covered but the first pass skipped left no excerpt behind, so it cannot be
 * recovered from the course file alone. Pasting this into the same chat that
 * generated the course fixes that, because the original notes are still in
 * that conversation — so the prompt asks the model to prefer them when they
 * are there, and fall back to the excerpts when they aren't.
 *
 * The gap analysis is what stops this being "generate more of the same":
 * the app knows which defined terms are never tested and which sections have
 * nothing scorable, and names them as priorities.
 */
export function buildPractisePrompt(course: Course): string {
  const sections = sortedSections(course);
  const gaps = analyseCourseGaps(course);

  const sectionBlocks = sections
    .filter((s) => s.items.length > 0)
    .map((s) => {
      const excerpts = [
        ...new Set(
          s.items
            .map((i) => String(i.source_excerpt ?? '').trim())
            .filter(Boolean),
        ),
      ].slice(0, MAX_EXCERPTS_PER_SECTION);

      const covered = s.items
        .slice(0, MAX_PROMPTS_PER_SECTION)
        .map((i) => `    - [${i.type}] ${promptOf(i)}`)
        .join('\n');

      return [
        `### Section "${s.id}" — ${s.title}  (${s.items.length} items)`,
        '',
        '  Source material this section was built from:',
        excerpts.map((e) => `    • ${e}`).join('\n') || '    (none recorded)',
        '',
        '  Already tested here — do NOT rewrite these, write different ones:',
        covered || '    (nothing yet)',
      ].join('\n');
    })
    .join('\n\n');

  const priorities: string[] = [];
  if (gaps.untestedTerms.length) {
    priorities.push(
      `- These terms are DEFINED in the course but never appear in any MCQ or flashcard, so the student is shown them and never made to recall them. Write gradable items for these first:\n  ${gaps.untestedTerms.join(', ')}`,
    );
  }
  if (gaps.thinSections.length) {
    priorities.push(
      `- These sections have little or nothing that can be scored:\n  ${gaps.thinSections
        .map((s) => `"${s.title}" (${s.gradable} of ${s.total} items are gradable)`)
        .join('; ')}`,
    );
  }
  if (gaps.gradableRatio < 0.5) {
    priorities.push(
      `- Only ${gaps.gradableItems} of ${gaps.totalItems} items (${Math.round(gaps.gradableRatio * 100)}%) are MCQs or flashcards. Everything else is read but never scored, so weight this round heavily toward those two types.`,
    );
  }

  return `I want MORE PRACTICE on an Arborous course I already have. I am not
adding new subject matter — I want new questions on the material already in
this course, because I have worked through the existing ones.

**If this conversation still has my original notes, slides or textbook
material in it, use those as your source — they are complete.** If it does
not, use the source excerpts reproduced below: each item in my course recorded
a quote from the notes it came from, and they are grouped by section here.
Either way, the same rule holds — do not invent anything that is not in that
material.

What I want back:

- NEW items testing the SAME underlying facts in ways the existing items do
  not. Turn recall into application; ask what breaks when a step is removed;
  ask for the case that separates two things the notes contrast; apply a
  formula the course only states.
- Harder than what is already there. The existing items are the floor.
- Mostly \`mcq\` and \`flashcard\`, because those are the only types the app
  scores. A definition I cannot be tested on does not help me here.
- Nothing that duplicates an existing item. Every item's prompt is listed
  below so you can check.

${priorities.length ? `Priorities for this round — the app worked these out from the course itself:\n\n${priorities.join('\n')}\n` : ''}
Return ONLY JSON in this shape — just the sections you are adding to, each
holding ONLY the new items. Do not return the whole course:

{
  "sections": [
    { "id": "<one of the section ids below>", "items": [ /* new items */ ] }
  ]
}

Follow the same item format as the rest of the course: every item needs a
unique \`id\`, a \`type\`, and a \`source_excerpt\`; every \`mcq\` needs exactly four
\`options\`, a 0-based \`correct_index\`, an \`explanation\`, and a
\`distractor_rationale\` with one entry per option (empty string in the correct
answer's slot).

════════ THE COURSE ════════

Title: ${course.metadata.title}${course.metadata.course_code ? `\nCourse code: ${course.metadata.course_code}` : ''}
${gaps.totalItems} items across ${sections.length} sections${
    Object.keys(gaps.byType).length
      ? ` — ${Object.entries(gaps.byType)
          .map(([t, n]) => `${n} ${t}`)
          .join(', ')}`
      : ''
  }

${sectionBlocks}
`;
}
