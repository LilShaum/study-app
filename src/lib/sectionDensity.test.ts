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

// Item counts and slide ranges of the owner's first lecture from the
// current prompt (Nervous System, parts 1 and 2), plus one section as thin as
// the first Add material run made a core one (15 items for 11 slides).
const lecture = (extra: [string, number, string][] = []): Course =>
  ({
    schema_version: '1.0',
    metadata: { title: 'T' },
    sections: (
      [
        ['organization', 17, 'slides 2–5'],
        ['cranial nerves', 21, 'slides 8–9'],
        ['spinal nerves', 6, 'slides 10–11'],
        ['protection', 11, 'slides 12–14'],
        ['hindbrain', 10, 'slide 17'],
        ['limbic', 10, 'slides 21–22'],
        ['lobes and somatotopy', 5, 'slides 28–30'],
        ['skin receptors', 13, 'slides 10–13'],
        ['dorsal column pathway', 11, 'slide 14'],
        ['proprioceptors', 11, 'slides 15–18'],
        ...extra,
      ] as [string, number, string][]
    ).map(([title, n, source_range]) => ({ id: title, title, source_range, items: items(n) })),
  }) as Course;

describe('sectionDensity', () => {
  it('points at sections far past the lecture’s usual items per slide', () => {
    const r = sectionDensity(lecture())!;
    expect(r.typical).toBeCloseTo(3.96, 1);
    expect(r.dense.map((d) => d.title)).toEqual(['cranial nerves', 'hindbrain', 'dorsal column pathway']);
  });

  it('points at a section with few items for many slides', () => {
    const r = sectionDensity(lecture([['action potential propagation', 15, 'Part 3 slides 4–13, 21']]))!;
    expect(r.sparse.map((d) => d.title)).toEqual(['lobes and somatotopy', 'action potential propagation']);
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
    expect(h.findings.find((f) => f.id === 'sparse-sections')?.message).toMatch(/lobes and somatotopy \(5 for 3 slides\)/);
    expect(h.findings.find((f) => f.id === 'dense-sections')?.message).toMatch(/cranial nerves \(21 for 2 slides\)/);
    expect(buildPractisePrompt(c)).toMatch(/"lobes and somatotopy" \(5 items for 3 slides\)/);
  });
});
