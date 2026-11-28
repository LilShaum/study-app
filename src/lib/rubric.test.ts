import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseCourse } from '@/schema/parseCourse';
import type { Course } from '@/schema/course';
import { formatScorecard, scoreCourse } from './rubric';

/*
 * The measured rubric (docs/rubric.md). To score a real lecture, which stays
 * outside the repo:
 *
 *   pdftotext -layout slides.pdf /tmp/slides.txt
 *   RUBRIC_COURSE=/path/lecture.study.json RUBRIC_SOURCE=/tmp/slides.txt \
 *     npx vitest run src/lib/rubric.test.ts --reporter=verbose
 *
 * pdftotext separates pages with a form feed, which is how a quote is looked
 * up on the slide it names.
 */

const load = (file: string): { course: Course; raw: string } => {
  const raw = fs.readFileSync(file, 'utf8');
  const parsed = parseCourse(JSON.parse(raw));
  if (!parsed.ok) throw new Error(parsed.error);
  return { course: parsed.course, raw };
};

const FIXTURES = path.resolve(__dirname, '../../scripts/__fixtures__');

describe('the measured rubric', () => {
  it('finds the fixture quotes in their source and reports n/a for what the file does not have', () => {
    const { course, raw } = load(path.join(FIXTURES, 'clean.study.json'));
    const pages = fs.readFileSync(path.join(FIXTURES, 'source.txt'), 'utf8').split('\f');
    const card = scoreCourse(course, raw, pages);
    const m = (id: string) => card.measures.find((x) => x.id === id)!;
    expect(m('excerpt-present').verdict).toBe('pass');
    expect(m('quote-found').value).toMatch(/of 6/);
    expect(m('slides-accounted').verdict).toBe('n/a');
    expect(m('problems-reach').verdict).toBe('n/a');
  });

  it('fails a quote that is nowhere in the source and a slide nothing accounts for', () => {
    const course = {
      schema_version: '1.0',
      metadata: { title: 'T', source_pages: { count: 3, unit: 'slide' } },
      sections: [
        {
          id: 's',
          title: 'S',
          source_range: 'slides 1–2',
          items: [
            { id: 'a', type: 'flashcard', front: 'f', back: 'b', source_excerpt: 'the cell membrane is a lipid bilayer', source_page: 'slide 1' },
            { id: 'b', type: 'flashcard', front: 'g', back: 'c', source_excerpt: 'mitochondria produce most of the ATP', source_page: 'slide 2' },
            { id: 'c', type: 'flashcard', front: 'h', back: 'd', source_excerpt: 'a sentence that was never on any slide at all', source_page: 'slide 2' },
          ],
        },
      ],
    } as unknown as Course;
    const pages = ['Intro: the cell membrane is a lipid bilayer', 'Energy: mitochondria produce most of the ATP', 'Questions?'];
    const card = scoreCourse(course, JSON.stringify(course), pages);
    const m = (id: string) => card.measures.find((x) => x.id === id)!;
    expect(m('quote-found').value).toBe('2 of 3 (67%)');
    expect(m('quote-found').detail).toBe('c');
    expect(m('quote-on-page').value).toBe('2 of 2 (100%)');
    expect(m('slides-accounted').verdict).toBe('fail');
    expect(m('slides-accounted').detail).toBe('slides 3');
    expect(formatScorecard(card)).toContain('✗ Slides accounted for');
  });

  it.runIf(!!process.env.RUBRIC_COURSE)('scores RUBRIC_COURSE', () => {
    const { course, raw } = load(process.env.RUBRIC_COURSE!);
    const pages = process.env.RUBRIC_SOURCE ? fs.readFileSync(process.env.RUBRIC_SOURCE, 'utf8').split('\f') : undefined;
    console.log(`\n${formatScorecard(scoreCourse(course, raw, pages))}\n`);
  });
});
