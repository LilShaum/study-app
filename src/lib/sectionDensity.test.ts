import { describe, it, expect } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { sectionDensity, slidesIn } from './sectionDensity';

describe('slidesIn', () => {
  it('counts the slides or pages a range names, leaving out a part number', () => {
    expect(slidesIn('slides 12–18')).toBe(7);
    expect(slidesIn('Part 3 slides 4–13, 21')).toBe(11);
    expect(slidesIn('Part 1, slide 17')).toBe(1);
    expect(slidesIn('pages 4-6 and 9')).toBe(4);
    expect(slidesIn('Part 1, slides 2–5; Part 2, slides 1–3')).toBe(7);
  });

  it('says nothing for a range without slide or page numbers', () => {
    expect(slidesIn('Chapter 4')).toBeNull();
    expect(slidesIn(undefined)).toBeNull();
  });
});

const items = (n: number): StudyItem[] =>
  Array.from({ length: n }, (_, i) => ({ id: `i${i}`, type: 'flashcard', front: 'f', back: 'b' }) as StudyItem);

// A made-up lecture shaped like a real one: most sections at three or four
// items a slide, a few packed slides, one section spread thin, plus one as
// thin as a core section can come back from Add material.
const lecture = (extra: [string, number, string][] = []): Course =>
  ({
    schema_version: '1.0',
    metadata: { title: 'T' },
    sections: (
      [
        ['plant organs', 17, 'slides 2–5'],
        ['leaf tissues', 21, 'slides 8–9'],
        ['stem layers', 6, 'slides 10–11'],
        ['root hairs', 11, 'slides 12–14'],
        ['stomata', 10, 'slide 17'],
        ['guard cells', 10, 'slides 21–22'],
        ['water potential', 5, 'slides 28–30'],
        ['xylem vessels', 13, 'slides 10–13'],
        ['transpiration stream', 11, 'slide 14'],
        ['phloem loading', 11, 'slides 15–18'],
        ...extra,
      ] as [string, number, string][]
    ).map(([title, n, source_range]) => ({ id: title, title, source_range, items: items(n) })),
  }) as Course;

describe('sectionDensity', () => {
  it('points at sections far past the lecture’s usual items per slide', () => {
    const r = sectionDensity(lecture())!;
    expect(r.typical).toBeCloseTo(3.96, 1);
    expect(r.dense.map((d) => d.title)).toEqual(['leaf tissues', 'stomata', 'transpiration stream']);
  });

  it('points at a section with few items for many slides', () => {
    const r = sectionDensity(lecture([['cohesion and tension', 15, 'Part 3 slides 4–13, 21']]))!;
    expect(r.sparse.map((d) => d.title)).toEqual(['water potential', 'cohesion and tension']);
  });

  it('says nothing for a lecture with too few ranges to know what is usual', () => {
    const c = lecture();
    c.sections = c.sections.slice(0, 3);
    expect(sectionDensity(c)).toBeNull();
  });
});

describe('where the course check and More practice use it', () => {
  it('names the sparse and dense sections in the check, and asks More practice for the sparse ones', async () => {
    const { analyseCourseHealth } = await import('./courseHealth');
    const { buildPractisePrompt } = await import('./buildPractisePrompt');
    const c = lecture();
    const h = analyseCourseHealth(c);
    expect(h.findings.find((f) => f.id === 'sparse-sections')?.message).toMatch(/water potential \(5 for 3 slides\)/);
    expect(h.findings.find((f) => f.id === 'dense-sections')?.message).toMatch(/leaf tissues \(21 for 2 slides\)/);
    expect(buildPractisePrompt(c)).toMatch(/"water potential" \(5 items for 3 slides\)/);
  });
});

describe('slidesIn, read as people write ranges', () => {
  it('reads "to", and does not take the p. of a word for pages', () => {
    expect(slidesIn('slides 12 to 18')).toBe(7);
    expect(slidesIn('Recap. 4')).toBeNull();
    expect(slidesIn('Step. 3, slides 1-2')).toBe(2);
  });
});
