import { useMemo, useState } from 'react';
import type { DefinitionItem } from '@/schema/course';
import { normaliseTerm } from '@/lib/termMatch';

/**
 * A term's neighbours, to tell it apart from: the generator's
 * `related_terms`, the terms the lecture sets beside it. They used to sit
 * under a definition as buttons that did nothing (the owner, 2026-10-26:
 * "I have never found it useful"). Now a neighbour the lecture defines opens
 * its meaning under this one, so the two can be read side by side, which is
 * what telling confusable things apart takes (docs/evidence.md). A name the
 * lecture does not define is left out: usually a part of the idea ("liquid
 * water" under habitability) rather than something to tell it apart from,
 * and with nothing to open it was the clutter the owner meant.
 */
export function RelatedTerms({
  names,
  glossary,
  self,
  className = 'mt-2',
}: {
  names: readonly string[] | undefined;
  glossary: readonly DefinitionItem[];
  /** The term these are related to, never listed as its own neighbour. */
  self: DefinitionItem;
  className?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const byName = useMemo(() => {
    const m = new Map<string, DefinitionItem>();
    for (const d of glossary) for (const n of [d.term, ...(d.also_known_as ?? [])]) if (!m.has(normaliseTerm(n))) m.set(normaliseTerm(n), d);
    return m;
  }, [glossary]);
  const shown = (names ?? [])
    .map((name) => ({ name, def: byName.get(normaliseTerm(name)) }))
    .filter((s): s is { name: string; def: DefinitionItem } => !!s.def && s.def.id !== self.id);
  if (!shown.length) return null;
  const opened = shown.find((s) => s.def.id === open)?.def;

  return (
    <div className={className}>
      <p className="text-small text-text-2">
        <span className="text-text-3">Compare with </span>
        {shown.map(({ name, def }, i) => (
          <span key={name}>
            {i > 0 && <span className="text-text-3"> · </span>}
            <button
              type="button"
              aria-expanded={open === def.id}
              onClick={() => setOpen((o) => (o === def.id ? null : def.id))}
              className={`tap-safe underline-offset-4 ${open === def.id ? 'text-accent underline decoration-accent' : 'text-text underline decoration-border-strong hover:decoration-text'}`}
            >
              {name}
            </button>
          </span>
        ))}
      </p>
      {opened && (
        <p className="mt-2 border-l-2 border-border-strong pl-3 text-small text-text-2">
          <span className="mr-1.5 font-semibold uppercase tracking-wider text-text">{opened.term}.</span>
          {opened.definition}
        </p>
      )}
    </div>
  );
}
