import type { Course, McqItem } from '@/schema/course';
import { givesAwayByLength, lengthBias, longestCredit, toBringDown } from './questionQuality';
import { lengthTellFires } from './courseHealth';
import { readReply } from './readReply';
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

/**
 * How lopsided a question is, when its length gives something away
 * (`givesAwayByLength`: the right answer the longest, or tied for it with
 * fewer than all four): the right answer's length against the others'
 * average. Null otherwise. A tie gives something away too (a guess between
 * the two longest is right half the time), so the fix for both is a wrong
 * option longer than the right one, as the prompt asks.
 */
function lopsided(q: McqItem, credit = longestCredit(q.options, q.correct_index)): number | null {
  if (!givesAwayByLength(credit, q.options.length)) return null;
  const lens = q.options.map((o) => String(o).length);
  const others = lens.filter((_, i) => i !== q.correct_index);
  return (lens[q.correct_index] ?? 0) / Math.max(1, others.reduce((a, b) => a + b, 0) / Math.max(1, others.length));
}

/**
 * The questions to rework, most lopsided first: as many as the share of
 * right-answer-longest is over one in four, among the questions in study
 * whose options are long enough for length to tell.
 */
export function optionsToRework(course: Course): McqItem[] {
  const mcqs = course.sections.flatMap((s) => s.items).filter(isLive) as McqItem[];
  // What guessing the longest scores, ties shared, as the lecture check counts it.
  const scored = mcqs.map((q) => ({ q, credit: longestCredit(q.options, q.correct_index) }));
  const longest = scored.reduce((n, x) => n + x.credit, 0);
  const candidates = scored
    .map((x) => ({ ...x, ratio: lopsided(x.q, x.credit) }))
    .filter((x): x is { q: McqItem; credit: number; ratio: number } => x.ratio != null && Math.max(...x.q.options.map(words)) > SHORT_OPTION_WORDS);
  return toBringDown(candidates, longest - mcqs.length / 4).map((x) => x.q);
}

/**
 * What a guess at the longest option would score, as a whole percent: the
 * lecture check's measure, a tie shared between the options in it.
 */
export function longestShare(course: Course): number {
  const b = lengthBias(course);
  return b.mcqs ? Math.round((b.longestIsCorrect / b.mcqs) * 100) : 0;
}

/** One question as the prompt lists it, with the passage it came from, so any chat can answer it. */
function questionBlock(q: McqItem, section: string): string {
  const right = q.options[q.correct_index];
  const wrong = q.options.filter((_, i) => i !== q.correct_index);
  return [
    `${q.id}  (${section})`,
    `  Question: ${q.question}`,
    `  Right answer, keep exactly: "${right}" (${words(right)} words)`,
    `  Wrong now: ${wrong.map((w) => `"${w}" (${words(w)})`).join('; ')}`,
    `  Explanation now: ${q.explanation ?? ''}`,
    ...(q.source_excerpt ? [`  From my notes: ${q.source_excerpt}`] : []),
  ].join('\n');
}

function questionList(course: Course): { count: number; text: string } {
  const questions = optionsToRework(course);
  const titles = new Map<string, string>();
  for (const s of sortedSections(course)) for (const i of s.items) titles.set(i.id, s.title);
  return { count: questions.length, text: questions.map((q) => questionBlock(q, titles.get(q.id) ?? '')).join('\n\n') };
}

const RULES = `Rules:
- Keep each question and its right answer exactly as they are. Send only the wrong options.
- Each wrong option is a mistake a student who studied would really make: the neighbouring term, structure or study; the right fact turned round (raises for lowers, before for after); the step before or after; what is true of a different case; or a misconception my notes warn about. Use the lecture's own terms, so recognising words from the slides cannot rule one out.
- At least one wrong option is longer than the right answer, and none is much shorter. Give the wrong options the same kind of qualifier or "because" clause the right one has; do not shorten the right one.
- All four options are the same kind of thing, fit the question's grammar and are equally specific. Nothing invented, no jokes, no "all of the above".
- Use my notes if this chat has them; if not, the passage under each question is from my notes. Nothing that is not in them. If a question has no passage and you do not have my notes, leave it out of your reply rather than guess.
- If the explanation names a wrong option you replaced, send a new explanation too ("explanation"), saying why the right answer is right; otherwise leave it out.`;

const ENTRY = `{"wrong": ["<wrong 1>", "<wrong 2>", "<wrong 3>"], "why": ["<why a student might pick wrong 1, and why it is wrong>", "<… 2>", "<… 3>"], "explanation": "<only if needed>"}`;

export function buildEvenOptionsPrompt(course: Course, notes = course.metadata.student_notes): string {
  const { count, text } = questionList(course);
  return `The Arborous app checked the lecture "${course.metadata.title}" made from my notes. In ${count} of its multiple-choice questions the right answer is the longest option, or tied for it, so I could pick it without knowing the material. Please rewrite only the three WRONG options of each question below.

${RULES}

Reply with only this JSON, one question per line, and nothing after it:
{
"<question id>": ${ENTRY},
...
}

${teacherNotesBlock(notes)}The questions:

${text}
`;
}

/**
 * The lectures of a class with questions to rework, in the class's order:
 * those whose own lecture check reports the length finding, so the class
 * page and the lecture page never disagree about which need it.
 */
export function classToRework(lectures: [string, Course][]): { id: string; course: Course; count: number }[] {
  return lectures
    .filter(([, course]) => lengthTellFires(lengthBias(course)))
    .map(([id, course]) => ({ id, course, count: optionsToRework(course).length }))
    .filter((l) => l.count > 0);
}

/**
 * The same repair for every lecture of a class in one prompt and one reply.
 * Each question carries the passage it came from, so it works in any chat:
 * a class's lectures were usually made in different ones.
 */
export function buildClassEvenOptionsPrompt(code: string, lectures: [string, Course][]): string {
  const todo = classToRework(lectures);
  const total = todo.reduce((n, l) => n + l.count, 0);
  const blocks = todo
    .map(
      ({ id, course }) =>
        `════════ LECTURE "${course.metadata.title}" (id: ${id}) ════════\n\n${teacherNotesBlock(course.metadata.student_notes)}${questionList(course).text}`,
    )
    .join('\n\n');
  return `The Arborous app checked the lectures of my class ${code}, made from my notes. In ${total} multiple-choice questions across ${todo.length} lecture${todo.length === 1 ? '' : 's'} the right answer is the longest option, or tied for it, so I could pick it without knowing the material. Please rewrite only the three WRONG options of each question below.

${RULES}

Reply with only this JSON, grouped by lecture id, one question per line, and nothing after it:
{
"<lecture id>": {
"<question id>": ${ENTRY},
...
},
...
}

${blocks}
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

export interface ClassEvenOptionsResult {
  lectures: { id: string; title: string; corrections: McqItem[]; skipped: { id: string; why: string }[]; before: number; after: number; error?: string }[];
  /** Lecture ids in the reply this class does not have. */
  unknown: string[];
}

/** Reads a class reply: each lecture's part as readEvenOptions reads one lecture's. */
export function readClassEvenOptions(lectures: [string, Course][], reply: unknown): ClassEvenOptionsResult | { error: string } {
  if (!reply || typeof reply !== 'object' || Array.isArray(reply)) {
    return { error: 'Expected a JSON object of lecture ids, each holding its question ids.' };
  }
  const byId = new Map(lectures);
  const out: ClassEvenOptionsResult = { lectures: [], unknown: [] };
  for (const [id, part] of Object.entries(reply as Record<string, unknown>)) {
    const course = byId.get(id);
    if (!course) {
      out.unknown.push(id);
      continue;
    }
    const read = readEvenOptions(course, part);
    if ('error' in read) {
      out.lectures.push({ id, title: course.metadata.title, corrections: [], skipped: [], error: read.error, before: longestShare(course), after: longestShare(course) });
      continue;
    }
    out.lectures.push({
      id,
      title: course.metadata.title,
      corrections: read.corrections,
      skipped: read.skipped,
      before: longestShare(course),
      after: longestShare(withCorrections(course, read.corrections)),
    });
  }
  if (!out.lectures.length) return { error: out.unknown.length ? `No lecture of this class has the id ${out.unknown.join(', ')}.` : 'The reply has no lectures in it.' };
  return out;
}

/**
 * Reads an Even out reply, whole or cut off. A whole reply is ordinary JSON.
 * A reply that stopped partway (a chat's length limit) is read line by line,
 * as the prompt asks for one question a line: every complete question line
 * is kept, under the lecture line it follows for a class reply, and `cut`
 * says how many came through.
 */
export function readEvenReply(text: string): { ok: true; json: unknown; cut: number | null } | { ok: false; error: string } {
  const whole = readReply(text);
  if (whole.ok) return { ok: true, json: whole.json, cut: null };
  const flat: Record<string, unknown> = {};
  const nested: Record<string, Record<string, unknown>> = {};
  let lecture: string | null = null;
  let n = 0;
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    // A lecture's opening, alone on its line or with its first question after it.
    const opens = /^\{?\s*"([^"]+)"\s*:\s*\{\s*(?="[^"]+"\s*:\s*\{|$)/.exec(line);
    if (opens) {
      lecture = opens[1];
      nested[lecture] ??= {};
      line = line.slice(opens[0].length);
      if (!line) continue;
    }
    const entry = /^\{?\s*"([^"]+)"\s*:\s*(\{.*\})\s*\}*\s*,?\s*$/.exec(line);
    if (!entry) continue;
    try {
      const value = JSON.parse(entry[2]);
      if (lecture) nested[lecture][entry[1]] = value;
      else flat[entry[1]] = value;
      n++;
    } catch {
      // The line the reply was cut in: left out.
    }
  }
  if (n === 0) return { ok: false, error: whole.error };
  return { ok: true, json: Object.keys(nested).length ? nested : flat, cut: n };
}
