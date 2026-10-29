import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import { ALL_KINDS, kindsOf, makeOnlyBlock, storedKinds } from './makeKinds';
import { buildNewCoursePrompt } from './buildNewCoursePrompt';
import { buildAddPrompt } from './buildAddPrompt';
import { analyseCourseHealth } from './courseHealth';

const course = (make?: string[]): Course =>
  ({
    schema_version: '1.0',
    metadata: { title: 'T', ...(make ? { make } : {}), inventory: { terms: ['Osmosis'] } },
    sections: [{ id: 's1', title: 'S', items: [{ id: 'f1', type: 'flashcard', front: 'What is osmosis?', back: 'Water moving across a membrane.' }] }],
  }) as unknown as Course;

describe('makeKinds', () => {
  it('asks for nothing different when every kind is chosen', () => {
    expect(makeOnlyBlock(ALL_KINDS)).toBe('');
    expect(storedKinds(ALL_KINDS)).toBeUndefined();
    expect(kindsOf(course())).toEqual(ALL_KINDS);
  });

  it('tells the AI only the kinds chosen, and where the rest of the content goes', () => {
    const block = makeOnlyBlock(['flashcard']);
    expect(block).toMatch(/I want only these kinds of item: plain one-fact `flashcard` items/);
    expect(block).toMatch(/Do not write: `mcq` items/);
    expect(block).toMatch(/leave `metadata.inventory.terms` empty/);
    expect(block).toMatch(/still covered/);
  });

  it('is carried by the new-lecture prompt, and the add prompt keeps the lecture’s choice', () => {
    expect(buildNewCoursePrompt(undefined, undefined, false, ['flashcard', 'mcq'])).toMatch(/WHAT TO MAKE/);
    expect(buildNewCoursePrompt()).not.toMatch(/WHAT TO MAKE/);
    expect(buildAddPrompt(course(['flashcard']))).toMatch(/I want only these kinds of item: plain one-fact `flashcard` items\./);
  });

  it('keeps a stored choice, and ignores what is not a kind', () => {
    expect(kindsOf(course(['flashcard', 'nonsense']))).toEqual(['flashcard']);
    expect(storedKinds(['mcq', 'flashcard'])).toEqual(['mcq', 'flashcard']);
  });

  it('stops the lecture check asking for kinds the student chose not to have', () => {
    const ids = (c: Course) => analyseCourseHealth(c).findings.map((f) => f.id);
    // Terms listed but never defined: a gap with Terms chosen, on purpose without.
    expect(ids(course())).toContain('declared-terms-missing');
    expect(ids(course(['flashcard']))).not.toContain('declared-terms-missing');
  });
});
