import { useMemo, useState } from 'react';
import { filterGlossary, type GlossaryEntry } from '@/lib/glossary';

/**
 * The lecture's glossary beside a sitting, on a wide screen (the owner,
 * 2026-11-16: "sometimes i wanna go back and double check the definition of
 * certain terms to fully understand a new one and i dont wanna have to exit
 * the mode"). Search and read; the sitting stays where it was.
 */
export function SessionGlossary({ entries }: { entries: GlossaryEntry[] }) {
  const [search, setSearch] = useState('');
  const shown = useMemo(() => filterGlossary(entries, search), [entries, search]);
  return (
    <section aria-label="Glossary" className="text-small">
      <label className="block">
        <span className="sr-only">Find a term</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Find a term"
          className="field w-full text-small"
        />
      </label>
      {/* Its own scroll, so the card beside it never moves. */}
      <dl className="mt-3 max-h-[calc(100vh-10rem)] overflow-y-auto border-t border-border pr-1">
        {shown.map(({ item }) => (
          <div key={item.id} className="border-b border-border py-2">
            <dt className="font-semibold text-text">
              {item.term}
              {item.also_known_as?.length ? <span className="font-normal text-text-3"> ({item.also_known_as.join(', ')})</span> : null}
            </dt>
            <dd className="mt-0.5 text-text-2">{item.definition}</dd>
          </div>
        ))}
        {shown.length === 0 && <p className="py-3 text-text-3">No terms match.</p>}
      </dl>
    </section>
  );
}
