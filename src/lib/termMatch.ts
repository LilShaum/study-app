/**
 * Matching a technical term against text, tolerantly enough to be useful and
 * strictly enough to be trusted.
 *
 * Every check in this app that asks "is this term covered?" goes through here,
 * because two checks disagreeing about the same course is worse than either
 * being imperfect: the health panel would say a term is defined while the gap
 * list says it is missing, and neither number could be believed.
 *
 * Kept behaviourally identical to the matcher in scripts/audit-course.mjs.
 */

/** Lower-case, accent-folded, punctuation-stripped. */
export function normaliseTerm(s: string): string {
  return (
    s
      .toLowerCase()
      // Fold accents rather than strip them, or "Némethy" splits into two
      // tokens and will never match a definition titled "Nemethy".
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[‐-―−]/g, '-')
      // Sub/superscript digits carry meaning (v₀, K₀.₅, IC₅₀); fold them to
      // ASCII before stripping punctuation, or "v₀" collapses to a bare "v".
      .replace(/[₀-₉]/g, (d) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(d)))
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  );
}

/**
 * Significant tokens of a term, with plurals folded.
 *
 * Whole-phrase matching is too strict in both the ways that actually occur: a
 * generator declares "isozyme" and titles the definition "Isozymes", or
 * declares "concerted model" and titles it "Concerted (MWC) model". Both are
 * covered; whole-phrase matching calls them missing, and telling a student a
 * term is absent when it is present is the one error these checks must not
 * make.
 */
export function termTokens(s: string): Set<string> {
  return new Set(
    normaliseTerm(s)
      .split(' ')
      .filter(Boolean)
      .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)),
  );
}

/** True when every token of the wanted term appears in the candidate. */
export function coversTokens(have: Set<string>, want: Set<string>): boolean {
  for (const w of want) if (!have.has(w)) return false;
  return true;
}

/**
 * True when at least one of `texts` covers every token of `term`.
 *
 * Per-text rather than against everything joined: "is 'Michaelis constant
 * (Km)' tested?" must mean "does one question ask about it", not "do the
 * words 'michaelis', 'constant' and 'km' each appear somewhere in the
 * course". Joined, a long course marks nearly every term as covered.
 */
export function someTextCoversTerm(texts: readonly string[], term: string): boolean {
  const want = termTokens(term);
  if (!want.size) return false;
  return texts.some((text) => coversTokens(termTokens(text), want));
}
