import { describe, expect, it } from 'vitest';
import { parseCourse } from './parseCourse';

const validCourse = {
  schema_version: '1.0',
  metadata: { title: 'Cell Biology', course_code: 'BIOL200' },
  sections: [
    {
      id: 's1',
      title: 'Membranes',
      items: [
        {
          id: 'q1',
          type: 'mcq',
          question: 'What is it?',
          options: ['a', 'b', 'c', 'd'],
          correct_index: 0,
          explanation: 'because',
        },
      ],
    },
  ],
};

describe('parseCourse', () => {
  it('accepts a well-formed course', () => {
    const result = parseCourse(validCourse);
    expect(result.ok).toBe(true);
  });

  it('reports the missing-fields message the vanilla app used', () => {
    const result = parseCourse({ metadata: {}, sections: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('missing schema_version');
  });

  it('rejects an unsupported schema_version by name', () => {
    const result = parseCourse({ ...validCourse, schema_version: '2.0' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('"2.0"');
  });

  it('rejects sections that are not an array', () => {
    const result = parseCourse({ ...validCourse, sections: {} });
    expect(result.ok).toBe(false);
  });

  it('rejects a malformed item inside an otherwise valid course', () => {
    const result = parseCourse({
      ...validCourse,
      sections: [{ id: 's1', title: 'S', items: [{ id: 'x', type: 'mcq' }] }],
    });
    expect(result.ok).toBe(false);
  });

  // The import -> edit -> export round-trip must be lossless: parseCourse
  // deliberately returns the caller's own object rather than Zod's parsed
  // copy so unknown/future fields survive. If this breaks, exporting a course
  // silently drops data the generator wrote.
  it('preserves unknown fields rather than stripping them', () => {
    const withExtras = {
      ...validCourse,
      future_top_level: 'keep me',
      metadata: { ...validCourse.metadata, unknown_meta: 42 },
      sections: [
        {
          ...validCourse.sections[0],
          items: [{ ...validCourse.sections[0].items[0], source_excerpt: 'from notes', odd_field: true }],
        },
      ],
    };

    const result = parseCourse(withExtras);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const reparsed = JSON.parse(JSON.stringify(result.course)) as typeof withExtras;
    expect(reparsed.future_top_level).toBe('keep me');
    expect(reparsed.metadata.unknown_meta).toBe(42);
    expect(reparsed.sections[0].items[0].odd_field).toBe(true);
    expect(reparsed.sections[0].items[0].source_excerpt).toBe('from notes');
  });

  it('accepts MCQs with other than four options', () => {
    const twoOption = {
      ...validCourse,
      sections: [
        {
          id: 's1',
          title: 'S',
          items: [
            { id: 'q', type: 'mcq', question: 'q', options: ['yes', 'no'], correct_index: 1, explanation: '' },
          ],
        },
      ],
    };
    expect(parseCourse(twoOption).ok).toBe(true);
  });
});

describe('parseCourse — the generator’s inventory is read forgivingly', () => {
  it('keeps the lecture when a note is too long or the wrong shape, and keeps the cleaned lists', () => {
    const raw = {
      schema_version: '1.0',
      metadata: {
        title: 'T',
        inventory: { terms: ['Stoma', { term: 'Xylem' }], mentioned: 'not a list', unclear_figures: ['x'.repeat(400), { slide: 12 }, 'slide 3: faint labels'] },
      },
      sections: [{ id: 's', title: 'S', items: [{ id: 'f', type: 'flashcard', front: 'Q?', back: 'A.', source_excerpt: 'e' }] }],
    };
    const r = parseCourse(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.course.metadata.inventory?.unclear_figures).toEqual(['x'.repeat(300), 'slide 3: faint labels']);
    expect(r.course.metadata.inventory?.terms).toEqual(['Stoma']);
    expect(r.course.metadata.inventory?.mentioned).toBeUndefined();
  });
});
