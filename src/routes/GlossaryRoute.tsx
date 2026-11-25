import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { filterGlossary, glossaryOf, type GlossaryEntry } from '@/lib/glossary';
import { normaliseTerm } from '@/lib/termMatch';
import { scrollToAnchor } from '@/lib/scrollToAnchor';
import { useMediaQuery, WIDE } from '@/lib/useMediaQuery';

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
  const wide = useMediaQuery(WIDE);
  // Computer: the term clicked, and the one under the pointer (which wins while it is there).
  const [picked, setPicked] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
  const active = wide ? (shown.find((e) => e.item.id === (hovered ?? picked)) ?? shown[0] ?? null) : null;

  // "/" to search, and J / K down the list, on a computer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const typing = t instanceof Element && !!t.closest('input, textarea, select, [contenteditable="true"]');
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (typing || !wide || (e.key !== 'j' && e.key !== 'k')) return;
      const at = shown.findIndex((x) => x.item.id === (picked ?? shown[0]?.item.id));
      const next = shown[Math.min(shown.length - 1, Math.max(0, at + (e.key === 'j' ? 1 : -1)))];
      if (!next) return;
      setPicked(next.item.id);
      document.getElementById(entryAnchor(next.item.id))?.scrollIntoView({ block: 'nearest' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown, picked, wide]);

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

  const seeAlso = (e: GlossaryEntry, className = 'mt-1 text-small text-text-3') => {
    const names = (e.item.related_terms ?? []).filter((t) => normaliseTerm(t) !== normaliseTerm(e.item.term));
    if (!names.length) return null;
    return (
      <p className={className}>
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
                    if (wide) setPicked(target.item.id);
                    requestAnimationFrame(() => {
                      if (wide) document.getElementById(entryAnchor(target.item.id))?.scrollIntoView({ block: 'nearest' });
                      else scrollToAnchor(entryAnchor(target.item.id));
                    });
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
            Terms come from the definitions in a lecture.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-2 text-body text-text-2">
            {all.length} term{all.length === 1 ? '' : 's'}
          </p>
          <label className="mt-5 flex items-baseline gap-3">
            <span className="mark shrink-0 text-text-3">Find</span>
            <input
              type="search"
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={wide ? 'a term or a word in its meaning (press /)' : 'a term or a word in its meaning'}
              aria-label="Search the glossary"
              className="field w-full text-small"
            />
          </label>
          {search && (
            <p className="mt-2 text-small text-text-3" aria-live="polite">
              {shown.length} of {all.length} shown
            </p>
          )}

          <div className={wide ? 'mt-6 grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(15rem,21rem)] gap-x-8' : 'mt-6 pr-7'}>
            {wide && (
              <LetterIndex
                present={present}
                onJump={(l) => scrollToAnchor(letterAnchor(l))}
                className="sticky top-6 self-start"
                vertical="wide"
              />
            )}
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
                    {g.entries.map((e) => {
                      const on = wide && active?.item.id === e.item.id;
                      return (
                        <div
                          key={e.item.id}
                          id={entryAnchor(e.item.id)}
                          tabIndex={-1}
                          className="scroll-mt-20 border-b border-border py-3"
                          onMouseEnter={wide ? () => setHovered(e.item.id) : undefined}
                          onMouseLeave={wide ? () => setHovered(null) : undefined}
                        >
                          <dt className="flex items-baseline justify-between gap-3">
                            {wide ? (
                              <button
                                type="button"
                                onClick={() => setPicked(e.item.id)}
                                aria-pressed={picked === e.item.id}
                                className={`min-w-0 truncate text-left font-display font-semibold ${
                                  on ? 'text-accent underline decoration-accent decoration-2 underline-offset-4' : 'text-text'
                                }`}
                              >
                                {e.item.term}
                              </button>
                            ) : (
                              <span className="font-display font-semibold text-text">{e.item.term}</span>
                            )}
                            <Link
                              to={`/study/${id}/section/${encodeURIComponent(e.sectionId)}`}
                              className={`hidden truncate text-micro uppercase tracking-wider text-text-3 hover:text-text ${wide ? '' : 'sm:block'}`}
                            >
                              {e.sectionTitle}
                            </Link>
                          </dt>
                          {wide ? (
                            // The meaning is beside the list; here only its first line.
                            <dd className="mt-1 truncate text-small text-text-3">{e.item.definition}</dd>
                          ) : (
                            <dd className="mt-1 max-w-prose text-body text-text-2">
                              {!!e.item.also_known_as?.length && (
                                <span className="italic text-text-3">Also {e.item.also_known_as.join(', ')}. </span>
                              )}
                              {e.item.definition}
                              {seeAlso(e)}
                            </dd>
                          )}
                        </div>
                      );
                    })}
                  </dl>
                </section>
              ))}
            </div>

            {wide && (
              // The meaning in full, beside the list, for the term pointed at or picked.
              <aside
                aria-label="Meaning"
                aria-live="polite"
                className="sticky top-6 max-h-[calc(100vh-3rem)] self-start overflow-y-auto border-l border-border pl-8 [scrollbar-width:thin]"
              >
                {active ? (
                  <>
                    <p className="mark text-text-3">{active.sectionTitle}</p>
                    <h2 className="mt-1 font-display text-title font-semibold text-text">{active.item.term}</h2>
                    {!!active.item.also_known_as?.length && (
                      <p className="mt-1 text-small italic text-text-3">Also {active.item.also_known_as.join(', ')}</p>
                    )}
                    <p className="mt-3 text-body text-text-2">{active.item.definition}</p>
                    {seeAlso(active, 'mt-4 text-small text-text-3')}
                    <Link
                      to={`/study/${id}/section/${encodeURIComponent(active.sectionId)}`}
                      className="mt-4 inline-block text-small text-text-3 underline decoration-border underline-offset-4 hover:text-text"
                    >
                      Open its section
                    </Link>
                  </>
                ) : (
                  <p className="text-small text-text-3">Nothing to show.</p>
                )}
              </aside>
            )}

            {!wide && (
              <LetterIndex present={present} onJump={(l) => scrollToAnchor(letterAnchor(l))} vertical="phone" />
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The letters of the glossary as an index. On a phone it runs down the right
 * edge, inside the safe area and clear of the bottom, and a thumb can run
 * down it: the page follows and the letter under the finger is named large.
 * On a computer it is a quiet column at the side.
 */
function LetterIndex({
  present,
  onJump,
  className = '',
  vertical,
}: {
  present: Set<string>;
  onJump: (letter: string) => void;
  className?: string;
  vertical: 'phone' | 'wide';
}) {
  const strip = useRef<HTMLOListElement>(null);
  const viaTouch = useRef(false);
  const [held, setHeld] = useState<string | null>(null);

  const letterAt = (clientY: number) => {
    const box = strip.current?.getBoundingClientRect();
    if (!box || box.height === 0) return null;
    const i = Math.min(LETTERS.length - 1, Math.max(0, Math.floor(((clientY - box.top) / box.height) * LETTERS.length)));
    return LETTERS[i]!;
  };
  const run = (clientY: number) => {
    const l = letterAt(clientY);
    if (!l) return;
    // Letters with no terms: the nearest earlier one that has some.
    let at = LETTERS.indexOf(l);
    while (at > 0 && !present.has(LETTERS[at]!)) at -= 1;
    const target = LETTERS[at]!;
    if (!present.has(target)) return;
    setHeld(target);
    // Instant: a smooth scroll lags behind a moving thumb.
    document.getElementById(letterAnchor(target))?.scrollIntoView({ block: 'start' });
  };

  const touch =
    vertical === 'phone'
      ? {
          onPointerDown: (e: React.PointerEvent) => {
            if (e.pointerType !== 'touch') return;
            viaTouch.current = true;
            e.currentTarget.setPointerCapture?.(e.pointerId);
            run(e.clientY);
          },
          onPointerMove: (e: React.PointerEvent) => {
            if (viaTouch.current) run(e.clientY);
          },
          onPointerUp: () => {
            setHeld(null);
            setTimeout(() => (viaTouch.current = false), 400);
          },
          onPointerCancel: () => {
            setHeld(null);
            viaTouch.current = false;
          },
        }
      : {};

  const nav =
    vertical === 'phone'
      ? 'fixed right-[max(0.25rem,env(safe-area-inset-right))] top-28 z-20 h-[min(30rem,calc(100dvh-14rem))] w-6 touch-none select-none'
      : '';

  return (
    <nav aria-label="Jump to letter" className={`${nav} ${className}`} {...touch}>
      <ol ref={strip} className={`flex flex-col items-center text-micro ${vertical === 'phone' ? 'h-full justify-between' : 'text-small'}`}>
        {LETTERS.map((l) =>
          present.has(l) ? (
            <li key={l}>
              <button
                type="button"
                onClick={() => {
                  if (!viaTouch.current) onJump(l);
                }}
                className={`${vertical === 'phone' ? 'px-1.5 leading-4' : 'px-2 leading-5'} ${
                  held === l ? 'text-accent' : 'text-text-2 hover:text-accent'
                }`}
              >
                {l}
              </button>
            </li>
          ) : (
            <li key={l} aria-hidden="true" className={`${vertical === 'phone' ? 'px-1.5 leading-4' : 'px-2 leading-5'} text-text-3 opacity-40`}>
              {l}
            </li>
          ),
        )}
      </ol>
      {vertical === 'phone' && held && (
        <span
          aria-hidden="true"
          className="paper-grain pointer-events-none fixed right-12 top-1/2 -translate-y-1/2 border-b-2 border-accent bg-bg px-4 font-display text-display font-semibold text-accent"
        >
          {held}
        </span>
      )}
    </nav>
  );
}
