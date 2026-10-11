import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { filterGlossary, glossaryOf, type GlossaryEntry } from '@/lib/glossary';
import { normaliseTerm } from '@/lib/termMatch';
import { scrollToAnchor } from '@/lib/scrollToAnchor';

const LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

const entryAnchor = (id: string) => `term-${encodeURIComponent(id)}`;
const letterAnchor = (letter: string) => `letter-${letter === '#' ? 'num' : letter}`;

/**
 * "/study/:id/glossary" — every term in the course, A–Z, to read.
 *
 * Browse shows items by section and Terms quizzes them; neither is somewhere
 * to look a word up. This is set like the glossary at the back of a book:
 * ruled letter heads, the term run in before its meaning, "see also" to the
 * terms it leans on, and a thumb index of letters down the side on a desktop.
 */
export function GlossaryRoute() {
  const { id } = useParams<{ id: string }>();
  const course = useCoursesStore((s) => (id ? s.courses[id] : undefined));
  const [search, setSearch] = useState('');

  const all = useMemo(() => (course ? glossaryOf(course) : []), [course]);
  const shown = useMemo(() => filterGlossary(all, search), [all, search]);
  // A related term that is itself in the glossary becomes a link to it.
  const byTerm = useMemo(() => {
    const map = new Map<string, GlossaryEntry>();
    for (const e of all) {
      for (const name of [e.item.term, e.item.term.replace(/\s*\([^)]*\)/g, ''), ...(e.item.also_known_as ?? [])]) {
        const key = normaliseTerm(name);
        if (key && !map.has(key)) map.set(key, e);
      }
    }
    return map;
  }, [all]);
  const groups = useMemo(() => {
    const out: { letter: string; entries: GlossaryEntry[] }[] = [];
    for (const e of shown) {
      if (out.at(-1)?.letter !== e.letter) out.push({ letter: e.letter, entries: [] });
      out.at(-1)!.entries.push(e);
    }
    return out;
  }, [shown]);
  const present = new Set(groups.map((g) => g.letter));

  if (!id) return <Navigate to="/" replace />;
  if (!course) {
    return (
      <div className="py-6 text-center text-text-2">
        Lecture not found.{' '}
        <Link to="/" className="text-accent hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  const seeAlso = (e: GlossaryEntry) => {
    const names = (e.item.related_terms ?? []).filter((t) => normaliseTerm(t) !== normaliseTerm(e.item.term));
    if (!names.length) return null;
    return (
      <p className="mt-1 text-small text-text-3">
        <span className="italic">See also</span>{' '}
        {names.map((name, i) => {
          const target = byTerm.get(normaliseTerm(name));
          return (
            <span key={name}>
              {i > 0 && ', '}
              {target && target !== e ? (
                // A button, not an anchor: a #fragment would be read as a route.
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    // After the filter clears, so the entry is on the page.
                    requestAnimationFrame(() => scrollToAnchor(entryAnchor(target.item.id)));
                  }}
                  className="text-text-2 underline decoration-border underline-offset-2 hover:text-text"
                >
                  {name}
                </button>
              ) : (
                name
              )}
            </span>
          );
        })}
      </p>
    );
  };

  return (
    <div>
      <Link to={`/study/${id}`} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
        ← {course.metadata.title}
      </Link>
      <h1 className="mt-3 font-display text-display font-semibold text-text">Glossary</h1>

      {all.length === 0 ? (
        <div className="mt-6 border-y border-border py-8 text-center">
          <p className="text-text-2">This lecture has no terms yet.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-text-3">
            Terms come from the definitions in a lecture. &ldquo;More practice&rdquo; on the lecture
            page can ask for them.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-2 text-body text-text-2">
            {all.length} term{all.length === 1 ? '' : 's'}, from A to Z.
          </p>
          <label className="mt-5 flex items-baseline gap-3">
            <span className="mark shrink-0 text-text-3">Find</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="a term or a word in its meaning"
              aria-label="Search the glossary"
              className="field w-full text-small"
            />
          </label>
          {search && (
            <p className="mt-2 text-small text-text-3" aria-live="polite">
              {shown.length} of {all.length} shown
            </p>
          )}

          <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_2rem] lg:gap-10">
            <div className="min-w-0">
              {groups.length === 0 && (
                <p className="border-y border-border py-6 text-center text-text-2">Nothing matches &ldquo;{search}&rdquo;.</p>
              )}
              {groups.map((g) => (
                <section key={g.letter} aria-label={g.letter === '#' ? 'Symbols and numbers' : g.letter} className="mb-8">
                  <h2
                    id={letterAnchor(g.letter)}
                    tabIndex={-1}
                    className="scroll-mt-20 border-b border-border pb-1 font-display text-heading font-semibold text-text"
                  >
                    {g.letter}
                  </h2>
                  <dl>
                    {g.entries.map((e) => (
                      <div
                        key={e.item.id}
                        id={entryAnchor(e.item.id)}
                        tabIndex={-1}
                        className="scroll-mt-20 border-b border-border py-3"
                      >
                        <dt className="flex items-baseline justify-between gap-3">
                          <span className="font-display font-semibold text-text">{e.item.term}</span>
                          <Link
                            to={`/study/${id}/section/${encodeURIComponent(e.sectionId)}`}
                            className="hidden truncate text-micro uppercase tracking-wider text-text-3 hover:text-text sm:block"
                          >
                            {e.sectionTitle}
                          </Link>
                        </dt>
                        <dd className="mt-1 max-w-prose text-body text-text-2">
                          {!!e.item.also_known_as?.length && (
                            <span className="italic text-text-3">Also {e.item.also_known_as.join(', ')}. </span>
                          )}
                          {e.item.definition}
                          {seeAlso(e)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>

            {/* The thumb index: only where there is room for it beside the text. */}
            <nav aria-label="Jump to letter" className="hidden lg:block">
              <ol className="sticky top-6 flex flex-col items-center text-small">
                {LETTERS.map((l) =>
                  present.has(l) ? (
                    <li key={l}>
                      <button
                        type="button"
                        onClick={() => scrollToAnchor(letterAnchor(l))}
                        className="px-2 leading-6 text-text-2 hover:text-accent"
                      >
                        {l}
                      </button>
                    </li>
                  ) : (
                    <li key={l} aria-hidden="true" className="px-2 leading-6 text-text-3 opacity-40">
                      {l}
                    </li>
                  ),
                )}
              </ol>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
