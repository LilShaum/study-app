import { useMemo, useState } from 'react';
import { filterGlossary, type GlossaryEntry } from '@/lib/glossary';
import { someTextCoversTerm } from '@/lib/termMatch';

/** Every piece of text on a card: its question, options, answer and explanation, however its type names them. */
function cardTexts(card: unknown): string[] {
  const out: string[] = [];
  if (!card || typeof card !== 'object') return out;
  for (const [key, value] of Object.entries(card)) {
    if (key.startsWith('_') || key === 'id' || key === 'type') continue;
    if (typeof value === 'string') out.push(value);
    else if (Array.isArray(value)) for (const v of value) if (typeof v === 'string') out.push(v);
  }
  return out;
}

/**
 * The lecture's glossary beside a sitting (the owner, 2026-11-16: "sometimes
 * i wanna go back and double check the definition of certain terms to fully
 * understand a new one and i dont wanna have to exit the mode"). Search and
 * read; the sitting stays where it was.
 *
 * The terms the card on screen uses come first, under "On this card", so
 * the meaning of a word in front of you is beside it without a search. Only
 * ever shown once the card is answered or is for reading: the glossary is
 * shut while a question waits.
 */
export function SessionGlossary({ entries, card }: { entries: GlossaryEntry[]; card?: unknown }) {
  const [search, setSearch] = useState('');
  const shown = useMemo(() => filterGlossary(entries, search), [entries, search]);
  const texts = useMemo(() => cardTexts(card), [card]);
  const onCard = useMemo(
    () => (search.trim() || !texts.length ? [] : entries.filter(({ item }) => someTextCoversTerm(texts, item.term))),
    [entries, texts, search],
  );
  const here = new Set(onCard.map(({ item }) => item.id));
  const rest = shown.filter(({ item }) => !here.has(item.id));

  const entry = ({ item }: GlossaryEntry) => (
    <div key={item.id} className="border-b border-border py-2">
      <dt className="font-semibold text-text">
        {item.term}
        {item.also_known_as?.length ? <span className="font-normal text-text-3"> ({item.also_known_as.join(', ')})</span> : null}
      </dt>
      <dd className="mt-0.5 text-text-2">{item.definition}</dd>
    </div>
  );

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
      <div className="mt-3 max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">
        {onCard.length > 0 && (
          <section aria-label="On this card" className="mb-4">
            <h3 className="mark mb-1 text-text-3">On this card</h3>
            <dl className="border-t border-border">{onCard.map(entry)}</dl>
          </section>
        )}
        {onCard.length > 0 && rest.length > 0 && <h3 className="mark mb-1 text-text-3">All terms</h3>}
        <dl className="border-t border-border">{rest.map(entry)}</dl>
        {shown.length === 0 && <p className="py-3 text-text-3">No terms match.</p>}
      </div>
    </section>
  );
}
