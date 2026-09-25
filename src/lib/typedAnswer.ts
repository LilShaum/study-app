/**
 * Grading a typed answer against a term.
 *
 * The brief was "forgiving": a student who knows the answer and types it with
 * a slipped key, the wrong dash or a missing hyphen should not be marked
 * wrong. But forgiveness has one hard limit, and it is the whole difficulty
 * here — it must be forgiving of TYPOS and never of CONFUSIONS. Exocytosis and
 * endocytosis are two edits apart; a tolerance loose enough to forgive a
 * mistyped "exocytosis" would also accept "endocytosis", and that is not a
 * typo, it is the exact mistake the question exists to catch. So a near miss
 * only counts when it is nearer to the asked term than to any other term in
 * the course.
 *
 * Nothing here can be perfect — a grader cannot know whether "positive
 * feedback" was meant as the answer or as a guess — which is why the session
 * offers a manual override after every verdict. This aims to be right often
 * enough that the override is rarely needed, and to fail in the direction a
 * student can see and correct.
 */

export interface Answerable {
  term: string;
  also_known_as?: string[];
}

export type Verdict =
  /** Matched an accepted form exactly, after normalising. */
  | { correct: true; kind: 'exact' }
  /** Within typo tolerance of an accepted form, and nearer it than any other term. */
  | { correct: true; kind: 'typo'; spelled: string }
  /** Matched, or was nearer to, a DIFFERENT term in the course. */
  | { correct: false; kind: 'confused'; with: string }
  | { correct: false; kind: 'wrong' };

/**
 * Reduce an answer to what it says, dropping how it was typed.
 *
 * Dashes of every width, slashes, case, accents, punctuation and a leading
 * article are all spelling, not knowledge: "Michaelis–Menten" with an en dash
 * and "michaelis menten" are the same answer. Letters are matched as Unicode
 * letters rather than [a-z], so Greek symbols the sciences lean on — Gα,
 * β-arrestin — survive instead of being stripped away.
 */
export function normalise(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[‐-―−/_-]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:the|an|a) /, '');
}

/**
 * Every form of a term that counts as naming it.
 *
 * A generated term often carries its abbreviation or a synonym in brackets —
 * "Atrial natriuretic peptide (ANP)", "Rough endoplasmic reticulum (rough
 * ER)" — so both the bracketed text and the term without it are accepted.
 * `also_known_as` is added as-is: it is the generator's own list of other
 * names for the thing.
 */
export function acceptedForms(a: Answerable): { norm: string; shown: string }[] {
  // Every grade compares against every other term in the course, so without
  // this each answer re-derived a few hundred terms' forms from scratch. The
  // same definition objects recur across a whole session, so they are cached
  // against the object itself; a WeakMap lets an edited course's old objects
  // be collected rather than pinned.
  const cached = FORMS.get(a);
  if (cached) return cached;
  const forms = deriveForms(a);
  FORMS.set(a, forms);
  return forms;
}

const FORMS = new WeakMap<Answerable, { norm: string; shown: string }[]>();

function deriveForms(a: Answerable): { norm: string; shown: string }[] {
  const raw: string[] = [a.term];
  const unbracketed = a.term.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  if (unbracketed) raw.push(unbracketed);
  for (const m of a.term.matchAll(/\(([^)]+)\)/g)) raw.push(m[1]);
  for (const alias of a.also_known_as ?? []) {
    raw.push(alias);
    const bare = alias.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    if (bare) raw.push(bare);
  }

  const seen = new Set<string>();
  const out: { norm: string; shown: string }[] = [];
  for (const shown of raw) {
    const norm = normalise(shown);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push({ norm, shown: shown.trim() });
  }
  return out;
}

/**
 * Edit distance counting a swap of two neighbouring letters as ONE edit.
 *
 * Plain Levenshtein charges a transposition — "recpetor" for "receptor" — as
 * two edits, which is the commonest typo there is and would be refused on
 * any short word. This is the restricted (optimal string alignment) form.
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[] = new Array(rows * cols);
  for (let i = 0; i < rows; i++) d[i * cols] = i;
  for (let j = 0; j < cols; j++) d[j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[(i - 1) * cols + j] + 1, d[i * cols + j - 1] + 1, d[(i - 1) * cols + j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, d[(i - 2) * cols + j - 2] + 1);
      }
      d[i * cols + j] = v;
    }
  }
  return d[rows * cols - 1];
}

/**
 * Whether `a` and `b` are within `limit` edits, without always paying for the
 * full comparison.
 *
 * Edit distance can never be less than the difference in length, so a form
 * whose length is further off than the limit is out before a single cell is
 * computed. Grading checks the answer against every form of every term in the
 * course; nearly all of them fail this test for free.
 */
function within(a: string, b: string, limit: number): number | null {
  if (Math.abs(a.length - b.length) > limit) return null;
  const d = editDistance(a, b);
  return d <= limit ? d : null;
}

/**
 * How many slips a form of this length can absorb.
 *
 * None at four characters or fewer: on "GABA" or "cAMP" one letter is a
 * quarter of the word, and "Kd" with a typo is simply another symbol. Then one
 * slip up to eight, two up to fourteen, three beyond — roughly one per six
 * letters, the rate at which a careful typist still slips.
 */
export function allowedSlips(length: number): number {
  if (length <= 4) return 0;
  if (length <= 8) return 1;
  if (length <= 14) return 2;
  return 3;
}

/**
 * Grade what the student typed for `target`, knowing every other term in the
 * course so a near miss that is really a confusion can be told apart.
 */
export function gradeTyped(input: string, target: Answerable, others: readonly Answerable[]): Verdict {
  const typed = normalise(input);
  if (!typed) return { correct: false, kind: 'wrong' };

  const mine = acceptedForms(target);

  // 1. An exact match on the ASKED term wins outright — checked before
  //    anything else, because two terms can share a form. A course with two
  //    definitions of Kd accepts "Kd" for either; checking other terms first
  //    would call it a confusion both times.
  if (mine.some((f) => f.norm === typed)) return { correct: true, kind: 'exact' };

  // 2. An exact match on a DIFFERENT term is the named mistake, never a typo.
  const theirs = others
    .filter((o) => o.term !== target.term)
    .map((o) => ({ term: o.term, forms: acceptedForms(o) }));
  const named = theirs.find((o) => o.forms.some((f) => f.norm === typed));
  if (named) return { correct: false, kind: 'confused', with: named.term };

  // 3. The nearest accepted form of the asked term, within its tolerance.
  let best: { d: number; shown: string } | null = null;
  for (const f of mine) {
    const d = within(typed, f.norm, allowedSlips(f.norm.length));
    if (d !== null && (!best || d < best.d)) best = { d, shown: f.shown };
  }
  if (!best) {
    // Wrong either way — but if it is a misspelling of ANOTHER term, say which.
    // "That is endocytosis, not exocytosis" is the correction the student
    // needs; a bare "wrong" leaves them to work out what they confused.
    for (const o of theirs) {
      if (o.forms.some((f) => within(typed, f.norm, allowedSlips(f.norm.length)) !== null)) {
        return { correct: false, kind: 'confused', with: o.term };
      }
    }
    return { correct: false, kind: 'wrong' };
  }

  // 4. …and only if no other term is at least as near. A tie counts against:
  //    an answer equally close to two terms has not shown which one was meant.
  for (const o of theirs) {
    for (const f of o.forms) {
      if (within(typed, f.norm, best.d) !== null) return { correct: false, kind: 'confused', with: o.term };
    }
  }
  return { correct: true, kind: 'typo', spelled: best.shown };
}

/** What stands in for the answer where a definition names its own term. */
export const BLANK = '_____';

/**
 * The definition with every name of its own term blanked out.
 *
 * A definition written to be read often uses its own term — "Glycine: an
 * amino acid messenger; glycine receptors are ligand-gated ion channels" —
 * and asked as a question it would then print the answer. One in twelve
 * definitions in a real generated course did. Every accepted form is blanked,
 * longest first so "Arginine vasopressin" goes before "vasopressin" can split
 * it, with a plural ending taken along, and any run of spaces or dashes in a
 * form matching any other, as the grader already treats them.
 */
export function maskTerm(text: string, target: Answerable): string {
  const forms = acceptedForms(target)
    .map((f) => f.shown)
    .sort((a, b) => b.length - a.length);
  let out = text;
  for (const form of forms) {
    const pattern = form
      .split(/[\s‐-―−-]+/)
      .filter(Boolean)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('[\\s‐-―−-]+');
    if (!pattern) continue;
    out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?:e?s)?(?![\\p{L}\\p{N}])`, 'giu'), BLANK);
  }
  return out;
}
