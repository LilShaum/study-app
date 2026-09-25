import { describe, it, expect } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { analyseCourseGaps } from './courseGaps';
import { buildPractisePrompt } from './buildPractisePrompt';

function mcq(id: string, question: string, extra: Partial<StudyItem> = {}): StudyItem {
  return {
    id,
    type: 'mcq',
    question,
    options: ['a', 'b', 'c', 'd'],
    correct_index: 0,
    explanation: 'x',
    ...extra,
  } as StudyItem;
}
const def = (id: string, term: string, excerpt?: string) =>
  ({ id, type: 'definition', term, definition: 'd', source_excerpt: excerpt } as StudyItem);
const card = (id: string, front: string, back = 'b') =>
  ({ id, type: 'flashcard', front, back } as StudyItem);

const course = {
  schema_version: '1.0',
  metadata: { title: 'Enzyme Kinetics', course_code: 'BIOC301' },
  sections: [
    {
      id: 'kinetics',
      title: 'Kinetics',
      order: 1,
      items: [
        def('d1', 'Michaelis constant', 'Km, the Michaelis constant, equals (k-1 + k2)/k1.'),
        def('d2', 'turnover number', 'kcat, the turnover number, is molecules converted per site per second.'),
        mcq('q1', 'What does the Michaelis constant measure?', {
          source_excerpt: 'When [S] = Km, v0 = Vmax/2.',
        }),
      ],
    },
    {
      id: 'inhibition',
      title: 'Inhibition',
      order: 2,
      items: [
        def('d3', 'competitive inhibition', 'A competitive inhibitor binds free enzyme only.'),
        def('d4', 'IC50', 'IC50 is the inhibitor concentration that halves activity.'),
      ],
    },
  ],
} as Course;

describe('analyseCourseGaps', () => {
  const gaps = analyseCourseGaps(course);

  it('finds terms that are defined but never tested', () => {
    // "Michaelis constant" is named by q1, so it IS tested. The other three
    // are shown to the student and never asked about.
    expect(gaps.untestedTerms).toContain('turnover number');
    expect(gaps.untestedTerms).toContain('competitive inhibition');
    expect(gaps.untestedTerms).toContain('IC50');
    expect(gaps.untestedTerms).not.toContain('Michaelis constant');
  });

  it('matches terms as whole phrases, not substrings', () => {
    // A term that merely shares letters with gradable text is still untested;
    // substring matching here would silently return an empty gap list.
    const c = {
      ...course,
      sections: [{ id: 's', title: 'S', items: [def('d', 'Ki'), card('f', 'What is kinetics?')] }],
    } as Course;
    expect(analyseCourseGaps(c).untestedTerms).toContain('Ki');
  });

  it('flags sections with nothing that can be scored', () => {
    const thin = analyseCourseGaps(course).thinSections;
    expect(thin.map((s) => s.id)).toContain('inhibition');
    expect(thin.find((s) => s.id === 'inhibition')).toMatchObject({ total: 2, gradable: 0 });
  });

  it('reports the gradable ratio', () => {
    // 2 gradable (q1 is the only mcq... plus none) of 5 items.
    expect(gaps.totalItems).toBe(5);
    expect(gaps.gradableItems).toBe(1);
    expect(gaps.gradableRatio).toBeCloseTo(0.2);
  });

  it('counts items by type', () => {
    expect(gaps.byType).toEqual({ definition: 4, mcq: 1 });
  });
});

describe('buildPractisePrompt', () => {
  const prompt = buildPractisePrompt(course);

  it('feeds the recorded source excerpts back as the material to work from', () => {
    // This is what lets it generate without the original PDF.
    expect(prompt).toContain('Km, the Michaelis constant, equals');
    expect(prompt).toContain('kcat, the turnover number');
    expect(prompt).toContain('Source material this section was built from');
  });

  it('prefers the original notes when the chat still has them', () => {
    expect(prompt).toMatch(/if this conversation still has my original notes/i);
  });

  it('names the untested terms as the priority', () => {
    expect(prompt).toMatch(/no MCQ or flashcard makes the student use one/i);
    expect(prompt).toContain('turnover number');
    expect(prompt).toContain('IC50');
  });

  it('names sections that have nothing scorable', () => {
    expect(prompt).toMatch(/little or nothing that can be scored/i);
    expect(prompt).toContain('Inhibition');
  });

  it('flags a low gradable ratio', () => {
    expect(prompt).toMatch(/20%\) are MCQs or flashcards/);
  });

  it('lists what is already tested so it is not rewritten', () => {
    expect(prompt).toContain('What does the Michaelis constant measure?');
    expect(prompt).toMatch(/do NOT rewrite these/i);
  });

  it('asks for the fragment shape, not a whole course', () => {
    expect(prompt).toContain('"sections"');
    expect(prompt).toMatch(/do not return the whole course/i);
  });

  it('restates the item contract so the paste parses', () => {
    expect(prompt).toContain('distractor_rationale');
    expect(prompt).toContain('correct_index');
    expect(prompt).toContain('source_excerpt');
  });

  it('survives a course with no gaps and no excerpts', () => {
    const clean = {
      schema_version: '1.0',
      metadata: { title: 'Clean' },
      sections: [{ id: 's', title: 'S', items: [mcq('q', 'Q?'), card('f', 'F?')] }],
    } as Course;
    const p = buildPractisePrompt(clean);
    expect(p).toContain('(none recorded)');
    expect(p).not.toMatch(/never appear in any MCQ/i);
  });
});
