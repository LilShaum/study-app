import type { Course, StudyItem } from '@/schema/course';
import { analyseCourseGaps, type CourseGaps } from './courseGaps';

export type HealthSeverity = 'problem' | 'warning';

export interface HealthFinding {
  id: string;
  severity: HealthSeverity;
  /** One line a student can act on. */
  message: string;
  /** Item ids involved, when naming them helps. */
  items?: string[];
}

export interface CourseHealth {
  findings: HealthFinding[];
  problems: number;
  warnings: number;
  gaps: CourseGaps;
  /** Terms the generator declared but never defined. Null when it declared none. */
  declaredTermCoverage: { covered: number; total: number; missing: string[] } | null;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‐-―−]/g, '-')
    // Sub/superscript digits carry meaning (v₀, K₀.₅, IC₅₀); fold them to
    // ASCII before stripping punctuation, or "v₀" collapses to a bare "v".
    .replace(/[₀-₉]/g, (d) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(d)))
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Significant tokens of a term, with plurals folded.
 *
 * Matching declared terms to definition titles by whole phrase is too strict
 * in both the ways that actually occur: a generator declares "isozyme" and
 * titles the definition "Isozymes", or declares "concerted model" and titles
 * it "Concerted (MWC) model". Both are covered; whole-phrase matching calls
 * them missing, and telling a student a term is absent when it is present is
 * the one error this panel must not make.
 *
 * Kept identical to the matcher in scripts/audit-course.mjs so the CLI and
 * this panel never disagree about the same course.
 */
function tokens(s: string): Set<string> {
  return new Set(
    norm(s)
      .split(' ')
      .filter(Boolean)
      .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)),
  );
}

/** True when every token of the wanted term appears in the candidate. */
function coversTokens(have: Set<string>, want: Set<string>): boolean {
  for (const w of want) if (!have.has(w)) return false;
  return true;
}

function promptOf(item: StudyItem): string {
  switch (item.type) {
    case 'mcq':
      return item.question;
    case 'flashcard':
      return item.front;
    case 'definition':
      return item.term;
    default:
      return item.title;
  }
}

/**
 * The checks from scripts/audit-course.mjs that need no source material, run
 * in the app so a student sees them without a terminal.
 *
 * The auditor's sharpest check — does every source_excerpt really appear in
 * the notes — cannot live here, because the app never sees the notes. What it
 * CAN do is hold the generator to its own declared inventory
 * (`metadata.inventory.terms`) and catch the structural faults that make a
 * course quietly worse than it looks: an MCQ whose rationale array is
 * misaligned shows the wrong reason under the wrong option, a duplicate id
 * makes two items share one score, and a term that is defined but never asked
 * about is read and never retrieved.
 */
export function analyseCourseHealth(course: Course): CourseHealth {
  const findings: HealthFinding[] = [];
  const gaps = analyseCourseGaps(course);
  const items = course.sections.flatMap((s) => s.items);

  /* ---- structural faults ---- */
  const ids = items.map((i) => i.id);
  const dupIds = [...new Set(ids.filter((id, n) => ids.indexOf(id) !== n))];
  if (dupIds.length) {
    findings.push({
      id: 'duplicate-ids',
      severity: 'problem',
      message: `${dupIds.length} item id${dupIds.length === 1 ? ' is' : 's are'} used twice, so those items share one score.`,
      items: dupIds,
    });
  }

  const mcqs = items.filter((i): i is Extract<StudyItem, { type: 'mcq' }> => i.type === 'mcq');

  const badIdx = mcqs.filter(
    (m) => !Number.isInteger(m.correct_index) || m.correct_index < 0 || m.correct_index >= (m.options?.length ?? 0),
  );
  if (badIdx.length) {
    findings.push({
      id: 'correct-index-out-of-range',
      severity: 'problem',
      message: `${badIdx.length} question${badIdx.length === 1 ? ' has' : 's have'} an answer index pointing outside its options, so no option can be marked correct.`,
      items: badIdx.map((m) => m.id),
    });
  }

  const badRationale = mcqs.filter(
    (m) => Array.isArray(m.distractor_rationale) && m.distractor_rationale.length !== (m.options?.length ?? 0),
  );
  if (badRationale.length) {
    findings.push({
      id: 'rationale-misaligned',
      severity: 'problem',
      message: `${badRationale.length} question${badRationale.length === 1 ? ' has' : 's have'} explanations that don't line up with their options, so the wrong reason shows under the wrong answer.`,
      items: badRationale.map((m) => m.id),
    });
  }

  const noExplanation = mcqs.filter((m) => !String(m.explanation ?? '').trim());
  if (noExplanation.length) {
    findings.push({
      id: 'no-explanation',
      severity: 'warning',
      message: `${noExplanation.length} question${noExplanation.length === 1 ? '' : 's'} give no explanation after you answer.`,
      items: noExplanation.map((m) => m.id),
    });
  }

  const filler = mcqs.filter((m) => m.options?.some((o) => /^(all|none) of the above$/i.test(String(o).trim())));
  if (filler.length) {
    findings.push({
      id: 'filler-options',
      severity: 'warning',
      message: `${filler.length} question${filler.length === 1 ? ' uses' : 's use'} "all/none of the above" as an option.`,
      items: filler.map((m) => m.id),
    });
  }

  /* ---- duplicates ---- */
  const seen = new Map<string, string>();
  const dupPrompts: string[] = [];
  for (const item of items) {
    const key = `${item.type}:${norm(promptOf(item) ?? '')}`;
    if (seen.has(key)) dupPrompts.push(item.id);
    else seen.set(key, item.id);
  }
  if (dupPrompts.length) {
    findings.push({
      id: 'duplicate-prompts',
      severity: 'warning',
      message: `${dupPrompts.length} item${dupPrompts.length === 1 ? ' asks' : 's ask'} the same thing as another of the same type.`,
      items: dupPrompts,
    });
  }

  /* ---- metadata honesty ---- */
  if (course.metadata.total_items !== undefined && course.metadata.total_items !== items.length) {
    findings.push({
      id: 'stale-total',
      severity: 'warning',
      message: `The course claims ${course.metadata.total_items} items but holds ${items.length}.`,
    });
  }

  /* ---- diagram safety ---- */
  const unsafeSvg = items.filter(
    (i) => i.type === 'graphic' && /<script|\son[a-z]+\s*=|<foreignObject/i.test(String(i.svg ?? '')),
  );
  if (unsafeSvg.length) {
    findings.push({
      id: 'unsafe-svg',
      severity: 'warning',
      message: `${unsafeSvg.length} diagram${unsafeSvg.length === 1 ? ' contains' : 's contain'} scripting, which is stripped before display.`,
      items: unsafeSvg.map((i) => i.id),
    });
  }

  /* ---- coverage against the generator's own declared inventory ---- */
  const declared = course.metadata.inventory?.terms ?? null;
  let declaredTermCoverage: CourseHealth['declaredTermCoverage'] = null;

  if (declared && declared.length) {
    const defined = items
      .filter((i): i is Extract<StudyItem, { type: 'definition' }> => i.type === 'definition')
      .map((d) => tokens(d.term ?? ''));
    const missing = declared.filter((term) => {
      const want = tokens(term);
      if (!want.size) return false;
      return !defined.some((have) => coversTokens(have, want));
    });

    declaredTermCoverage = { covered: declared.length - missing.length, total: declared.length, missing };

    if (missing.length) {
      findings.push({
        id: 'declared-terms-missing',
        severity: 'problem',
        message: `${missing.length} of ${declared.length} terms the generator listed as being in your notes never got a definition: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? `, +${missing.length - 8} more` : ''}.`,
      });
    }
  }

  /* ---- testability ---- */
  if (gaps.untestedTerms.length) {
    findings.push({
      id: 'untested-terms',
      severity: 'warning',
      message: `${gaps.untestedTerms.length} defined term${gaps.untestedTerms.length === 1 ? ' is' : 's are'} never asked about in a question, so you read them but are never tested: ${gaps.untestedTerms.slice(0, 6).join(', ')}${gaps.untestedTerms.length > 6 ? '…' : ''}.`,
    });
  }

  if (items.length > 0 && gaps.gradableRatio < 0.4) {
    findings.push({
      id: 'low-gradable',
      severity: 'warning',
      message: `Only ${Math.round(gaps.gradableRatio * 100)}% of items can be scored — the rest are read but never tested.`,
    });
  }

  return {
    findings,
    problems: findings.filter((f) => f.severity === 'problem').length,
    warnings: findings.filter((f) => f.severity === 'warning').length,
    gaps,
    declaredTermCoverage,
  };
}
