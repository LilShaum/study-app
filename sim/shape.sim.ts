import { readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import type { Course, StudyItem } from '@/schema/course';
import { sortedSections } from '@/lib/sortedSections';
import { acceptedForms, normalise } from '@/lib/typedAnswer';
import { coversTokens, termTokens } from '@/lib/termMatch';

/**
 * SIM_COURSE=path/to/course.study.json npm run sim:shape
 *
 * Measures a real course's SHAPE — counts and rates, never content — and
 * writes it to sim/results/shape.json, ready to add to SHAPES in
 * sim/course.ts. Safe to commit: nothing of the notes survives.
 */
it('measure a course shape', () => {
  const path = process.env.SIM_COURSE;
  if (!path) throw new Error('Set SIM_COURSE to a .study.json path');
  const course = JSON.parse(readFileSync(path, 'utf8')) as Course;
  const defs = course.sections.flatMap((s) => s.items).filter((i): i is Extract<StudyItem, { type: 'definition' }> => i.type === 'definition');
  const namesOf = (d: (typeof defs)[number]) => {
    const t = d.term ?? '';
    return [t, t.replace(/\([^)]*\)/g, ' '), ...[...t.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]), ...(d.also_known_as ?? [])]
      .map(termTokens)
      .filter((x) => x.size);
  };
  const textOf = (i: StudyItem): string => {
    switch (i.type) {
      case 'mcq': return [i.question, i.options?.[i.correct_index] ?? '', i.explanation ?? ''].join(' ');
      case 'flashcard': return [i.front, i.back].join(' ');
      case 'example': return [i.title, i.context ?? '', ...(i.steps ?? []), i.takeaway ?? ''].join(' ');
      case 'graphic': return [i.title, i.caption ?? '', i.alt_text].join(' ');
      default: return '';
    }
  };
  let named = 0, untagged = 0, others = 0;
  const sections = sortedSections(course).map((s) => {
    const sdefs = s.items.filter((i) => i.type === 'definition') as typeof defs;
    for (const i of s.items.filter((x) => !['definition'].includes(x.type))) {
      const text = termTokens(textOf(i));
      const n = sdefs.filter((d) => namesOf(d).some((t) => coversTokens(text, t))).length;
      others++;
      named += n;
      if (!n) untagged++;
    }
    const count = (t: string) => s.items.filter((i) => i.type === t).length;
    return { definition: count('definition'), mcq: count('mcq'), flashcard: count('flashcard'), example: count('example'), graphic: count('graphic') };
  });
  const forms = new Set(defs.flatMap((d) => acceptedForms(d).map((f) => f.norm)));
  const mcqs = course.sections.flatMap((s) => s.items).filter((i) => i.type === 'mcq') as Extract<StudyItem, { type: 'mcq' }>[];
  const shape = {
    name: 'measured-CHANGE-ME',
    source: `Measured ${new Date().toISOString().slice(0, 10)} from a real course (counts only).`,
    sections,
    termsPerItem: +(named / Math.max(1, others - untagged)).toFixed(2),
    untagged: +(untagged / Math.max(1, others)).toFixed(2),
    abbreviated: +(defs.filter((d) => /\(/.test(d.term ?? '') || d.also_known_as?.length).length / Math.max(1, defs.length)).toFixed(2),
    answerIsTerm: +(mcqs.filter((q) => forms.has(normalise(q.options[q.correct_index] ?? ''))).length / Math.max(1, mcqs.length)).toFixed(2),
  };
  writeFileSync('sim/results/shape.json', JSON.stringify(shape, null, 1));
});
