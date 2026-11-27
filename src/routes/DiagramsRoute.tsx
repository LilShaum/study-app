import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { sortedSections } from '@/lib/sortedSections';
import { prepareSvg } from '@/lib/prepareSvg';
import { normalizeDiagram } from '@/schema/diagram';
import { scrollToAnchor } from '@/lib/scrollToAnchor';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { useMediaQuery, WIDE } from '@/lib/useMediaQuery';
import { useSwipe } from '@/lib/useSwipe';
import { SourceNote } from '@/components/items/SourceNote';
import { FigureElsewhere, FigureWhy } from '@/components/items/GraphicCard';
import { DrawnDiagram } from '@/components/items/DrawnDiagram';
import { purposeLabel } from '@/lib/figurePurpose';
import type { GraphicItem } from '@/schema/course';
import { prefersReducedMotion, scrollBehavior } from '@/lib/motion';

/** Lectures whose row of sections has already shown it moves, this visit. */
const glided = new Set<string>();

/**
 * The phone's row of sections: the figures' running head (docs/proposals/
 * diagrams-row.md; the owner, 2026-11-25, Testing 9: "it needs to be easy
 * for the users to assume they can scroll it"). Each reason a student missed
 * it is answered by the row itself, never by a line telling them:
 *
 * - it read as a line of text: the section you are in is marked as every
 *   choice is (accent, underscored), the others quiet, each with its count
 *   of figures as a small numeral, so it reads as a list of places;
 * - its cut-off edge looked like a fault: where more names wait, the edge
 *   fades into the paper instead, on whichever side has more;
 * - nothing moved: on arrival, when it is wider than the screen, it glides a
 *   little way and back, once a visit (not with reduced motion);
 * - Next never touched it: turning a figure moves the mark along it and
 *   scrolls it to keep the mark in view, so it is seen to be the sequence;
 * - it went off the top: it stays at the top of the screen, on paper.
 */
function SectionRow({
  courseId,
  sections,
  current,
  onPick,
}: {
  courseId: string;
  sections: { id: string; title: string; count: number }[];
  current: string | undefined;
  onPick: (sectionId: string) => void;
}) {
  const row = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ left: false, right: false });
  const measure = useCallback(() => {
    const el = row.current;
    if (!el) return;
    setMore({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  }, []);

  // The mark kept in view, centred where the row allows.
  useEffect(() => {
    const el = row.current;
    const on = el?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!el || !on) return;
    el.scrollTo?.({ left: on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2, behavior: scrollBehavior() });
  }, [current]);

  // The glide on arrival: a little way along, and back.
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    measure();
    if (glided.has(courseId) || prefersReducedMotion() || el.scrollWidth <= el.clientWidth + 2) return;
    glided.add(courseId);
    const from = el.scrollLeft;
    const out = window.setTimeout(() => el.scrollTo?.({ left: from + 56, behavior: scrollBehavior() }), 650);
    const back = window.setTimeout(() => el.scrollTo?.({ left: from, behavior: scrollBehavior() }), 1250);
    return () => {
      window.clearTimeout(out);
      window.clearTimeout(back);
    };
  }, [courseId, measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const fade = (left: boolean, right: boolean) =>
    `linear-gradient(to right, ${left ? 'transparent 0, #000 2.5rem' : '#000 0'}, ${right ? '#000 calc(100% - 2.5rem), transparent 100%' : '#000 100%'})`;

  return (
    <nav
      aria-label="Sections with figures"
      // On paper, under the status bar's band in the installed app.
      className="paper-grain sticky z-10 -mx-5 mt-4 border-b border-border bg-bg px-5"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <div
        ref={row}
        onScroll={measure}
        className="flex gap-x-6 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: fade(more.left, more.right), WebkitMaskImage: fade(more.left, more.right) }}
      >
        {sections.map((x) => {
          const on = x.id === current;
          return (
            <button
              key={x.id}
              type="button"
              aria-current={on || undefined}
              onClick={() => onPick(x.id)}
              className={`tap-safe shrink-0 whitespace-nowrap text-small ${on ? 'text-accent' : 'text-text-2 hover:text-text'}`}
            >
              <span className={on ? 'underline decoration-accent decoration-2 underline-offset-[6px]' : undefined}>{x.title}</span>
              <span className={`ml-1.5 align-[0.15em] text-micro tabular-nums ${on ? 'text-accent' : 'text-text-3'}`}>{x.count}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}


interface Plate {
  item: GraphicItem;
  number: number;
  sectionId: string;
  sectionTitle: string;
  /** The first plate of each section carries the id the jump nav targets. */
  anchor: string | null;
}

/**
 * A diagram, presented as a plate.
 *
 * Sitting on the paper rather than inside a bordered, filled card — a drawing
 * in a sunken box with a hairline round it is the exact styling of an image
 * that failed to load, which is the one place where framing the artwork
 * actively works against it. A rule above, a number, the drawing, and a
 * caption under it.
 */
function PlateFigure({
  plate,
  courseId,
  tile,
  onOpen,
}: {
  plate: Plate;
  courseId: string;
  /** On a computer, one plate of a grid: the drawing small, and a click opens it large. */
  tile?: boolean;
  onOpen?: () => void;
}) {
  const { item } = plate;
  // Sanitized + theme-adapted; see prepareSvg for why raw markup isn't used.
  const svg = useMemo(() => prepareSvg(item.svg), [item.svg]);
  const diagram = useMemo(() => normalizeDiagram(item.diagram), [item.diagram]);
  const purpose = purposeLabel(item.purpose);

  return (
    <figure
      id={plate.anchor ?? undefined}
      tabIndex={plate.anchor ? -1 : undefined}
      className="scroll-mt-20 border-t border-border pt-5"
    >
      <div className="flex items-baseline justify-between gap-3 text-micro uppercase tracking-wider text-text-3">
        {/* Set as a paper sets it: "Figure 1." in its own case (the owner, 2026-11-25). */}
        <span className="whitespace-nowrap font-semibold normal-case tracking-normal text-text">
          Figure {plate.number}.
          {purpose && <span className="normal-case tracking-normal"> · {purpose}</span>}
        </span>
        <Link
          to={`/study/${courseId}/section/${encodeURIComponent(plate.sectionId)}`}
          className="truncate hover:text-text"
        >
          {plate.sectionTitle}
        </Link>
      </div>

      {diagram ? (
        tile ? (
          // A plate in the grid shows the drawing still; opening it gives the parts to tap.
          <FitTile onOpen={onOpen}>
            <DrawnDiagram key={item.id} diagram={diagram} title={item.alt_text || item.title} still />
          </FitTile>
        ) : (
          <div className="mt-4 border-y border-border py-5">
            <DrawnDiagram key={item.id} diagram={diagram} title={item.alt_text || item.title} />
          </div>
        )
      ) : svg && (
        <div
          role="img"
          aria-label={item.alt_text || item.title}
          onClick={tile ? onOpen : undefined}
          className={'figure-svg ' + 
            tile
              ? 'mt-4 flex h-48 cursor-zoom-in items-center justify-center text-text [&_svg]:max-h-full [&_svg]:max-w-full'
              : // On a phone the plate runs the full width of the page, ruled above and below.
                'mt-4 flex items-center justify-center border-y border-border py-5 text-text [&_svg]:max-h-[60dvh] [&_svg]:w-full'
          }
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}

      <figcaption className={svg || diagram ? 'mt-4' : 'mt-3'}>
        {tile ? (
          <button
            type="button"
            onClick={onOpen}
            className="text-left font-display text-heading font-semibold text-text hover:text-accent"
          >
            {item.title}
          </button>
        ) : (
          <span className="font-display text-heading font-semibold text-text">{item.title}</span>
        )}
        {/* Why it is on the screen and what to look at: the sentences that
            went with the figure and never made it onto the slide. */}
        {!tile && <FigureWhy why={item.why} where={item.where} drawn={!!(svg || diagram)} className="mt-1 max-w-prose text-small text-text-2" />}
        {tile && item.caption && <p className="mt-1 line-clamp-2 text-small text-text-3">{item.caption}</p>}
        {!tile && item.caption && <p className="mt-1 max-w-prose text-small text-text-3">{item.caption}</p>}
        {/* A figure with no drawing of ours is still a plate: it says where
            the real one is, so the gallery indexes what the lecture turns on. */}
        {tile && !svg && !diagram && (
          <div className="mt-2">
            <FigureElsewhere where={item.where} />
          </div>
        )}
        {/* The passage the diagram was drawn from stays: it is the evidence
            the drawing is grounded in, and it is already quiet enough to sit
            under a caption. The difficulty badge does not — a diagram is read,
            never scored, so a difficulty on it was a field from the data model
            wearing a component. */}
        {!tile && <SourceNote excerpt={item.source_excerpt} page={item.source_page} />}
      </figcaption>
    </figure>
  );
}

/**
 * A drawn diagram shrunk whole into a grid tile's height, so a tall pathway
 * shows end to end rather than cut off at the tile's edge.
 */
function FitTile({ onOpen, children }: { onOpen?: () => void; children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const fit = () => setScale(Math.min(1, TILE_HEIGHT / Math.max(1, el.scrollHeight)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div onClick={onOpen} className="mt-4 cursor-zoom-in overflow-hidden" style={{ height: TILE_HEIGHT }}>
      <div ref={inner} style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
        {children}
      </div>
    </div>
  );
}

const TILE_HEIGHT = 192;

/** One plate opened large, its note beside it (a leaf over the page on a computer). */
function PlateDetail({
  plate,
  courseId,
  position,
  onStep,
  onClose,
}: {
  plate: Plate;
  courseId: string;
  position: string;
  onStep: (by: 1 | -1) => void;
  onClose: () => void;
}) {
  const { item } = plate;
  const svg = useMemo(() => prepareSvg(item.svg), [item.svg]);
  const diagram = useMemo(() => normalizeDiagram(item.diagram), [item.diagram]);
  const purpose = purposeLabel(item.purpose);

  // The arrow keys turn the plate, as pages are turned.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onStep(1);
      else if (e.key === 'ArrowLeft') onStep(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStep]);

  return (
    <Sheet label={`Figure ${plate.number}: ${item.title}`} title={`Figure ${plate.number}.`} onClose={onClose} width="4xl">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)] gap-x-8 p-6">
        <div className="flex min-h-64 items-center justify-center text-text [&_svg]:max-h-[70vh] [&_svg]:max-w-full">
          {diagram ? (
            <DrawnDiagram key={item.id} diagram={diagram} title={item.alt_text || item.title} />
          ) : svg ? (
            <div role="img" aria-label={item.alt_text || item.title} className="figure-svg w-full [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <FigureElsewhere where={item.where} />
          )}
        </div>
        <div className="border-l border-border pl-8">
          <p className="mark text-text-3">
            {purpose ? `${purpose} · ` : ''}
            <Link to={`/study/${courseId}/section/${encodeURIComponent(plate.sectionId)}`} className="hover:text-text">
              {plate.sectionTitle}
            </Link>
          </p>
          <h2 className="mt-1 font-display text-title font-semibold text-text">{item.title}</h2>
          <div className="mt-3">
            <FigureWhy why={item.why} where={item.where} drawn={!!(svg || diagram)} className="text-small text-text-2" />
          </div>
          {item.caption && <p className="mt-2 text-small text-text-3">{item.caption}</p>}
          <SourceNote excerpt={item.source_excerpt} page={item.source_page} />
          <div className="mt-6 flex items-baseline justify-between gap-3 border-t border-border pt-3 text-small text-text-3">
            <button type="button" onClick={() => onStep(-1)} className="press tap-safe">
              ← Previous
            </button>
            <span className="tabular-nums">{position}</span>
            <button type="button" onClick={() => onStep(1)} className="press tap-safe">
              Next →
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

/**
 * "/study/:id/diagrams" — every diagram in the course, in one place.
 *
 * Diagrams were only reachable by opening a section and scrolling past the
 * items in front of them, which for a 150-item course means hunting. They are
 * also the one item type students revise by flicking through rather than
 * answering, so a gallery is the natural way to read them.
 */
export function DiagramsRoute() {
  const { id } = useParams<{ id: string }>();
  const course = useCoursesStore((s) => (id ? s.courses[id] : undefined));
  const wide = useMediaQuery(WIDE);
  // Phone: the plate on the page. Computer: the plate opened large, if any.
  const [at, setAt] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  const { plates, sections } = useMemo(() => {
    if (!course) return { plates: [] as Plate[], sections: [] as { id: string; title: string; count: number; anchor: string }[] };
    const plates: Plate[] = [];
    const sections: { id: string; title: string; count: number; anchor: string }[] = [];
    for (const section of sortedSections(course)) {
      const diagrams = section.items.filter((i): i is GraphicItem => i.type === 'graphic');
      if (!diagrams.length) continue;
      const anchor = `plate-${encodeURIComponent(section.id)}`;
      sections.push({ id: section.id, title: section.title, count: diagrams.length, anchor });
      // Plates are numbered straight through the course, not restarted per
      // section: the number is the plate's name, and two plates called I
      // would be two plates called I.
      diagrams.forEach((item, i) =>
        plates.push({
          item,
          number: plates.length + 1,
          sectionId: section.id,
          sectionTitle: section.title,
          anchor: i === 0 ? anchor : null,
        }),
      );
    }
    return { plates, sections };
  }, [course]);

  const count = plates.length;
  const step = (by: 1 | -1) => setAt((i) => Math.min(count - 1, Math.max(0, i + by)));
  const swipe = useSwipe({ enabled: !wide && count > 1, onLeft: () => step(1), onRight: () => step(-1), at });
  const turnOpen = (by: 1 | -1) => setOpen((i) => (i === null ? i : (i + by + count) % count));
  const here = Math.min(at, Math.max(0, count - 1));

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

  return (
    <div>
      <Link to={`/study/${id}`} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
        ← {course.metadata.title}
      </Link>
      <h1 className="mt-3 font-display text-display font-semibold text-text">Diagrams</h1>

      {plates.length === 0 ? (
        <div className="mt-6 border-y border-border py-8 text-center">
          <span className="inline-flex text-text-3">
            <Icon name="diagram" size={28} />
          </span>
          <p className="mt-3 text-text-2">This lecture has no diagrams.</p>
        </div>
      ) : (
        <>
          <p className="mt-2 text-body text-text-2">
            {plates.length} diagram{plates.length === 1 ? '' : 's'} across {sections.length} section
            {sections.length === 1 ? '' : 's'}.
          </p>

          {sections.length > 1 &&
            (wide ? (
              // Buttons, not anchors: `href="#plate-x"` under a hash router
              // rewrites the route and throws the reader back to the library.
              // See scrollToAnchor.
              <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-1" aria-label="Jump to section">
                {sections.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => scrollToAnchor(x.anchor)}
                    className="tap-safe shrink-0 text-small text-text-2 underline decoration-border underline-offset-4 hover:text-text"
                  >
                    {x.title} ({x.count})
                  </button>
                ))}
              </nav>
            ) : (
              <SectionRow
                courseId={id}
                sections={sections}
                current={plates[here]?.sectionId}
                onPick={(sid) => setAt(plates.findIndex((p) => p.sectionId === sid))}
              />
            ))}

          {wide ? (
            <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-10 xl:grid-cols-3">
              {plates.map((plate, i) => (
                <PlateFigure key={plate.item.id} plate={plate} courseId={id} tile onOpen={() => setOpen(i)} />
              ))}
            </div>
          ) : (
            <div className="mt-6 overflow-x-clip">
              {/* One at a time; a swipe turns it (the buttons stay). */}
              <div {...swipe.handlers} style={swipe.style}>
                <PlateFigure key={plates[here]!.item.id} plate={plates[here]!} courseId={id} />
              </div>
              <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-border pt-3">
                <button type="button" onClick={() => step(-1)} disabled={here === 0} className="press tap-safe disabled:opacity-40">
                  ← Previous
                </button>
                <span className="text-small tabular-nums text-text-2" aria-live="polite">
                  {here + 1} of {count}
                </span>
                <button type="button" onClick={() => step(1)} disabled={here === count - 1} className="press tap-safe disabled:opacity-40">
                  Next →
                </button>
              </div>
            </div>
          )}

          {wide && open !== null && plates[open] && (
            <PlateDetail
              plate={plates[open]!}
              courseId={id}
              position={`${open + 1} of ${count}`}
              onStep={turnOpen}
              onClose={() => setOpen(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
