import { describe, expect, it } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { decodeChoice, encodeChoice, kindOfItem, kindsIn } from './practiceChoice';
import { buildSessionItems } from './buildSessionItems';

describe('decodeChoice', () => {
  const base = { kinds: ['flashcards'], which: ['due', 'new'], order: 'weakest' };

  it('reads back what it wrote, a cap on new cards included', () => {
    const choice = { kinds: ['flashcards' as const], which: ['due' as const, 'new' as const], order: 'weakest' as const, newCap: 10 };
    expect(decodeChoice(encodeChoice(choice))).toEqual(choice);
  });

  it('drops a cap that is not a whole number from 1 to 100', () => {
    for (const newCap of [0, -3, 2.5, 1000, '10', null]) expect(decodeChoice(JSON.stringify({ ...base, newCap }))?.newCap).toBeUndefined();
  });

  it('gives nothing for a link with no kind or no cards ticked, or not JSON', () => {
    expect(decodeChoice(JSON.stringify({ ...base, kinds: ['nonsense'] }))).toBeNull();
    expect(decodeChoice(JSON.stringify({ ...base, which: [] }))).toBeNull();
    expect(decodeChoice('{not json')).toBeNull();
  });
});

describe('select all that apply in Practice', () => {
  const multi = { id: 'm', type: 'multi', question: 'Which are true?', options: ['a', 'b', 'c', 'd'], correct: [0, 2] } as StudyItem;
  const lecture = {
    schema_version: '1.0',
    metadata: { title: 'T' },
    sections: [{ id: 's', title: 'S', items: [multi, { id: 'f', type: 'flashcard', front: 'F?', back: 'B.' } as StudyItem] }],
  } as Course;

  it('is practised as multiple choice: options to pick from', () => {
    expect(kindOfItem(multi)).toBe('questions');
    expect(kindsIn([lecture])).toEqual(['questions', 'flashcards']);
  });

  it('comes in a sitting with Multiple choice ticked, and not with Flashcards alone', () => {
    const sitting = (kinds: ('questions' | 'flashcards')[]) =>
      buildSessionItems(lecture, 'practice', { practice: { kinds: new Set(kinds), which: new Set(['new']), order: 'inorder' } }).map((i) => i.id);
    expect(sitting(['questions'])).toEqual(['m']);
    expect(sitting(['flashcards'])).toEqual(['f']);
  });
});
