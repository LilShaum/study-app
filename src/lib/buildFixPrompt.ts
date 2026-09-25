import type { Course, StudyItem } from '@/schema/course';
import { sortedSections } from './sortedSections';
import { analyseCourseHealth } from './courseHealth';
import { QUALITY_BAR_SPEC } from './generatorSpec';

/** Keeps a very large course's prompt inside a sane clipboard paste. */
const MAX_EXCERPTS = 60;
const MAX_FAULTY_ITEMS = 25;

/**
 * The faults a model can actually repair, as opposed to ones the app fixes
 * itself — in the order they are worth fixing. The prompt caps how many items
 * it carries, so the ones that are BROKEN go before the ones that merely
 * teach less well: a question with no valid answer key scores nothing at all.
 */
const CORRECTABLE = [
  'correct-index-out-of-range',
  'option-count',
  'rationale-misaligned',
  'no-explanation',
  'filler-options',
  'length-tell',
  'lopsided-options',
  'cued-to-source',
];
const RANK = new Map(CORRECTABLE.map((id, n) => [id, n]));

const FAULT_LABELS: Record<string, string> = {
  'correct-index-out-of-range': 'the answer key points outside the options, so no option can be marked correct',
  'rationale-misaligned': "the distractor_rationale array isn't index-aligned with the options",
  'no-explanation': 'there is no explanation shown after answering',
  'filler-options': 'it uses "all/none of the above" as an option',
  'option-count': "it doesn't have the four options the contract asks for",
  'length-tell':
    'the right answer is noticeably longer than every wrong one, so a student can pick it without knowing the material — bring the options to similar length, usually by giving the distractors the qualifier the right answer has, not by stripping the right answer',
  'lopsided-options': 'one option is more than twice the length of the others, which draws the eye whether or not it is right',
  'cued-to-source':
    'the question refers to "the notes", "the slide" or a figure — ask the same thing about the subject itself, since that cue will not exist in the exam',
};

function itemJson(item: StudyItem): string {
  return JSON.stringify(item, null, 2)
    .split('\n')
    .map((l) => `  ${l}`)
    .join('\n');
}

export interface FixPromptPlan {
  missingTerms: string[];
  untestedTerms: string[];
  faultyItems: { item: StudyItem; sectionId: string; faults: string[] }[];
  /** How many items had a correctable fault — more than faultyItems when capped. */
  totalFaulty: number;
  /** True when there is nothing for a model to do. */
  empty: boolean;
}

/**
 * What the health check found, reduced to the parts a model can act on.
 *
 * Exported so the dialog can show the student exactly what the prompt will
 * ask for before they copy it — the same rule the merge preview follows.
 */
export function planFixes(course: Course): FixPromptPlan {
  const health = analyseCourseHealth(course);
  const faultsByItem = new Map<string, string[]>();

  for (const finding of health.findings) {
    if (!RANK.has(finding.id)) continue;
    for (const id of finding.items ?? []) {
      faultsByItem.set(id, [...(faultsByItem.get(id) ?? []), finding.id]);
    }
  }

  const faultyItems: FixPromptPlan['faultyItems'] = [];
  for (const section of sortedSections(course)) {
    for (const item of section.items) {
      const faults = faultsByItem.get(item.id);
      if (faults) faultyItems.push({ item, sectionId: section.id, faults });
    }
  }

  const missingTerms = health.declaredTermCoverage?.missing ?? [];
  const untestedTerms = health.gaps.untestedTerms;

  // Worst fault first, then course order, before the cap is applied.
  const worst = (faults: string[]) => Math.min(...faults.map((f) => RANK.get(f) ?? 99));
  faultyItems.sort((a, b) => worst(a.faults) - worst(b.faults));

  return {
    missingTerms,
    untestedTerms,
    totalFaulty: faultyItems.length,
    faultyItems: faultyItems.slice(0, MAX_FAULTY_ITEMS),
    empty: missingTerms.length === 0 && untestedTerms.length === 0 && faultyItems.length === 0,
  };
}

/**
 * Builds the prompt that turns the app's own check into a repair job.
 *
 * The app can see that a term the generator listed never got a definition,
 * and that a question's answer key points nowhere. What it cannot see is
 * whether the missing term was ever worth an item — the inventory records
 * every technical term in the notes, including ones mentioned once in
 * passing, previewed as next week's topic, or explicitly ruled out of the
 * exam. Only something holding the source can judge that.
 *
 * So the prompt asks for a judgement first and content second, and says in as
 * many words that "not worth an item" is a correct answer. Without that, this
 * becomes a machine for manufacturing filler out of a list of words — which
 * is precisely the failure the generator spec exists to prevent.
 *
 * It asks for additions and corrections, never a regenerated course file.
 * Progress is keyed per item id, so a fresh file would carry new ids and
 * silently zero every score the student has built; a correction under the
 * same id keeps that item's history.
 */
export function buildFixPrompt(course: Course): string {
  const sections = sortedSections(course);
  const fix = planFixes(course);

  const excerpts = [
    ...new Set(
      sections
        .flatMap((s) => s.items)
        .map((i) => String(i.source_excerpt ?? '').trim())
        .filter(Boolean),
    ),
  ].slice(0, MAX_EXCERPTS);

  const blocks: string[] = [];

  if (fix.missingTerms.length) {
    blocks.push(
      [
        `## 1. Terms the course listed but never defined (${fix.missingTerms.length})`,
        '',
        'While reading my notes you wrote down every technical term you found.',
        'These ones are on that list and no item in the course defines them:',
        '',
        fix.missingTerms.map((t) => `  - ${t}`).join('\n'),
        '',
        '**Judge each one before writing anything.** For each term, decide from',
        'the source material whether it is genuinely examinable content or',
        'whether it is one of these:',
        '',
        '  - mentioned once in passing, with nothing actually taught about it',
        '  - a preview of a later lecture, or a callback to an earlier one',
        '  - something the notes explicitly said would not be assessed',
        '  - a proper noun, a citation, or a piece of admin that only looks technical',
        '',
        'If it is any of those, **say so and skip it**. "Not worth an item" is a',
        'correct answer and I would rather have it than a padded course. Do not',
        'invent content to fill this list — if the notes say nothing about a term,',
        'there is nothing for me to be right or wrong about.',
        '',
        'For the ones that ARE worth it, write a `definition` item, plus an `mcq`',
        'or `flashcard` if the term is important enough to be tested and not just',
        'recognised.',
      ].join('\n'),
    );
  }

  if (fix.untestedTerms.length) {
    blocks.push(
      [
        `## ${blocks.length + 1}. Terms only ever asked for by name (${fix.untestedTerms.length})`,
        '',
        'These have a definition in the course, and the app quizzes me on the',
        'name: it shows the definition and I type the term. But no MCQ or',
        'flashcard ever makes me USE one — apply it, predict with it, or tell it',
        'apart from a neighbour — so I can name each and still not understand it.',
        '',
        fix.untestedTerms.map((t) => `  - ${t}`).join('\n'),
        '',
        'Write a gradable item for each one that deserves testing. The same',
        'judgement applies: if the notes only mention it in passing, say so and',
        'skip it.',
      ].join('\n'),
    );
  }

  if (fix.faultyItems.length) {
    blocks.push(
      [
        `## ${blocks.length + 1}. Questions with something wrong with them (${
          fix.totalFaulty > fix.faultyItems.length
            ? `the ${fix.faultyItems.length} most serious of ${fix.totalFaulty} — I will send the rest in another round`
            : fix.faultyItems.length
        })`,
        '',
        'Each of these is reproduced in full below with what the app found wrong.',
        'Return a FIXED version of each, keeping its `id` exactly as it is — that',
        'id is how my progress on that question is stored, so changing it would',
        'lose my history for it.',
        '',
        fix.faultyItems
          .map(({ item, sectionId, faults }) =>
            [
              `### ${item.id}  (section "${sectionId}")`,
              `Problem: ${faults.map((f) => FAULT_LABELS[f] ?? f).join('; ')}.`,
              '',
              itemJson(item),
            ].join('\n'),
          )
          .join('\n\n'),
      ].join('\n'),
    );
  }

  return `The Arborous app has checked a course you generated for me from my notes,
and found gaps and faults in it. I want you to fix what is worth fixing.

**If this conversation still has my original notes, slides or textbook
material in it, use those — they are the real source and they are complete.**
If it does not, use the excerpts at the bottom: every item in the course
recorded a quote from the passage it came from. Either way the rule is
unchanged — nothing that is not in that material may appear in your answer.

════════ WHAT THE CHECK FOUND ════════

${blocks.join('\n\n')}

════════ WHAT TO SEND BACK ════════

Two things, in this order:

1. **A short plain-text verdict list, before the JSON** — one line per term
   you were asked about, saying either what you wrote for it or why you
   skipped it. This is the part I actually read to decide whether the course
   was missing something real. Keep it short.

2. **Then the JSON, and nothing after it**, in exactly this shape:

\`\`\`json
{
  "sections": [
    { "id": "<an existing section id>", "items": [ /* NEW items only */ ] }
  ],
  "corrections": [ /* FIXED versions of the faulty items, each keeping its id */ ]
}
\`\`\`

Both keys are optional — send only the ones you have something for.

- Do NOT return the whole course. New items go under \`sections\`; fixes go
  under \`corrections\` and must keep the id they already have.
- Do not re-send items that are already fine.
- Every item needs a unique \`id\`, a \`type\`, and a \`source_excerpt\` quoting
  the passage it comes from.
- Every \`mcq\` needs exactly four \`options\`, a 0-based \`correct_index\`, an
  \`explanation\`, and a \`distractor_rationale\` with one entry per option in the
  same order, with an empty string in the correct answer's slot.
- A corrected question must still pass the rules below. Fixing a broken key by
  adding a long, qualified right answer beside three short wrong ones swaps one
  fault for another.

════════ QUALITY RULES ════════

These are the rules the course was generated under, and the ones the app
checks the result against. Anything you write or correct should meet them.

${QUALITY_BAR_SPEC}

════════ THE COURSE ════════

Title: ${course.metadata.title}${course.metadata.course_code ? `\nCourse code: ${course.metadata.course_code}` : ''}

Section ids you can add to:
${sections.map((s) => `  - "${s.id}" — ${s.title}`).join('\n')}

${
  excerpts.length
    ? `Source excerpts recorded across the course${
        excerpts.length === MAX_EXCERPTS ? ' (first ' + MAX_EXCERPTS + ')' : ''
      }:\n${excerpts.map((e) => `  • ${e}`).join('\n')}`
    : ''
}
`;
}
