import { describe, expect, it } from 'vitest';
import type { Course } from '@/schema/course';
import { citationsIn, studiesIn, studyItemIds, studyOf } from './studies';

// Made-up studies and authors: no course content in the repo.
const fc = (id: string, front: string, back = 'An answer.', tags?: string[]) => ({ id, type: 'flashcard' as const, front, back, tags, source_excerpt: 'x' });
const mcq = (id: string, question: string, explanation = 'Because.') => ({
  id,
  type: 'mcq' as const,
  question,
  options: ['a', 'b', 'c', 'd'],
  correct_index: 0,
  explanation,
  source_excerpt: 'Figure credit: Thornbury et al. (2011)',
});
const course = (items: unknown[]): Course =>
  ({ schema_version: '1.0', metadata: { title: 'T' }, sections: [{ id: 's1', title: 'S', items }] }) as unknown as Course;

describe('citationsIn', () => {
  it('reads the usual forms and keys them by first author and year', () => {
    expect(citationsIn('In Hollis (1981), and Marrow et al. (2000), then Fenwick & Hale, 1992.')).toEqual([
      { key: 'hollis 1981', label: 'Hollis (1981)' },
      { key: 'marrow 2000', label: 'Marrow et al. (2000)' },
      { key: 'fenwick 1992', label: 'Fenwick & Hale (1992)' },
    ]);
  });
  it('reads a possessive and "and" as one study', () => {
    expect(citationsIn("Ashby's (1977) task")[0]).toEqual({ key: 'ashby 1977', label: 'Ashby (1977)' });
    expect(citationsIn('Lark and Reed (1998)')[0].label).toBe('Lark & Reed (1998)');
  });
  it('reads a case study named by initials', () => {
    expect(citationsIn('What could patient KR do, unlike Hollis (1981)?')).toEqual([
      { key: 'patient kr', label: 'Patient KR' },
      { key: 'hollis 1981', label: 'Hollis (1981)' },
    ]);
    expect(citationsIn('Patient H.M. had')[0].label).toBe('Patient HM');
    expect(citationsIn('the patient MRI scan; patient Kim')).toEqual([]);
  });
  it('does not take acronyms, units, sentence openers, months or places for authors', () => {
    expect(citationsIn('EEG (1924) was first recorded; 20 Hz (2000) range; The (1990) edition')).toEqual([]);
    expect(citationsIn('rationing began in Britain, 1940; first described in October (1987)')).toEqual([]);
    expect(citationsIn('as Fenwick et al., 1992 showed')[0].key).toBe('fenwick 1992');
  });
});

describe('studyOf', () => {
  it('prefers the generator tag, and joins it with untagged cards citing the same study', () => {
    expect(studyOf(fc('a', 'What was the method?', 'x', ['attention', 'study:Hollis et al. (1981)']))).toEqual({
      key: 'hollis 1981',
      label: 'Hollis et al. (1981)',
    });
    expect(studyOf(fc('b', 'What did patient KR show?', 'x', ['study:Patient KR']))).toEqual({ key: 'patient kr', label: 'Patient KR' });
  });
  it('takes the study the question names before one the answer names', () => {
    expect(studyOf(mcq('q', 'Unlike Marrow (2000), what did Hollis (1981) find?', 'See Fenwick (1992).'))?.key).toBe('marrow 2000');
    expect(studyOf(mcq('q', 'What did the cue do?', 'As Hollis (1981) showed.'))?.key).toBe('hollis 1981');
  });
  it('ignores the slide excerpt, where image credits live', () => {
    expect(studyOf(mcq('q', 'What does the BOLD signal measure?'))).toBeNull();
  });
});

describe('studiesIn', () => {
  const c = course([
    fc('f1', 'Hollis (1981): what was the question?'),
    mcq('q1', 'What does the BOLD signal measure?'),
    fc('f2', 'Marrow et al. (2000): what were the conditions?'),
    mcq('q2', 'In Hollis (1981), what did the cue predict?'),
    { ...fc('f3', 'Hollis (1981): results?'), set_aside: true },
  ]);
  it('groups cards by study in lecture order, leaving out set-aside cards', () => {
    expect(studiesIn(c)).toEqual([
      { key: 'hollis 1981', label: 'Hollis (1981)', itemIds: ['f1', 'q2'] },
      { key: 'marrow 2000', label: 'Marrow et al. (2000)', itemIds: ['f2'] },
    ]);
  });
  it('gives the ids for all studies or one, and null when there are none', () => {
    expect([...studyItemIds(c, 'all')!]).toEqual(['f1', 'q2', 'f2']);
    expect([...studyItemIds(c, 'marrow 2000')!]).toEqual(['f2']);
    expect(studyItemIds(c, 'nobody 1900')).toBeNull();
    expect(studyItemIds(course([mcq('q', 'What is fMRI?')]), 'all')).toBeNull();
  });
});
