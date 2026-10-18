import type { Course, McqItem } from '@/schema/course';
import { lengthBias } from './questionQuality';
import { sortedSections } from './sortedSections';
import { teacherNotesBlock } from './teacherNotes';

/**
 * A small repair for one fault: the right answer is the longest option.
 *
 * Six of the owner's eleven lectures had the right answer longest in 40 to
 * 55% of their questions (fair is about 25%), so guessing the longest scored
 * well and practice flattered the student (docs/audits/2026-10-17). Fix
 * could repair it, but Fix is a full round: the whole quality rulebook out,
 * whole questions back, an AI session the owner often cannot spare.
 *
 * This asks only for three new wrong options per question, as one short line
 * of JSON each. The app puts them round the right answer, which it never
 * lets the reply touch, so the question, its answer and the student's score
 * on it stay exactly as they were. The reply goes through the same preview
 * and merge as Fix (as corrections under the same ids).
 */

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * Options this short (a term, a direction, a number) give nothing away by
 * length: no student picks "Contralateral" over "Ipsilateral" for its two
 * extra letters. They still count in the share; they are not worth a rewrite.
 */
const SHORT_OPTION_WORDS = 3;

const isLive = (i: { type: string; set_aside?: unknown }): boolean => i.type === 'mcq' && !i.set_aside;

/** The right answer is strictly the longest option, by how much against the others' average. */
function lopsided(q: McqItem): number | null {
  const lens = q.options.map((o) => String(o).length);
  const right = lens[q.correct_index] ?? 0;
  const others = lens.filter((_, i) => i !== q.correct_index);
  if (!others.length || right <= Math.max(...others)) return null;
  return right / Math.max(1, others.reduce((a, b) => a + b, 0) / others.length);
}

/**
 * The questions to rework, most lopsided first: as many as the share of
 * right-answer-longest is over one in four, among the questions in study
 * whose options are long enough for length to tell.
 */
export function optionsToRework(course: Course): McqItem[] {
  const mcqs = course.sections.flatMap((s) => s.items).filter(isLive) as McqItem[];
  const longest = mcqs.filter((q) => {
    const lens = q.options.map((o) => String(o).length);
    return lens.length > 0 && lens[q.correct_index] === Math.max(...lens);
  }).length;
  const over = longest - Math.round(mcqs.length / 4);
  if (over <= 0) return [];
  return mcqs
    .map((q) => ({ q, r: lopsided(q) }))
    .filter((x): x is { q: McqItem; r: number } => x.r != null && Math.max(...x.q.options.map(words)) > SHORT_OPTION_WORDS)
    .sort((a, b) => b.r - a.r)
    .slice(0, over)
    .map((x) => x.q);
}

/** Share of questions whose right answer is the longest option (ties count), as a whole percent. */
export function longestShare(course: Course): number {
  const b = lengthBias(course);
  return b.mcqs ? Math.round((b.longestIsCorrect / b.mcqs) * 100) : 0;
}

export function buildEvenOptionsPrompt(course: Course, notes = course.metadata.student_notes): string {
  const questions = optionsToRework(course);
  const titles = new Map<string, string>();
  for (const s of sortedSections(course)) for (const i of s.items) titles.set(i.id, s.title);
  const title = (id: string) => titles.get(id) ?? '';
  const list = questions
    .map((q) => {
      const right = q.options[q.correct_index];
      const wrong = q.options.filter((_, i) => i !== q.correct_index);
      return [
        `${q.id}  (${title(q.id)})`,
        `  Question: ${q.question}`,
        `  Right answer, keep exactly: "${right}" (${words(right)} words)`,
        `  Wrong now: ${wrong.map((w) => `"${w}" (${words(w)})`).join('; ')}`,
        `  Explanation now: ${q.explanation ?? ''}`,
      ].join('\n');
    })
    .join('\n\n');

  return `The Arborous app checked the lecture "${course.metadata.title}" you made for me. In ${questions.length} of its multiple-choice questions the right answer is the longest option, so I could pick it without knowing the material. Please rewrite only the three WRONG options of each question below.

Rules:
- Keep each question and its right answer exactly as they are. Send only the wrong options.
- Each wrong option is a mistake a student who studied would really make: the neighbouring term, structure or study; the right fact turned round (raises for lowers, before for after); the step before or after; what is true of a different case; or a misconception my notes warn about. Use this lecture's own terms, so recognising words from the slides cannot rule one out.
- At least one wrong option is longer than the right answer, and none is much shorter. Give the wrong options the same kind of qualifier or "because" clause the right one has; do not shorten the right one.
- All four options are the same kind of thing, fit the question's grammar and are equally specific. Nothing invented, no jokes, no "all of the above".
- Use my notes in this chat. Nothing that is not in them.
- If the explanation names a wrong option you replaced, send a new explanation too ("explanation"), saying why the right answer is right; otherwise leave it out.

Reply with only this JSON, one question per line, and nothing after it:
{
"<question id>": {"wrong": ["<wrong 1>", "<wrong 2>", "<wrong 3>"], "why": ["<why a student might pick wrong 1, and why it is wrong>", "<… 2>", "<… 3>"], "explanation": "<only if needed>"},
...
}

${teacherNotesBlock(notes)}The questions:

${list}
`;
}

export interface EvenOptionsResult {
  /** The questions with their new wrong options, ready to merge as corrections. */
  corrections: McqItem[];
  /** Ids in the reply that could not be used, with why. */
  skipped: { id: string; why: string }[];
}

/**
 * Reads the reply into corrections. Each question keeps its id, its stem and
 * its right answer at the same place; only the other three options and their
 * reasons change. Anything that does not fit that is skipped, and said.
 */
export function readEvenOptions(course: Course, reply: unknown): EvenOptionsResult | { error: string } {
  if (!reply || typeof reply !== 'object' || Array.isArray(reply)) {
    return { error: 'Expected a JSON object of question ids, each with "wrong" and "why".' };
  }
  // Only the questions the prompt asked about: a reply naming another
  // question (or one set aside since) does not get to rewrite it.
  const mcqs = new Map(optionsToRework(course).map((q) => [q.id, q]));
  const corrections: McqItem[] = [];
  const skipped: EvenOptionsResult['skipped'] = [];
  for (const [id, entry] of Object.entries(reply as Record<string, unknown>)) {
    const q = mcqs.get(id);
    if (!q) {
      skipped.push({ id, why: 'not one of the questions asked about' });
      continue;
    }
    const e = entry as { wrong?: unknown; why?: unknown };
    const wrong = Array.isArray(e?.wrong) ? e.wrong.map((w) => (typeof w === 'string' ? w.trim() : '')) : [];
    const n = q.options.length - 1;
    if (wrong.length !== n || wrong.some((w) => !w)) {
      skipped.push({ id, why: `needs exactly ${n} wrong options` });
      continue;
    }
    const right = q.options[q.correct_index];
    const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
    if (wrong.some((w) => same(w, right)) || new Set(wrong.map((w) => w.toLowerCase())).size !== n) {
      skipped.push({ id, why: 'a wrong option repeats the right answer or another option' });
      continue;
    }
    const why = Array.isArray(e?.why) ? e.why.map((w) => (typeof w === 'string' ? w.trim() : '')) : [];
    // The reasons are what the student reads after picking a wrong option:
    // without them the question would lose its feedback.
    if (why.length !== n || why.some((w) => !w)) {
      skipped.push({ id, why: 'needs a reason for each wrong option' });
      continue;
    }
    const options: string[] = [];
    const rationale: string[] = [];
    let k = 0;
    for (let i = 0; i < q.options.length; i++) {
      if (i === q.correct_index) {
        options.push(right);
        rationale.push('');
      } else {
        options.push(wrong[k]);
        rationale.push(why[k] ?? '');
        k++;
      }
    }
    const corrected: McqItem = { ...q, options, distractor_rationale: rationale };
    if (typeof (e as { explanation?: unknown }).explanation === 'string' && (e as { explanation: string }).explanation.trim()) {
      corrected.explanation = (e as { explanation: string }).explanation.trim();
    }
    if (lopsided(corrected) != null) {
      skipped.push({ id, why: 'the right answer would still be the longest' });
      continue;
    }
    corrections.push(corrected);
  }
  if (!corrections.length && !skipped.length) return { error: 'The reply has no questions in it.' };
  return { corrections, skipped };
}

/** The lecture as it would be with these corrections, for the before-and-after share. */
export function withCorrections(course: Course, corrections: McqItem[]): Course {
  const byId = new Map(corrections.map((c) => [c.id, c]));
  return {
    ...course,
    sections: course.sections.map((s) => ({ ...s, items: s.items.map((i) => byId.get(i.id) ?? i) })),
  };
}
