import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import { buildExplainPrompt } from './buildExplainPrompt';
import { EXPLAIN_SPEC, NARRATION_SPEC } from './generatorSpec';
import { parseFragment } from '@/schema/fragment';
import { planMerge } from './mergeFragment';

const lecture = {
  schema_version: '1.0',
  metadata: { title: 'Cell signalling' },
  sections: [
    {
      id: 's1',
      title: 'Second messengers',
      source_range: 'slides 4–9',
      items: [
        { id: 'd1', type: 'definition', term: 'cAMP', definition: 'A messenger made from ATP.', source_excerpt: 'cAMP is made from ATP' },
        { id: 'q1', type: 'mcq', question: 'Why does blocking phosphodiesterase prolong the signal?', options: ['a', 'b', 'c', 'd'], correct_index: 0, explanation: 'x', source_excerpt: 'phosphodiesterase breaks down cAMP' },
        { id: 'e1', type: 'explain', title: 'How one hormone becomes many signals', text: 'Each step multiplies the last.' },
      ],
    },
    { id: 's2', title: 'Empty', items: [] },
    { id: 's3', title: 'Set aside', items: [{ id: 'q9', type: 'flashcard', front: 'Off the syllabus?', back: 'Yes.', set_aside: true }] },
  ],
} as unknown as Course;

describe('buildExplainPrompt', () => {
  const prompt = buildExplainPrompt(lecture);

  it('carries the spec for an explanation, word for word', () => {
    expect(EXPLAIN_SPEC).toMatch(/^\*\*`explain`\*\*/);
    expect(EXPLAIN_SPEC).toMatch(/2 to 4 plain sentences/);
    expect(EXPLAIN_SPEC).not.toMatch(/`definition`\*\*/);
    expect(prompt).toContain(EXPLAIN_SPEC);
  });

  it('shows each section by id with what it asks, what it defines and where it is in the slides', () => {
    expect(prompt).toContain('Section "s1" — Second messengers  (slides 4–9)');
    expect(prompt).toContain('Why does blocking phosphodiesterase prolong the signal?');
    expect(prompt).toContain('Terms it defines: cAMP');
    expect(prompt).toContain('• phosphodiesterase breaks down cAMP');
    expect(prompt).not.toContain('"s2"');
    expect(prompt).not.toContain('"s3"');
  });

  it('names the explanations already there, so they are not written twice', () => {
    expect(prompt).toMatch(/Already explained, do not write these again:\n\s+- How one hormone becomes many signals/);
  });

  it('asks for ids no item has, and a reply that merges as explanations', () => {
    expect(prompt).toContain('"exp1_"');
    const reply = { sections: [{ id: 's1', items: [{ id: 'exp1_a', type: 'explain', title: 'Why the signal lasts', text: 'Phosphodiesterase ends it.', source_excerpt: 'phosphodiesterase breaks down cAMP' }] }] };
    const parsed = parseFragment(reply, 's1');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const plan = planMerge(lecture, parsed.fragment, { skipDuplicates: true });
    expect(plan.totalAdded).toBe(1);
    expect(plan.sections[0].id).toBe('s1');
  });
});

describe('buildExplainPrompt: the narration, for a lecture made before it', () => {
  const lecture = (over: Partial<Course['sections'][number]> = {}, make?: string[]): Course =>
    ({
      schema_version: '1.0',
      metadata: { title: 'Signals', make },
      sections: [
        {
          id: 's1',
          title: 'Second messengers',
          items: [
            { id: 'q1', type: 'mcq', question: 'Why?', options: ['a', 'b'], correct_index: 0 },
            { id: 'g1', type: 'graphic', title: 'The cascade' },
          ],
          ...over,
        },
      ],
    }) as Course;

  it('asks what each section builds to, and how to write it', () => {
    const prompt = buildExplainPrompt(lecture());
    expect(prompt).toContain('its `builds_to`');
    expect(prompt).toContain(NARRATION_SPEC);
    expect(prompt).not.toContain('Already says what it builds to');
  });

  it('says which sections already have it, and which figures', () => {
    const prompt = buildExplainPrompt(lecture({ builds_to: 'To the cascade.' }));
    expect(prompt).toContain('Already says what it builds to');
    expect(prompt).toMatch(/Figures it already has, do not write these again:\n\s+- The cascade/);
  });

  it('only asks for figures the student chose to have', () => {
    expect(buildExplainPrompt(lecture())).toContain('no\n`svg`');
    expect(buildExplainPrompt(lecture({}, ['mcq', 'explain']))).not.toContain('no\n`svg`');
  });

  it('labels a reason from outside the slides', () => {
    expect(buildExplainPrompt(lecture())).toMatch(/reason for something the slides state/);
  });
});
