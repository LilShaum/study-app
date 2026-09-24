import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { Course, StudyItem } from '@/schema/course';
import { ITEM_TYPES_SPEC, QUALITY_BAR_SPEC, specSection } from './generatorSpec';
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

describe('the sections the prompts quote from CLAUDE.md', () => {
  // If a heading in CLAUDE.md is renamed, specSection returns '' and the fix
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

  it('is quoted verbatim, so the prompts cannot drift from the spec', () => {
    const spec = fs.readFileSync(path.resolve(__dirname, '../../CLAUDE.md'), 'utf8');
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
