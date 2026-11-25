import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { sortedSections } from '@/lib/sortedSections';
import { prepareSvg } from '@/lib/prepareSvg';
import { scrollToAnchor } from '@/lib/scrollToAnchor';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { useMediaQuery, WIDE } from '@/lib/useMediaQuery';
import { useSwipe } from '@/lib/useSwipe';
import { SourceNote } from '@/components/items/SourceNote';
import { FigureElsewhere } from '@/components/items/GraphicCard';
import { RichText } from '@/components/items/RichText';
import { purposeLabel } from '@/lib/figurePurpose';
import type { GraphicItem } from '@/schema/course';


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

      {svg && (
        <div
          role="img"
          aria-label={item.alt_text || item.title}
          onClick={tile ? onOpen : undefined}
          className={
            tile
              ? 'mt-4 flex h-48 cursor-zoom-in items-center justify-center text-text [&_svg]:max-h-full [&_svg]:max-w-full'
              : // On a phone the plate runs the full width of the page, ruled above and below.
                'mt-4 flex items-center justify-center border-y border-border py-5 text-text [&_svg]:max-h-[60dvh] [&_svg]:w-full'
          }
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}

      <figcaption className={svg ? 'mt-4' : 'mt-3'}>
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
        {!tile && item.why && (
          <p className="mt-1 max-w-prose text-small text-text-2">
            <RichText text={item.why} />
          </p>
        )}
        {tile && item.caption && <p className="mt-1 line-clamp-2 text-small text-text-3">{item.caption}</p>}
        {!tile && item.caption && <p className="mt-1 max-w-prose text-small text-text-3">{item.caption}</p>}
        {/* A figure with no drawing of ours is still a plate: it says where
            the real one is, so the gallery indexes what the lecture turns on. */}
        {!svg && (
          <div className="mt-2">
            <FigureElsewhere where={item.where} />
          </div>
        )}
        {/* The passage the diagram was drawn from stays: it is the evidence
            the drawing is grounded in, and it is already quiet enough to sit
            under a caption. The difficulty badge does not — a diagram is read,
            never scored, so a difficulty on it was a field from the data model
            wearing a component. */}
        {!tile && <SourceNote excerpt={item.source_excerpt} />}
      </figcaption>
    </figure>
  );
}

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
          {svg ? (
            <div role="img" aria-label={item.alt_text || item.title} className="w-full [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
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
          {item.why && (
            <p className="mt-3 text-small text-text-2">
              <RichText text={item.why} />
            </p>
          )}
          {item.caption && <p className="mt-2 text-small text-text-3">{item.caption}</p>}
          <SourceNote excerpt={item.source_excerpt} />
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
  const swipe = useSwipe({ enabled: !wide && count > 1, onLeft: () => step(1), onRight: () => step(-1) });
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

          {sections.length > 1 && (
            // Buttons, not anchors: `href="#plate-x"` under a hash router
            // rewrites the route and throws the reader back to the library.
            // See scrollToAnchor.
            <nav
              className="mt-4 flex gap-x-4 gap-y-1 overflow-x-auto wide:flex-wrap"
              aria-label="Jump to section"
            >
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (wide) scrollToAnchor(s.anchor);
                    else setAt(plates.findIndex((p) => p.anchor === s.anchor));
                  }}
                  className="tap-safe shrink-0 text-small text-text-2 underline decoration-border underline-offset-4 hover:text-text"
                >
                  {s.title} ({s.count})
                </button>
              ))}
            </nav>
          )}

          {wide ? (
            <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-10 xl:grid-cols-3">
              {plates.map((plate, i) => (
                <PlateFigure key={plate.item.id} plate={plate} courseId={id} tile onOpen={() => setOpen(i)} />
              ))}
            </div>
          ) : (
            <div className="mt-6">
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
