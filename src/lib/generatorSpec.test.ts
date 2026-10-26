import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { Course, StudyItem } from '@/schema/course';
import { generatorSpec, hasStudies, ITEM_TYPES_SPEC, QUALITY_BAR_SPEC, specSection } from './generatorSpec';
import { buildNewCoursePrompt } from './buildNewCoursePrompt';
import { buildAddPrompt } from './buildAddPrompt';
import { buildPractisePrompt } from './buildPractisePrompt';
import { buildFixPrompt, planFixes } from './buildFixPrompt';

describe('specSection', () => {
  const doc = ['# Top', 'intro', '## A', 'a body', '### A.1', 'deeper', '## B', 'b body'].join('\n');

  it('keeps deeper headings and stops at the next heading of the same level', () => {
    expect(specSection('## A', doc)).toBe(['## A', 'a body', '### A.1', 'deeper'].join('\n'));
  });

  it('returns nothing, rather than guessing, for a heading that is not there', () => {
    expect(specSection('## Missing', doc)).toBe('');
  });
});

describe('the sections the prompts quote from prompts/generator.md', () => {
  // If a heading in prompts/generator.md is renamed, specSection returns '' and the fix
  // and practise prompts lose their rules without any error. These fail
  // first instead.
  it('carries the item format', () => {
    expect(ITEM_TYPES_SPEC).toMatch(/distractor_rationale/);
    expect(ITEM_TYPES_SPEC).toMatch(/correct_index/);
    expect(ITEM_TYPES_SPEC).toMatch(/"front", "back"/);
  });

  it('carries the rules the app checks for', () => {
    expect(QUALITY_BAR_SPEC).toMatch(/shape of an option give the answer away/i);
    expect(QUALITY_BAR_SPEC).toMatch(/Ask about the subject, never about the document/);
    expect(QUALITY_BAR_SPEC).toMatch(/every section needs at least one gradable item/i);
  });

  it('carries how the app uses each card, so every prompt plans for it', () => {
    // In the Quality bar, so the new, add, more-practice and fix prompts all
    // have it (docs/proposals/content-quality.md).
    expect(QUALITY_BAR_SPEC).toMatch(/How the app uses what you write/);
    expect(QUALITY_BAR_SPEC).toMatch(/Flashcards are asked cold/);
    expect(QUALITY_BAR_SPEC).toMatch(/Plan each idea before you write it/);
    expect(QUALITY_BAR_SPEC).toMatch(/each from a different side/);
    expect(QUALITY_BAR_SPEC).toMatch(/Never the same sentence twice/);
    expect(QUALITY_BAR_SPEC).toMatch(/No card answers another/);
    expect(QUALITY_BAR_SPEC).toMatch(/Nothing a stranger could answer/);
    expect(QUALITY_BAR_SPEC).toMatch(/What the slide asks students to know/);
    expect(QUALITY_BAR_SPEC).toMatch(/MCQs carry the nuance/);
    expect(QUALITY_BAR_SPEC).toMatch(/Nuance, not trivia/);
    // A taught pathway is content, never trivia (the owner, 2026-10-13).
    expect(QUALITY_BAR_SPEC).toMatch(/A pathway is content, not an example/);
    expect(QUALITY_BAR_SPEC).toMatch(/Taught pathway\. Write these/);
    expect(QUALITY_BAR_SPEC).toMatch(/Parts of one system are taught together/);
    expect(QUALITY_BAR_SPEC).toMatch(/\| \*\*Background\*\* \|/);
    expect(QUALITY_BAR_SPEC).toMatch(/At most three cards on one term at its first meeting/);
    expect(QUALITY_BAR_SPEC).toMatch(/At least one MCQ in\s+four is hard/);
    // A question that asked two things read as an unrelated answer (the owner, 2026-10-26).
    expect(QUALITY_BAR_SPEC).toMatch(/One question per stem/);
    expect(QUALITY_BAR_SPEC).toMatch(/never only that the source does not say/);
    expect(ITEM_TYPES_SPEC).toMatch(/not a word from its family/);
  });

  it('is quoted verbatim, so the prompts cannot drift from the spec', () => {
    const spec = fs.readFileSync(path.resolve(__dirname, '../../prompts/generator.md'), 'utf8');
    expect(spec).toContain(QUALITY_BAR_SPEC);
    expect(spec).toContain(ITEM_TYPES_SPEC);
  });
});

const mcq = (id: string, options: string[], correct_index: number, extra: Record<string, unknown> = {}): StudyItem =>
  ({
    id,
    type: 'mcq',
    question: `Question ${id}?`,
    options,
    correct_index,
    explanation: 'because',
    distractor_rationale: options.map((_, i) => (i === correct_index ? '' : 'no')),
    source_excerpt: `excerpt ${id}`,
    ...extra,
  }) as StudyItem;

const course = (items: StudyItem[]): Course =>
  ({ schema_version: '1.0', metadata: { title: 'T' }, sections: [{ id: 's1', title: 'S', items }] }) as Course;

describe('buildPractisePrompt', () => {
  it('hands over the same quality rules as the new-course prompt', () => {
    const prompt = buildPractisePrompt(course([mcq('q1', ['aa', 'bb', 'cc', 'dd'], 0)]));
    expect(prompt).toContain(QUALITY_BAR_SPEC);
    expect(prompt).toContain(ITEM_TYPES_SPEC);
  });

  it('asks for new sides of a key term that only one card asks about', () => {
    const c = {
      schema_version: '1.0',
      metadata: { title: 'T', inventory: { terms: ['Osmosis'], objectives: ['Explain osmosis across a membrane'] } },
      sections: [
        {
          id: 's1',
          title: 'Water',
          items: [
            { id: 'd1', type: 'definition', term: 'Osmosis', definition: 'Water moving down its gradient across a membrane.' },
            { id: 'f1', type: 'flashcard', front: 'What drives osmosis?', back: 'A difference in solute concentration.' },
          ],
        },
      ],
    } as unknown as Course;
    expect(buildPractisePrompt(c)).toMatch(/key terms[^\n]*only one MCQ or flashcard[\s\S]*Osmosis/);
  });

  it('says so when a section has more items than it lists', () => {
    const many = Array.from({ length: 130 }, (_, n) => mcq(`q${n}`, ['aa', 'bb', 'cc', 'dd'], 0));
    expect(buildPractisePrompt(course(many))).toMatch(/and 10 more not listed/);
  });
});

describe('planFixes / buildFixPrompt', () => {
  // A right answer far longer than its three distractors, on enough
  // questions for the course-wide length finding to fire.
  const giveaway = (id: string) =>
    mcq(id, ['a much longer and carefully qualified correct answer', 'short', 'brief', 'terse'], 0);

  it('names each question whose answer gives itself away, so it can be repaired', () => {
    const plan = planFixes(course(Array.from({ length: 30 }, (_, n) => giveaway(`g${n}`))));
    expect(plan.faultyItems.length).toBeGreaterThan(0);
    expect(plan.faultyItems[0].faults).toContain('length-tell');
  });

  it('puts a broken answer key ahead of teaching faults when it has to cap', () => {
    const items = [
      ...Array.from({ length: 30 }, (_, n) => giveaway(`g${n}`)),
      mcq('broken', ['aa', 'bb', 'cc', 'dd'], 9),
    ];
    const plan = planFixes(course(items));
    expect(plan.faultyItems[0].item.id).toBe('broken');
  });

  it('reports the true total when the list is capped, not the capped count', () => {
    const plan = planFixes(course(Array.from({ length: 40 }, (_, n) => giveaway(`g${n}`))));
    expect(plan.totalFaulty).toBe(40);
    expect(plan.faultyItems.length).toBeLessThan(40);
    expect(buildFixPrompt(course(Array.from({ length: 40 }, (_, n) => giveaway(`g${n}`))))).toMatch(
      /most serious of 40/,
    );
  });

  it('holds corrections to the same quality rules as new items', () => {
    expect(buildFixPrompt(course([mcq('broken', ['aa', 'bb', 'cc', 'dd'], 9)]))).toContain(QUALITY_BAR_SPEC);
  });
});

describe('generatorSpec: the studies passages, chosen', () => {
  const off = generatorSpec(false);
  const on = generatorSpec(true);

  it('teaches each study in depth only when asked', () => {
    expect(on).toMatch(/One labelled exception: a cited study the slides show but do not explain/);
    expect(on).toMatch(/Teach the\s+finding, how the experiment showed it/);
    expect(off).not.toMatch(/One labelled exception/);
    expect(off).not.toMatch(/how the experiment showed it/);
    expect(off).toMatch(/Nothing comes from outside the source, studies included/);
    expect(off).toMatch(/evidence for\s+the point it supports/);
  });

  it('leaves no markers, and the rest of the spec as it is', () => {
    for (const spec of [on, off]) {
      expect(spec).not.toMatch(/<!--/);
      expect(spec).toContain(QUALITY_BAR_SPEC);
      expect(spec).toContain(ITEM_TYPES_SPEC);
    }
  });

  it('knows a lecture that already teaches studies by its study tags', () => {
    const tagged = course([mcq('q1', ['aa', 'bb', 'cc', 'dd'], 0, { tags: ['study:Hollis et al. (1998)'] })]);
    expect(hasStudies(tagged)).toBe(true);
    expect(hasStudies(course([mcq('q1', ['aa', 'bb', 'cc', 'dd'], 0)]))).toBe(false);
  });

  it('hands the choice to the new-lecture and add-material prompts', () => {
    expect(buildNewCoursePrompt()).not.toMatch(/One labelled exception/);
    expect(buildNewCoursePrompt(undefined, undefined, true)).toMatch(/One labelled exception/);
    const tagged = course([mcq('q1', ['aa', 'bb', 'cc', 'dd'], 0, { tags: ['study:Hollis et al. (1998)'] })]);
    expect(buildAddPrompt(tagged)).toMatch(/One labelled exception/);
    expect(buildAddPrompt(tagged, undefined, false)).not.toMatch(/One labelled exception/);
  });
});
