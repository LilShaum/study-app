import { describe, expect, it } from 'vitest';
import { decodeChoice, encodeChoice } from './practiceChoice';

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
