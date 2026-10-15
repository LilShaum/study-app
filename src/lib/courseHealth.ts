import type { Course, StudyItem } from '@/schema/course';
import { analyseCourseGaps, type CourseGaps } from './courseGaps';
import { coversTokens, normaliseTerm, termTokens } from './termMatch';
import { analyseQuestionQuality, type QuestionQuality } from './questionQuality';
import { givesAway, restatesDefinition, sameFact, sameName, type Asked } from './contentChecks';
import { acceptedForms, normalise } from './typedAnswer';
import { sectionDensity } from './sectionDensity';

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
  /** What the questions ask, as opposed to whether the file is well formed. */
  quality: QuestionQuality;
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

  // The generator's contract asks for exactly four options. Fewer is a
  // weaker question rather than a broken one — a two-option MCQ is a coin
  // flip — and it is now fixable in place, so it is worth saying.
  const wrongOptionCount = mcqs.filter((m) => (m.options?.length ?? 0) !== 4);
  if (wrongOptionCount.length) {
    findings.push({
      id: 'option-count',
      severity: 'warning',
      message: `${wrongOptionCount.length} question${wrongOptionCount.length === 1 ? ' has' : 's have'} something other than four options, which the generator's contract asks for. You can add or remove options in Browse.`,
      items: wrongOptionCount.map((m) => m.id),
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
    const key = `${item.type}:${normaliseTerm(promptOf(item) ?? '')}`;
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
  // The running head carries the course code, because on a course page the
  // course's own title is already set large under the tree and a second copy
  // of it in the head says nothing. Without a code the head falls back to
  // that title, which on a phone is long enough to be clipped to "…". The
  // generator can only supply a code the source actually states, so when the
  // slides never name the unit this is the one thing worth asking a person.
  // Only worth raising when the fallback actually misbehaves. A code is
  // optional in the schema and plenty of courses have none; nagging every
  // one of them is noise. A title this long is the case that gets clipped.
  // Measured, not guessed: at 390px the location slot is 175px wide, and in
  // the letterspaced capitals the head is set in that holds 13 of the widest
  // glyphs and around 20 average ones. A 28-character title clips.
  const HEAD_FITS = 20;
  const codeless = !String(course.metadata.course_code ?? '').trim();
  if (codeless && course.metadata.title.length > HEAD_FITS) {
    findings.push({
      id: 'no-course-code',
      severity: 'warning',
      message:
        'No class code is set, so the top bar falls back to this long title and clips it. Add one under Edit details, e.g. BIOL 365.',
    });
  }

  if (course.metadata.total_items !== undefined && course.metadata.total_items !== items.length) {
    findings.push({
      id: 'stale-total',
      severity: 'warning',
      message: `The lecture claims ${course.metadata.total_items} items but holds ${items.length}.`,
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
  // Terms the generator says the notes only name were never meant to get a
  // definition (prompts/generator.md), so they are not counted as missing.
  const mentioned = new Set((course.metadata.inventory?.mentioned ?? []).map((t) => t.trim().toLowerCase()));
  const declared = course.metadata.inventory?.terms?.filter((t) => !mentioned.has(t.trim().toLowerCase())) ?? null;
  let declaredTermCoverage: CourseHealth['declaredTermCoverage'] = null;

  if (declared && declared.length) {
    const defined = items
      .filter((i): i is Extract<StudyItem, { type: 'definition' }> => i.type === 'definition')
      .map((d) => termTokens(d.term ?? ''));
    const missing = declared.filter((term) => {
      const want = termTokens(term);
      if (!want.size) return false;
      return !defined.some((have) => coversTokens(have, want));
    });

    declaredTermCoverage = { covered: declared.length - missing.length, total: declared.length, missing };

    if (missing.length) {
      findings.push({
        id: 'declared-terms-missing',
        // A gap, not a fault: nothing already in the course is wrong.
        severity: 'warning',
        message: `${missing.length} of ${declared.length} terms the generator listed as being in your notes never got a definition: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? `, +${missing.length - 8} more` : ''}.`,
      });
    }
  }

  // Figures the generator said it could not read: nothing in the course
  // tests them, and only the student, with the slide open, can tell whether
  // that matters.
  const unclear = (course.metadata.inventory?.unclear_figures ?? []).filter((f) => f.trim());
  if (unclear.length) {
    const n = unclear.length;
    findings.push({
      id: 'unclear-figures',
      severity: 'warning',
      message: `The AI couldn't read ${n === 1 ? 'one figure' : `${n} figures`} clearly, so nothing here tests ${n === 1 ? 'it' : 'them'}. Check ${n === 1 ? 'it' : 'them'} on your slides: ${unclear.slice(0, 4).join('; ')}${n > 4 ? `; +${n - 4} more` : ''}.`,
    });
  }

  // Items per slide, section against section (lib/sectionDensity). Only a
  // pointer: a dense key slide deserves its cards, and only the student,
  // with the slides, can tell that from basics written up at length.
  const density = sectionDensity(course);
  const per = (n: number) => (n < 1.95 ? n.toFixed(1) : String(Math.round(n)));
  const names = (rows: { title: string; items: number; slides: number }[]) =>
    rows
      .slice(0, 4)
      .map((r) => `${r.title} (${r.items} for ${r.slides} slide${r.slides === 1 ? '' : 's'})`)
      .join('; ') + (rows.length > 4 ? `; +${rows.length - 4} more` : '');
  if (density?.sparse.length) {
    const n = density.sparse.length;
    findings.push({
      id: 'sparse-sections',
      severity: 'warning',
      message: `${n === 1 ? 'One section has' : `${n} sections have`} few items for the slides ${n === 1 ? 'it covers' : 'they cover'}, against about ${per(density.typical)} a slide elsewhere in this lecture: ${names(density.sparse)}. If those slides matter, More practice writes new questions on them first.`,
    });
  }
  if (density?.dense.length) {
    const n = density.dense.length;
    findings.push({
      id: 'dense-sections',
      severity: 'warning',
      message: `${n === 1 ? 'One section has' : `${n} sections have`} many items for few slides, against about ${per(density.typical)} a slide elsewhere: ${names(density.dense)}. Fine for a packed slide the lecture builds on. If it is basics you already know, Not needed on those cards keeps them out of your sittings.`,
    });
  }

  /* ---- testability ---- */
  if (gaps.untestedTerms.length) {
    findings.push({
      id: 'untested-terms',
      severity: 'warning',
      // Terms mode now asks for every defined term by name, so these ARE
      // tested — but only as recall of the word. No question makes the
      // student use them, which is the gap worth closing.
      message: `${gaps.untestedTerms.length} term${gaps.untestedTerms.length === 1 ? ' is' : 's are'} only ever asked for by name. No question makes you use ${gaps.untestedTerms.length === 1 ? 'it' : 'them'}: ${gaps.untestedTerms.slice(0, 6).join(', ')}${gaps.untestedTerms.length > 6 ? '…' : ''}.`,
    });
  }

  if (items.length > 0 && gaps.gradableRatio < 0.4) {
    findings.push({
      id: 'low-gradable',
      severity: 'warning',
      message: `Only ${Math.round(gaps.gradableRatio * 100)}% of items are questions. Terms mode quizzes the definitions by name, but most of this lecture never asks you to apply anything.`,
    });
  }

  /* ---- what the questions actually ask ---- */
  const quality = analyseQuestionQuality(course);

  // Reported as a z-score, not a percentage: at small n a percentage is
  // noise. Three sigma on at least twenty questions is a real pattern, and
  // it is the one that lets a student who knows nothing beat chance.
  if (quality.length.mcqs >= 20 && quality.length.z >= 3) {
    const pct = Math.round((quality.length.longestIsCorrect / quality.length.mcqs) * 100);
    findings.push({
      id: 'length-tell',
      // Serious, but it weakens questions rather than breaking the course.
      // "Problem" — the red cross on the course page — is kept for what
      // corrupts scoring: shared ids, answer keys pointing nowhere,
      // explanations under the wrong option. Flagging a clean, fully covered
      // course red for an answer-length pattern alarmed more than it told.
      severity: 'warning',
      message: `The right answer is the longest of the four options ${pct}% of the time. It should be about 25%. Guessing the longest beats guessing at random here, so some of these are scoring length rather than knowledge.`,
      // The blatant cases, so a repair can target them one by one.
      items: quality.length.giveaway,
    });
  }

  if (quality.length.lopsided.length >= Math.max(4, quality.length.mcqs * 0.15)) {
    findings.push({
      id: 'lopsided-options',
      severity: 'warning',
      message: `${quality.length.lopsided.length} questions have one option more than twice the length of the others, which draws the eye to it whether or not it is right.`,
      items: quality.length.lopsided,
    });
  }

  if (quality.gradable > 0 && quality.restated.length > quality.gradable * 0.25) {
    const pct = Math.round((quality.restated.length / quality.gradable) * 100);
    findings.push({
      id: 'restates-source',
      severity: 'warning',
      message: `${pct}% of questions are worded very close to the passage they came from. Each is fine on its own (a definition has to use the term's own words), but at this share the lecture is mostly asking you to recognise sentences you have read, rather than to use what they say.`,
      items: quality.restated,
    });
  }

  if (quality.gradable > 0 && quality.sourceCued.length > quality.gradable * 0.08) {
    const pct = Math.round((quality.sourceCued.length / quality.gradable) * 100);
    findings.push({
      id: 'cued-to-source',
      severity: 'warning',
      message: `${pct}% of questions ask about "the notes" or "the slide" rather than about the subject. That cue will not be there in the exam.`,
      items: quality.sourceCued,
    });
  }

  if (quality.recallOnlySections.length) {
    const n = quality.recallOnlySections.length;
    findings.push({
      id: 'recall-only-sections',
      severity: 'warning',
      message: `${n} section${n === 1 ? '' : 's'} only ever ask you to recall a fact. Nothing asks you to apply or compare: ${quality.recallOnlySections.slice(0, 3).join('; ')}${n > 3 ? `, +${n - 3} more` : ''}.`,
    });
  }

  /* ---- what a sitting would ask (docs/proposals/content-quality.md) ---- */
  if (gaps.thinKeyTerms.length) {
    const n = gaps.thinKeyTerms.length;
    findings.push({
      id: 'thin-key-terms',
      severity: 'warning',
      message: `${n} key term${n === 1 ? ' is' : 's are'} asked by only one question or flashcard (${gaps.thinKeyTerms
        .slice(0, 3)
        .join(', ')}${n > 3 ? ', …' : ''}), so ${n === 1 ? 'it' : 'each'} can be learned as that card rather than understood. Fix or More practice asks ${n === 1 ? 'it' : 'them'} from other sides.`,
    });
  }

  const live = items.filter((i) => !i.set_aside);
  const giveaways = live.filter((i): i is Extract<StudyItem, { type: 'definition' }> => i.type === 'definition' && givesAway(i.term, i.definition));
  if (giveaways.length) {
    const n = giveaways.length;
    findings.push({
      id: 'gives-away',
      severity: 'warning',
      message: `${n} definition${n === 1 ? ' uses' : 's use'} the words of ${n === 1 ? 'its own term' : 'their own terms'} (${giveaways
        .slice(0, 2)
        .map((d) => `"${d.term}"`)
        .join(', ')}${n > 2 ? ', …' : ''}), so the app shows ${n === 1 ? 'it' : 'them'} to read but never asks you to name the term. Fix can reword ${n === 1 ? 'it' : 'them'}.`,
      items: giveaways.map((d) => d.id),
    });
  }

  // An MCQ that asks a term back from its own definition: the typed term
  // already does that, harder. Its answer is a defined term and most of its
  // stem is that definition's words (measured on the owner's lectures: about
  // one MCQ in eight).
  const defsLive = live.filter((i): i is Extract<StudyItem, { type: 'definition' }> => i.type === 'definition');
  const byForm = new Map<string, Extract<StudyItem, { type: 'definition' }>>();
  for (const d of defsLive) for (const f of acceptedForms(d)) if (!byForm.has(f.norm)) byForm.set(f.norm, d);
  const restating = live.filter((i): i is Extract<StudyItem, { type: 'mcq' }> => {
    if (i.type !== 'mcq') return false;
    const answer = i.options?.[i.correct_index] ?? '';
    const d = byForm.get(normalise(answer)) ?? defsLive.find((x) => sameName(x.term, answer));
    if (!d) return false;
    return restatesDefinition(i.question, `${d.definition} ${d.example_sentence ?? ''}`);
  });
  if (restating.length) {
    const n = restating.length;
    findings.push({
      id: 'mcq-restates-definition',
      severity: 'warning',
      message: `${n} question${n === 1 ? ' asks' : 's ask'} a term back from its own definition, which the typed term already does. Fix can rewrite ${n === 1 ? 'it' : 'them'} to test what the definition leaves out: an exception, the line between it and its neighbour, or what follows when it fails.`,
      items: restating.map((m) => m.id),
    });
  }

  // Two cards on one fact in the same section, in nearly the same words: the
  // app keeps them apart in a sitting, but the second still tests the
  // wording of the first more than the idea. Only the later of each pair is
  // named, so Fix rewrites one and keeps the other.
  const asked = (i: StudyItem): Asked | null =>
    i.type === 'mcq'
      ? { question: i.question, answer: i.options?.[i.correct_index] ?? '' }
      : i.type === 'flashcard'
        ? { question: i.front, answer: i.back }
        : i.type === 'definition' && !givesAway(i.term, i.definition)
          ? { question: i.definition, answer: i.term }
          : null;
  const repeats: string[] = [];
  for (const section of course.sections) {
    const cards = section.items.filter((i) => !i.set_aside).map((i) => ({ i, a: asked(i) })).filter((x) => x.a);
    for (let b = 1; b < cards.length; b++) {
      // A definition is the plain statement; the question is what gets rewritten.
      if (cards[b].i.type === 'definition') continue;
      if (cards.slice(0, b).some((x) => sameFact(x.a!, cards[b].a!))) repeats.push(cards[b].i.id);
    }
  }
  if (repeats.length) {
    const n = repeats.length;
    findings.push({
      id: 'same-fact',
      severity: 'warning',
      message: `${n} question${n === 1 ? ' asks' : 's ask'} the same fact as another card in ${n === 1 ? 'its' : 'their'} section, in nearly the same words. The app keeps them apart, but a second wording of one fact teaches less than a new angle on it. Fix can rewrite ${n === 1 ? 'it' : 'them'}.`,
      items: repeats,
    });
  }

  return {
    findings,
    problems: findings.filter((f) => f.severity === 'problem').length,
    warnings: findings.filter((f) => f.severity === 'warning').length,
    gaps,
    declaredTermCoverage,
    quality,
  };
}
