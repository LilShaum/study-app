const OUTSIDE = /^\s*outside the (slides|notes|source)\b/i;

/**
 * Shows the passage from the student's own notes that an item was generated
 * from.
 *
 * prompts/generator.md makes `source_excerpt` mandatory on every item — it's the main
 * structural defence against the generator inventing facts. That guarantee is
 * worthless if it's never surfaced: this is what lets you check a card against
 * what your notes actually said. Collapsed by default, except in Learn, so it doesn't compete
 * with the card itself while studying.
 */
export function SourceNote({ excerpt, open = false }: { excerpt?: string; open?: boolean }) {
  if (!excerpt?.trim()) return null;
  // The generator's label on what it added itself (prompts/generator.md,
  // obligation 1): said on the closed line too, since the whole point is that
  // the student sees it is not from their material and checks it against class.
  const from = OUTSIDE.test(excerpt) ? 'Not from your notes' : 'From your notes';

  return (
    // Open on Learn's reading cards: there the passage is the lesson, and a
    // question later may ask for what only it says (docs/proposals/learn.md).
    // Open after every answer in Learn too: feedback that restudied the
    // passage beat feedback without it (Karpicke & Roediger 2010).
    <details open={open} className="group/src mt-3 border-t border-border-light pt-2">
      <summary className="tap-safe flex cursor-pointer list-none items-center text-xs text-text-3 hover:text-text-2">
        <span className="group-open/src:hidden">{from} ▸</span>
        <span className="hidden group-open/src:inline">{from} ▾</span>
      </summary>
      <blockquote className="mt-1.5 border-l-2 border-border-strong pl-2.5 text-xs italic text-text-2">
        {excerpt}
      </blockquote>
    </details>
  );
}
