import { describe, it, expect } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { parseCourse } from '@/schema/parseCourse';
import { parseFragment } from '@/schema/fragment';
import { pagesIn, runsOf, sourceCoverage } from './sourceCoverage';
import { analyseCourseHealth } from './courseHealth';
import { applyMerge, planMerge } from './mergeFragment';
import { buildFixPrompt, planFixes } from './buildFixPrompt';

const card = (id: string, page?: string): StudyItem =>
  ({ id, type: 'flashcard', front: `q ${id}`, back: `a ${id}`, source_excerpt: 'x', ...(page ? { source_page: page } : {}) }) as StudyItem;

function course(sections: { range?: string; items: StudyItem[] }[], source_pages?: unknown): Course {
  return {
    schema_version: '1.0',
    metadata: { title: 'T', ...(source_pages ? { source_pages } : {}) },
    sections: sections.map((s, i) => ({ id: `s${i}`, title: `S${i}`, source_range: s.range, items: s.items })),
  } as Course;
}

describe('pagesIn', () => {
  it('reads ranges, lists and single slides, only with the unit word', () => {
    expect(pagesIn('slides 3–5')).toEqual([3, 4, 5]);
    expect(pagesIn('slides 3, 7 and 9')).toEqual([3, 7, 9]);
    expect(pagesIn('page 4')).toEqual([4]);
    expect(pagesIn('figure 3.2, 1998')).toEqual([]);
  });
});

describe('runsOf', () => {
  it('joins consecutive numbers', () => {
    expect(runsOf([2, 3, 4, 9, 11, 12])).toBe('2–4, 9, 11–12');
  });
});

describe('sourceCoverage', () => {
  it('is null when the file does not account for its slides', () => {
    expect(sourceCoverage(course([{ range: 'slides 1–4', items: [card('a')] }]))).toBeNull();
  });

  it('finds slides neither taught nor explained', () => {
    const c = course(
      [
        { range: 'slides 3–5', items: [card('a')] },
        { items: [card('b', 'slide 8')] },
      ],
      { count: 10, unit: 'slide', not_taught: [{ range: 'slides 1–2', why: 'title and outline' }] },
    );
    expect(sourceCoverage(c)).toMatchObject({ count: 10, taught: 4, notTaught: 2, missing: [6, 7, 9, 10] });
  });

  it('counts a figure by where it is', () => {
    const fig = { id: 'g', type: 'graphic', title: 'F', where: 'slide 2', source_excerpt: 'Figure: x' } as StudyItem;
    const c = course([{ range: 'slide 1', items: [fig] }], { count: 2 });
    expect(sourceCoverage(c)?.missing).toEqual([]);
  });

  it('stays out of material numbered more than once', () => {
    const c = course([{ range: 'Part 2, slides 1–4', items: [card('a')] }], { count: 4 });
    expect(sourceCoverage(c)).toBeNull();
  });

  it('reports the missing slides in the lecture check, with the slides to look at', () => {
    const c = course([{ range: 'slides 1–3', items: [card('a')] }], { count: 5 });
    const f = analyseCourseHealth(c).findings.find((x) => x.id === 'uncovered-slides');
    expect(f?.message).toContain('slides 4–5');
  });

  it('says nothing when every slide is accounted for', () => {
    const c = course([{ range: 'slides 2–3', items: [card('a')] }], { count: 3, not_taught: [{ range: 'slide 1', why: 'title' }] });
    expect(analyseCourseHealth(c).findings.some((x) => x.id === 'uncovered-slides')).toBe(false);
  });
});

describe('the course file', () => {
  it('keeps source_page and source_pages, and drops a malformed map without refusing the lecture', () => {
    const ok = parseCourse({
      schema_version: '1.0',
      metadata: { title: 'T', source_pages: { count: 12, unit: 'slide' } },
      sections: [{ id: 's', title: 'S', items: [{ id: 'a', type: 'flashcard', front: 'f', back: 'b', source_page: 12 }] }],
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.course.metadata.source_pages?.count).toBe(12);
    expect(ok.course.sections[0].items[0].source_page).toBe('12');

    const bad = parseCourse({
      schema_version: '1.0',
      metadata: { title: 'T', source_pages: { count: 'many' } },
      sections: [{ id: 's', title: 'S', items: [{ id: 'a', type: 'flashcard', front: 'f', back: 'b' }] }],
    });
    expect(bad.ok).toBe(true);
    if (bad.ok) expect(bad.course.metadata.source_pages).toBeUndefined();
  });
});

describe('Fix and missing slides', () => {
  const c = course([{ range: 'slides 1–3', items: [card('a')] }], { count: 6, unit: 'slide' });

  it('asks about the slides nothing comes from', () => {
    expect(planFixes(c).missingSlides).toBe('slides 4–6');
    expect(planFixes(c).empty).toBe(false);
    expect(buildFixPrompt(c)).toContain('from slides 4–6');
  });

  it('joins the slides the reply says teach nothing, keeping the lecture\'s count', () => {
    const parsed = parseFragment({ source_pages: { count: 99, not_taught: [{ range: 'slides 4–6', why: 'questions for class' }] } }, 's0');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const plan = planMerge(c, parsed.fragment);
    expect(plan.totalAccounted).toBe(1);
    const merged = applyMerge(c, plan);
    expect(merged.metadata.source_pages?.count).toBe(6);
    expect(sourceCoverage(merged)?.missing).toEqual([]);
  });
});
