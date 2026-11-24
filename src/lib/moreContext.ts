/**
 * "Explain more than my slides do", ticked on New lecture (the owner,
 * 2026-11-24: "provide more explanation and context to notes … an option
 * that is clear on what it does"; not the default, which would put "more
 * possibly unneeded strain on the generating ai"). It asks for fuller
 * narration where the slides are thin, every addition labelled and never
 * scored, as the generator's own rule for reasons says.
 */
export function moreContextBlock(on: boolean): string {
  if (!on) return '';
  return `════════ MORE EXPLANATION ════════

I want more explanation and context than my slides give. Besides what your
instructions already ask:
- Write an \`explain\` for every key and supporting idea the slides state
  without saying how it works or why, not only the key ones.
- Give every figure the lecture uses a \`graphic\` with its \`why\`, and
  gloss in a few words each term the slides use without explaining it,
  where it first matters.
- What you add from outside the slides is marked \`Outside the slides:\` as
  your instructions say, and no question, flashcard or definition rests on
  it.
- Only what makes the material make sense: no padding, nothing new to
  memorise.

`;
}
