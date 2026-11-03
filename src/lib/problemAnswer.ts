import type { FlashcardItem, ProblemItem } from '@/schema/course';

/**
 * Checking a worked problem's answer (schema: ProblemItem).
 *
 * A number is read the way a student types it: "0.0012", "1.2e-3",
 * "1.2 × 10^-3", "1.2×10⁻³", "3/4", "2π", "√2/2", "x = 4", a unit after it
 * or not. It is right within 1% of the answer (a problem can set its own
 * tolerance), or as the answer rounded to the places the student gave, from
 * two significant figures on: 1.7 for 1.738 is a fair answer, 2 is not.
 *
 * A short text answer (a name, what some code prints, a letter) is compared
 * without case, spaces or a closing full stop, against the answer and its
 * other accepted forms. Anything else is checked by the student against the
 * worked steps. Every verdict the app makes can be overruled, as a typed
 * term's can: no checker is perfect.
 */

export type AnswerKind = 'number' | 'text' | 'self';

/** How far off a number may be, as a share of it, unless the problem says. */
export const DEFAULT_TOLERANCE = 0.01;

const SUPERSCRIPT: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-', '⁽': '(', '⁾': ')',
};

/** The student's text in the parser's terms: plain minus, *, /, ^, sqrt, pi. */
function plain(text: string): string {
  return (
    text
      // Before NFKC, which would make 10⁻³ read as 10-3.
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾]+/g, (run) => `^(${[...run].map((c) => SUPERSCRIPT[c]).join('')})`)
      .normalize('NFKC')
      .replace(/[−–—‒﹣]/g, '-')
      .replace(/[×✕⋅·∙]/g, '*')
      .replace(/÷/g, '/')
      .replace(/√/g, 'sqrt')
      .replace(/π/g, 'pi')
      // 1,000,000 is a million; 1,5 is one and a half.
      .replace(/(\d),(?=\d{3}(?!\d))/g, '$1')
      .replace(/(\d),(?=\d)/g, '$1.')
      .trim()
  );
}

type Token =
  | { kind: 'num'; value: number; text: string }
  | { kind: 'op'; op: string }
  | { kind: 'word'; word: string };

const MAX_TYPED = 120;

const FUNCS: Record<string, (x: number) => number> = { sqrt: Math.sqrt, ln: Math.log, log: Math.log10, exp: Math.exp };
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };

interface Read {
  value: number;
  /** What followed the number: its unit, as typed. */
  unit: string;
  /** A single number as typed (not a sum or a fraction): the places it was given to. */
  literal?: { step: number; figures: number };
}

/** Significant figures and the size of the last place of a number as written ("1.70" is 3, 0.01). */
function precisionOf(text: string): { step: number; figures: number } {
  const m = /^(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(text);
  if (!m) return { step: 0, figures: 0 };
  const [, whole = '', frac = '', exp = '0'] = m;
  const digits = (whole + frac).replace(/^0+/, '');
  return { step: 10 ** (Number(exp) - frac.length), figures: digits.length };
}

/**
 * The number at the start of what the student typed, and the rest as its
 * unit, or null when it does not start with one.
 */
export function readNumber(typed: string): Read | null {
  // "x = 4", "ΔG° ≈ -2.5 kJ": the name in front is not part of the answer.
  // No number needs more than MAX_TYPED characters, and the cap bounds how
  // deep the parser below can go: a shared lecture's answer of a thousand
  // brackets must not overflow the stack and take the card down.
  const text = plain(typed.slice(0, MAX_TYPED)).replace(/^(?:\p{L}[^\s=+*/^()]{0,11})?\s*[=≈~]\s*(?=[-+.(\d]|pi|sqrt)/u, '');
  const tokens: { token: Token; at: number }[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(text.slice(i));
    if (num) {
      tokens.push({ token: { kind: 'num', value: Number(num[0]), text: num[0] }, at: i });
      i += num[0].length;
      continue;
    }
    const word = /^[A-Za-z]+/.exec(text.slice(i));
    if (word) {
      const prev = tokens.at(-1)?.token;
      // 1.2x10^-3: an x between numbers is times.
      if (/^x$/i.test(word[0]) && prev && (prev.kind === 'num' || (prev.kind === 'op' && prev.op === ')')) && /^\s*\d/.test(text.slice(i + 1)))
        tokens.push({ token: { kind: 'op', op: '*' }, at: i });
      else tokens.push({ token: { kind: 'word', word: word[0] }, at: i });
      i += word[0].length;
      continue;
    }
    if ('+-*/^()'.includes(c)) {
      tokens.push({ token: { kind: 'op', op: c }, at: i });
      i++;
      continue;
    }
    // Anything else (%, °, ±) starts the unit.
    tokens.push({ token: { kind: 'word', word: c }, at: i });
    i++;
  }

  let k = 0;
  const peek = () => tokens[k]?.token;
  const isOp = (op: string) => {
    const t = peek();
    return t?.kind === 'op' && t.op === op;
  };
  const known = (t: Token | undefined) => t?.kind === 'word' && (t.word.toLowerCase() in CONSTS || t.word.toLowerCase() in FUNCS);

  // A recursive descent over + - * / ^, with implicit times before a
  // bracket, a constant or a root (2π, 2(3), 2√3). It stops at the first
  // token it cannot use; what is left is the unit.
  const expr = (): number | null => {
    let v = term();
    while (v !== null && (isOp('+') || isOp('-'))) {
      const save = k;
      const op = (peek() as { op: string }).op;
      k++;
      const r = term();
      if (r === null) {
        k = save;
        break;
      }
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  const term = (): number | null => {
    let v = power();
    while (v !== null) {
      const save = k;
      if (isOp('*') || isOp('/')) {
        const op = (peek() as { op: string }).op;
        k++;
        const r = power();
        if (r === null) {
          k = save;
          break;
        }
        v = op === '*' ? v * r : v / r;
      } else if (isOp('(') || known(peek())) {
        const r = power();
        if (r === null) {
          k = save;
          break;
        }
        v *= r;
      } else break;
    }
    return v;
  };
  const power = (): number | null => {
    const base = unary();
    if (base === null || !isOp('^')) return base;
    const save = k;
    k++;
    const exp = power();
    if (exp === null) {
      k = save;
      return base;
    }
    return base ** exp;
  };
  const unary = (): number | null => {
    if (isOp('-') || isOp('+')) {
      const neg = isOp('-');
      const save = k;
      k++;
      const v = unary();
      if (v === null) {
        k = save;
        return null;
      }
      return neg ? -v : v;
    }
    return primary();
  };
  const primary = (): number | null => {
    const t = peek();
    if (!t) return null;
    if (t.kind === 'num') {
      k++;
      return t.value;
    }
    if (t.kind === 'op' && t.op === '(') {
      const save = k;
      k++;
      const v = expr();
      if (v === null || !isOp(')')) {
        k = save;
        return null;
      }
      k++;
      return v;
    }
    if (t.kind === 'word') {
      const w = t.word.toLowerCase();
      if (w in CONSTS) {
        k++;
        return CONSTS[w];
      }
      if (w in FUNCS) {
        const save = k;
        k++;
        const arg = isOp('(') ? primary() : power();
        if (arg === null) {
          k = save;
          return null;
        }
        return FUNCS[w](arg);
      }
    }
    return null;
  };

  const value = expr();
  if (value === null || !Number.isFinite(value)) return null;
  const unit = k < tokens.length ? text.slice(tokens[k].at).trim() : '';
  const lone = k === 1 && tokens[0].token.kind === 'num' ? tokens[0].token.text : k === 2 && isNegLiteral(tokens) ? (tokens[1].token as { text: string }).text : null;
  return { value, unit, ...(lone ? { literal: precisionOf(lone) } : {}) };
}

const isNegLiteral = (tokens: { token: Token }[]) =>
  tokens[0].token.kind === 'op' && (tokens[0].token.op === '-' || tokens[0].token.op === '+') && tokens[1]?.token.kind === 'num';

/** Whether a typed number is the answer: within the tolerance, or the answer rounded to the places typed. */
export function sameNumber(got: Read, want: number, tolerance = DEFAULT_TOLERANCE): boolean {
  if (!Number.isFinite(want)) return false;
  const off = Math.abs(got.value - want);
  if (off <= tolerance * Math.abs(want) + 1e-12) return true;
  // 1.7 for 1.738: rounded to the places given, from two figures on.
  const lit = got.literal;
  return !!lit && lit.figures >= 2 && off <= lit.step / 2 + 1e-9 * Math.max(1, Math.abs(want));
}

/**
 * Whether what follows a number is a unit ("m/s²", "kJ/mol", "°C", "%"),
 * not more of an expression ("x² + 2", "3x", "or 3").
 */
function isUnit(unit: string): boolean {
  const u = unit.replace(/\^\(?[-+]?\d+\)?/g, '').trim();
  if (!u || u.length > 16 || /[\d+=,(){}[\]<>!?;:]/.test(u)) return false;
  // A lone letter that names a variable, not a unit: 3x, 2n (m, s, g, h, l are units).
  if (/^[a-fi-kn-rt-z]$/.test(u)) return false;
  return /^[\p{L}°%/*.\s-]+$/u.test(u);
}

/** The answer as a number, when it is one: a JSON number, or a string of a number and perhaps its unit. */
export function numberOf(answer: ProblemItem['answer']): number | null {
  if (typeof answer === 'number') return Number.isFinite(answer) ? answer : null;
  if (typeof answer !== 'string' || !answer.trim()) return null;
  const read = readNumber(answer);
  return read && (!read.unit || isUnit(read.unit)) ? read.value : null;
}

/** How the problem's answer is checked. */
export function answerKind(item: Pick<ProblemItem, 'answer'>): AnswerKind {
  if (numberOf(item.answer) !== null) return 'number';
  return typeof item.answer === 'string' && item.answer.trim() ? 'text' : 'self';
}

/** The unit a number answer is given in: the problem's, or what its answer string carries. */
export function unitOf(item: Pick<ProblemItem, 'answer' | 'unit'>): string {
  if (typeof item.unit === 'string' && item.unit.trim()) return item.unit.trim();
  if (typeof item.answer !== 'string') return '';
  // As written, not as the checker reads it: m/s², not m/s^(2).
  const read = readNumber(item.answer);
  if (!read?.unit || !isUnit(read.unit)) return '';
  const m = /^\s*\S.*?(?=\s*(?:(?![eE][-+]?\d)\p{L}|[°%]))/u.exec(item.answer);
  return m ? item.answer.slice(m[0].length).trim() : read.unit;
}

/** A text answer reduced to what matters: no case, spaces, quotes or closing full stop. */
export function normaliseAnswer(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’‚‛′`]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[−–—‒﹣]/g, '-')
    .replace(/\^/g, '')
    .replace(/\s+/g, '')
    .replace(/[.。]+$/, '')
    .replace(/^(['"])(.*)\1$/, '$2');
}

/*
 * A lecture keeps its file's own fields as written (schema/parseCourse), so
 * the optional ones the schema forgives are read here with a check: a
 * malformed one is as good as absent, never a crash.
 */
const toleranceOf = (item: ProblemItem) =>
  typeof item.tolerance === 'number' && item.tolerance > 0 && item.tolerance <= 1 ? item.tolerance : DEFAULT_TOLERANCE;
const acceptOf = (item: ProblemItem): string[] => (Array.isArray(item.accept) ? item.accept.filter((a): a is string => typeof a === 'string') : []);
const mistakesOf = (item: ProblemItem) =>
  (Array.isArray(item.mistakes) ? item.mistakes : []).filter(
    (m): m is { answer: number | string; why: string } =>
      !!m && typeof m === 'object' && typeof m.why === 'string' && !!m.why.trim() && (typeof m.answer === 'number' || typeof m.answer === 'string'),
  );

export interface ProblemVerdict {
  right: boolean;
  /** The mistake the answer is known to come from, when it matches one. */
  mistake?: string;
}

/** Whether a typed answer matches one written answer, by the problem's kind. */
function matches(item: ProblemItem, kind: AnswerKind, typed: string, want: ProblemItem['answer']): boolean {
  if (kind === 'number') {
    const got = readNumber(typed);
    const n = numberOf(want);
    if (!got || n === null) return false;
    const tol = toleranceOf(item);
    // 45% typed as 0.45 is the same answer.
    return sameNumber(got, n, tol) || (unitOf(item) === '%' && !got.unit && sameNumber({ value: got.value * 100, unit: '' }, n, tol));
  }
  return normaliseAnswer(typed) === normaliseAnswer(String(want ?? ''));
}

/**
 * The verdict on a typed answer, or null when nothing checkable was typed
 * (blank, or no number where a number is asked): then nothing is counted.
 */
export function checkAnswer(item: ProblemItem, typed: string): ProblemVerdict | null {
  const kind = answerKind(item);
  if (kind === 'self' || !typed.trim()) return null;
  if (kind === 'number' && !readNumber(typed)) return null;
  const forms = [item.answer, ...acceptOf(item)];
  if (forms.some((f) => matches(item, kind, typed, f))) return { right: true };
  const mistake = mistakesOf(item).find((m) => matches(item, kind, typed, m.answer));
  return mistake ? { right: false, mistake: mistake.why } : { right: false };
}

/**
 * A problem checked against its steps, asked as a written question (the
 * practice test): its code with the question, its steps the points to tick.
 */
export function writtenFromProblem(p: ProblemItem): FlashcardItem {
  const steps = (p.steps ?? []).map((s) => String(s).trim()).filter(Boolean);
  const code = p.code?.trim() ? `\n\`\`\`\n${p.code.replace(/\s+$/, '')}\n\`\`\`` : '';
  return {
    id: p.id,
    type: 'flashcard',
    front: `${p.question}${code}`,
    back: steps.length > 1 ? steps.map((s, k) => `(${k + 1}) ${s}`).join(' ') : (steps[0] ?? ''),
    ...(p.difficulty ? { difficulty: p.difficulty } : {}),
    tags: [...(p.tags ?? []), 'long-answer'],
    ...(p.source_excerpt ? { source_excerpt: p.source_excerpt } : {}),
  } as FlashcardItem;
}

/** A number as written in a step: "6.0", "−9.8", "1,000", "1.2 × 10⁻³", "6.02e23". */
const NUMBER_IN_TEXT = /[-−]?(?:\d[\d,]*\.?\d*|\.\d+)(?:\s*[×x*·]\s*10(?:\^\(?[-−+]?\d+\)?|[⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)|[eE][-+]?\d+)?/g;

/**
 * Whether a number answer is reached by its worked steps: some number in
 * them is the answer, its sign aside (a step may say "9.8 m/s² downward").
 * Null when the answer is not a number. A model that slips in its
 * arithmetic writes one number in the steps and another as the answer, and
 * a wrong answer key marks a right student wrong.
 */
export function answerReached(item: ProblemItem): boolean | null {
  if (answerKind(item) !== 'number') return null;
  const want = numberOf(item.answer)!;
  const tol = toleranceOf(item);
  const pct = unitOf(item) === '%';
  for (const step of item.steps ?? []) {
    for (const m of String(step).matchAll(NUMBER_IN_TEXT)) {
      const got = readNumber(m[0]);
      if (!got) continue;
      const abs = { ...got, value: Math.abs(got.value) };
      if (sameNumber(abs, Math.abs(want), tol) || (pct && sameNumber({ value: abs.value * 100, unit: '' }, Math.abs(want), tol))) return true;
    }
  }
  return false;
}

const TO_SUPER: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };

/** A number to read: 6.02 × 10²³ rather than 6.02e+23. */
export function formatNumber(n: number): string {
  if (n !== 0 && (Math.abs(n) >= 1e6 || Math.abs(n) < 1e-4)) {
    const [m, e] = n.toExponential().split('e');
    const mantissa = String(Number(Number(m).toPrecision(4)));
    return `${mantissa} × 10${[...String(Number(e))].map((c) => TO_SUPER[c] ?? c).join('')}`;
  }
  return String(Number(n.toPrecision(6)));
}

/** The answer as the student is shown it: "6.0 N", "O(n log n)". */
export function shownAnswer(item: ProblemItem): string {
  const unit = typeof item.unit === 'string' ? item.unit.trim() : '';
  if (typeof item.answer === 'string') return unit && !readNumber(item.answer)?.unit ? `${item.answer.trim()} ${unit}` : item.answer.trim();
  if (typeof item.answer === 'number') return `${formatNumber(item.answer)}${unit ? ` ${unit}` : ''}`;
  return '';
}
