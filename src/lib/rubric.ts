import type { Course, StudyItem } from '@/schema/course';
import { analyseCourseHealth, findingGroup, lengthTellFires } from './courseHealth';
import { pagesIn, runsOf, sourceCoverage } from './sourceCoverage';
import { answerReached } from './problemAnswer';

/**
 * The measured half of the course-generation rubric (docs/rubric.md): what a
 * script can count on a generated lecture, the same way every time, so runs
 * on different classes and prompt versions can be compared. The judged half
 * (accuracy on a sample, whether the teaching works) is read by a person or a
 * fresh model, with the criteria in docs/rubric.md.
 *
 * Nothing here reads course content into the report beyond item ids, so a
 * scorecard can be kept in the repo while the lecture stays out of it.
 */

export type Verdict = 'pass' | 'warn' | 'fail' | 'n/a';

export interface Measure {
  id: string;
  label: string;
  /** What was measured, as a student-free line: "142 of 150 (95%)". */
  value: string;
  target: string;
  verdict: Verdict;
  /** Item ids or slide numbers behind a warn or fail, for the reader to open. */
  detail?: string;
}

export interface Scorecard {
  title: string;
  sections: number;
  items: number;
  byType: Record<string, number>;
  /** Characters of the file, compact: the size of the reply, roughly its output tokens × 3.5. */
  chars: number;
  measures: Measure[];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‐-―−]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const OUTSIDE = /^\s*outside the (slides|notes|source)\b/i;
const FIGURE = /^\s*(figure|fig\.|table|equation|diagram)\s*:/i;

/** A quote is found when every part between ellipses has a run of six words (or all of a shorter part) in the text. */
function quoteIn(excerpt: string, text: string): boolean {
  const parts = excerpt.split(/\s*(?:\.\.\.|…)\s*/).filter((p) => p.trim());
  if (!parts.length) return false;
  return parts.every((part) => {
    const words = norm(part).split(' ').filter(Boolean);
    if (!words.length) return true;
    const n = Math.min(words.length, 6);
    for (let i = 0; i + n <= words.length; i++) if (text.includes(words.slice(i, i + n).join(' '))) return true;
    return false;
  });
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const share = (n: number, d: number) => `${n} of ${d} (${pct(n, d)}%)`;
const ids = (xs: { id: string }[], max = 12) =>
  xs.slice(0, max).map((x) => x.id).join(', ') + (xs.length > max ? `, +${xs.length - max} more` : '');

/**
 * @param pages the source's text, one entry per slide or page (pdftotext
 *   writes a form feed between pages: split on "\f"). Without it the
 *   grounding measures are n/a.
 */
export function scoreCourse(course: Course, raw: string, pages?: string[]): Scorecard {
  const items: StudyItem[] = course.sections.flatMap((s) => s.items);
  const byType: Record<string, number> = {};
  for (const i of items) byType[i.type] = (byType[i.type] ?? 0) + 1;
  const measures: Measure[] = [];
  const add = (m: Measure) => measures.push(m);

  // ---- Grounding: is each quote on the slide it names? ----
  const quoted = items.filter((i) => i.source_excerpt?.trim() && !OUTSIDE.test(i.source_excerpt));
  const outside = items.filter((i) => i.source_excerpt && OUTSIDE.test(i.source_excerpt));
  const noExcerpt = items.filter((i) => !i.source_excerpt?.trim());
  add({
    id: 'excerpt-present',
    label: 'Every item quotes its passage',
    value: share(items.length - noExcerpt.length, items.length),
    target: '100%',
    verdict: noExcerpt.length ? 'fail' : 'pass',
    detail: noExcerpt.length ? ids(noExcerpt) : undefined,
  });
  const numbered = !!course.metadata.source_pages || course.sections.some((s) => pagesIn(s.source_range).length);
  const noPage = quoted.filter((i) => !i.source_page && !(i.type === 'graphic' && i.where));
  add({
    id: 'page-present',
    label: 'Every quote names its slide',
    value: numbered ? share(quoted.length - noPage.length, quoted.length) : 'source not numbered',
    target: '100% where the source is numbered',
    verdict: !numbered ? 'n/a' : noPage.length === 0 ? 'pass' : pct(noPage.length, quoted.length) <= 5 ? 'warn' : 'fail',
    detail: numbered && noPage.length ? ids(noPage) : undefined,
  });
  if (pages?.length) {
    const texts = pages.map(norm);
    const whole = texts.join(' ');
    const checkable = quoted.filter((i) => !FIGURE.test(i.source_excerpt!));
    const onPage: StudyItem[] = [];
    const elsewhere: StudyItem[] = [];
    const missing: StudyItem[] = [];
    for (const i of checkable) {
      const named = pagesIn(i.source_page ?? (i.type === 'graphic' ? i.where : undefined)).filter((n) => n >= 1 && n <= texts.length);
      if (named.length && quoteIn(i.source_excerpt!, named.map((n) => texts[n - 1]).join(' '))) onPage.push(i);
      else if (quoteIn(i.source_excerpt!, whole)) elsewhere.push(i);
      else missing.push(i);
    }
    add({
      id: 'quote-found',
      label: 'Quotes found in the source, word for word',
      value: share(checkable.length - missing.length, checkable.length),
      target: '≥ 95% (the rest: check by eye; a paraphrase of handwriting is expected)',
      verdict: pct(missing.length, checkable.length) <= 5 ? 'pass' : pct(missing.length, checkable.length) <= 15 ? 'warn' : 'fail',
      detail: missing.length ? ids(missing) : undefined,
    });
    add({
      id: 'quote-on-page',
      label: 'Quotes on the slide they name',
      value: share(onPage.length, checkable.length - missing.length),
      target: '≥ 95%',
      verdict: !numbered ? 'n/a' : pct(elsewhere.length, checkable.length - missing.length) <= 5 ? 'pass' : 'warn',
      detail: elsewhere.length ? ids(elsewhere) : undefined,
    });
    const figures = quoted.length - checkable.length;
    if (figures) {
      add({ id: 'quote-figure', label: 'Quotes from figures (not in the text layer: check by eye)', value: String(figures), target: 'reported', verdict: 'n/a' });
    }
  } else {
    add({ id: 'quote-found', label: 'Quotes found in the source, word for word', value: 'no source text given', target: '≥ 95%', verdict: 'n/a' });
  }
  add({ id: 'outside', label: 'Items labelled "Outside the slides"', value: String(outside.length), target: 'reported; none scored', verdict: outside.some((i) => i.type !== 'explain' && i.type !== 'graphic') ? 'warn' : 'pass', detail: outside.filter((i) => i.type !== 'explain' && i.type !== 'graphic').map((i) => i.id).join(', ') || undefined });

  // ---- Coverage ----
  const coverage = sourceCoverage(course);
  const pageCount = pages?.filter((p) => p.trim()).length;
  add({
    id: 'slides-accounted',
    label: 'Slides accounted for (taught, or untaught with a reason)',
    value: coverage ? `${coverage.count - coverage.missing.length} of ${coverage.count}` : course.metadata.source_pages ? 'cannot check (numbered more than once)' : 'no source_pages in the file',
    target: 'every slide',
    verdict: !coverage ? (numbered ? 'fail' : 'n/a') : coverage.missing.length ? 'fail' : 'pass',
    detail: coverage?.missing.length ? `${coverage.unit}s ${runsOf(coverage.missing)}` : undefined,
  });
  if (coverage && pageCount) {
    add({
      id: 'slide-count',
      label: 'Slide count the file states vs the source',
      value: `${coverage.count} vs ${pageCount}`,
      target: 'equal',
      verdict: coverage.count === pageCount ? 'pass' : 'warn',
    });
  }
  const health = analyseCourseHealth(course);
  const terms = health.declaredTermCoverage;
  add({
    id: 'terms-defined',
    label: 'Declared terms with a definition',
    value: terms ? share(terms.covered, terms.total) : 'no terms declared',
    target: '100%',
    verdict: !terms ? 'n/a' : terms.missing.length ? 'fail' : 'pass',
    detail: terms?.missing.slice(0, 12).join(', ') || undefined,
  });

  // ---- Questions ----
  const mcqs = items.filter((i) => i.type === 'mcq');
  const len = health.quality.length;
  add({
    id: 'longest-correct',
    label: 'MCQs a "pick the longest" guess gets right',
    value: mcqs.length ? `${Math.round(len.longestIsCorrect)} of ${len.mcqs} (${pct(len.longestIsCorrect, len.mcqs)}%)` : 'no MCQs',
    target: '≤ 25% (chance); the app flags from 35%',
    verdict: !mcqs.length ? 'n/a' : lengthTellFires(len) ? 'fail' : pct(len.longestIsCorrect, len.mcqs) > 30 ? 'warn' : 'pass',
  });
  const diff = (d: string) => mcqs.filter((m) => m.difficulty === d).length;
  const easy = diff('easy');
  const hard = diff('hard');
  add({
    id: 'difficulty-mix',
    label: 'MCQ difficulty: easy / medium / hard',
    value: mcqs.length ? `${pct(easy, mcqs.length)}% / ${pct(diff('medium'), mcqs.length)}% / ${pct(hard, mcqs.length)}%` : 'no MCQs',
    target: 'easy ≤ 25%, hard ≥ 25%',
    verdict: !mcqs.length ? 'n/a' : pct(easy, mcqs.length) <= 25 && pct(hard, mcqs.length) >= 25 ? 'pass' : 'warn',
  });
  const q = health.quality;
  add({
    id: 'beyond-recall',
    label: 'Sections with nothing beyond recall',
    value: String(q.recallOnlySections.length),
    target: '0',
    verdict: q.recallOnlySections.length ? 'warn' : 'pass',
    detail: q.recallOnlySections.length ? `${q.recallOnlySections.length} section(s)` : undefined,
  });
  add({ id: 'source-cued', label: 'Questions that cite the slides ("according to…")', value: String(q.sourceCued.length), target: '0', verdict: q.sourceCued.length ? 'warn' : 'pass', detail: q.sourceCued.slice(0, 12).join(', ') || undefined });

  // ---- The lecture check, by group ----
  const groups = { fix: 0, slides: 0, minor: 0 } as Record<string, number>;
  const fixIds = new Set<string>();
  for (const f of health.findings) {
    const g = findingGroup(f);
    groups[g] = (groups[g] ?? 0) + 1;
    if (g === 'fix') fixIds.add(f.id);
  }
  add({
    id: 'check-fix',
    label: 'Lecture check: findings to fix',
    value: String(groups.fix),
    target: '0',
    verdict: groups.fix ? 'fail' : 'pass',
    detail: [...fixIds].join(', ') || undefined,
  });
  add({ id: 'check-slides', label: 'Lecture check: to check on the slides', value: String(groups.slides), target: 'reported', verdict: 'n/a' });

  // ---- Problems ----
  const problems = items.filter((i): i is Extract<StudyItem, { type: 'problem' }> => i.type === 'problem');
  const unreached = problems.filter((p) => answerReached(p) === false);
  add({
    id: 'problems-reach',
    label: 'Problems whose worked steps reach their answer',
    value: problems.length ? share(problems.length - unreached.length, problems.length) : 'no problems',
    target: '100%',
    verdict: !problems.length ? 'n/a' : unreached.length ? 'fail' : 'pass',
    detail: unreached.length ? ids(unreached) : undefined,
  });

  // ---- Figures ----
  const graphics = items.filter((i) => i.type === 'graphic');
  const untestedKnow = health.gaps.untestedFigures;
  add({
    id: 'figures-tested',
    label: 'Figures marked "know" that a question asks about',
    value: graphics.length ? `${untestedKnow.length} untested of ${graphics.filter((g) => g.type === 'graphic' && g.purpose === 'know').length} marked know` : 'no figures',
    target: '0 untested',
    verdict: !graphics.length ? 'n/a' : untestedKnow.length ? 'warn' : 'pass',
  });

  return {
    title: course.metadata.title,
    sections: course.sections.length,
    items: items.length,
    byType,
    chars: raw.length,
    measures,
  };
}

const MARK: Record<Verdict, string> = { pass: '✓', warn: '!', fail: '✗', 'n/a': '·' };

export function formatScorecard(s: Scorecard): string {
  const lines = [
    `${s.title}: ${s.sections} sections, ${s.items} items (${Object.entries(s.byType).map(([k, v]) => `${v} ${k}`).join(', ')})`,
    `File: ${s.chars.toLocaleString('en')} characters, about ${Math.round(s.chars / 3.5).toLocaleString('en')} output tokens`,
    '',
    ...s.measures.map((m) => `${MARK[m.verdict]} ${m.label}: ${m.value}  [target ${m.target}]${m.detail ? `\n    ${m.detail}` : ''}`),
    '',
    `${s.measures.filter((m) => m.verdict === 'fail').length} fail, ${s.measures.filter((m) => m.verdict === 'warn').length} warn, ${s.measures.filter((m) => m.verdict === 'pass').length} pass`,
  ];
  return lines.join('\n');
}
