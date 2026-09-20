/**
 * Shows the passage from the student's own notes that an item was generated
 * from.
 *
 * CLAUDE.md makes `source_excerpt` mandatory on every item — it's the main
 * structural defence against the generator inventing facts. That guarantee is
 * worthless if it's never surfaced: this is what lets you check a card against
 * what your notes actually said. Collapsed by default so it doesn't compete
 * with the card itself while studying.
 */
export function SourceNote({ excerpt }: { excerpt?: string }) {
  if (!excerpt?.trim()) return null;

  return (
    <details className="group/src mt-3 border-t border-border-light pt-2">
      <summary className="cursor-pointer list-none text-xs text-text-3 hover:text-text-2">
        <span className="group-open/src:hidden">From your notes ▸</span>
        <span className="hidden group-open/src:inline">From your notes ▾</span>
      </summary>
      <blockquote className="mt-1.5 border-l-2 border-border-strong pl-2.5 text-xs italic text-text-2">
        {excerpt}
      </blockquote>
    </details>
  );
}
