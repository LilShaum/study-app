import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { sortedSections } from '@/lib/sortedSections';
import { prepareSvg } from '@/lib/prepareSvg';
import { scrollToAnchor } from '@/lib/scrollToAnchor';
import { Icon } from '@/components/Icon';
import { SourceNote } from '@/components/items/SourceNote';
import type { GraphicItem } from '@/schema/course';

/** I, II, III… the way a plate has been numbered since before any of this. */
function roman(n: number): string {
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  let left = n;
  for (const [value, numeral] of table) {
    while (left >= value) {
      out += numeral;
      left -= value;
    }
  }
  return out;
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
function PlateFigure({ plate, courseId }: { plate: Plate; courseId: string }) {
  const { item } = plate;
  // Sanitized + theme-adapted; see prepareSvg for why raw markup isn't used.
  const svg = useMemo(() => prepareSvg(item.svg), [item.svg]);

  return (
    <figure
      id={plate.anchor ?? undefined}
      tabIndex={plate.anchor ? -1 : undefined}
      className="scroll-mt-20 border-t border-border pt-5"
    >
      <div className="flex items-baseline justify-between gap-3 text-micro uppercase tracking-wider text-text-3">
        <span>Plate {roman(plate.number)}</span>
        <Link
          to={`/study/${courseId}/section/${encodeURIComponent(plate.sectionId)}`}
          className="truncate hover:text-text"
        >
          {plate.sectionTitle}
        </Link>
      </div>

      <div
        role="img"
        aria-label={item.alt_text || item.title}
        className="mt-5 flex items-center justify-center border border-border p-6 text-text [&_svg]:max-h-80 [&_svg]:max-w-full"
      >
        {svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div className="text-sm text-text-3">No diagram provided</div>
        )}
      </div>

      <figcaption className="mt-5">
        <span className="font-display text-heading font-semibold text-text">{item.title}</span>
        {item.caption && <p className="mt-1 max-w-prose text-small text-text-2">{item.caption}</p>}
        {/* The passage the diagram was drawn from stays: it is the evidence
            the drawing is grounded in, and it is already quiet enough to sit
            under a caption. The difficulty badge does not — a diagram is read,
            never scored, so a difficulty on it was a field from the data model
            wearing a component. */}
        <SourceNote excerpt={item.source_excerpt} />
      </figcaption>
    </figure>
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

  if (!id) return <Navigate to="/" replace />;
  if (!course) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center text-text-2">
        Course not found.{' '}
        <Link to="/" className="text-accent hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link to={`/study/${id}`} className="text-sm text-text-2 hover:text-text">
        ← {course.metadata.title}
      </Link>
      <h1 className="mt-3 font-display text-display font-semibold text-text">Diagrams</h1>

      {plates.length === 0 ? (
        <div className="mt-6 rounded border border-dashed border-border p-8 text-center">
          <span className="inline-flex text-text-3">
            <Icon name="layers" size={28} />
          </span>
          <p className="mt-3 text-text-2">This course has no diagrams.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-text-3">
            The generator only draws one where a picture genuinely clarifies something — a cycle, a
            structure, a flowchart. If your notes have figures it skipped, &ldquo;More
            practice&rdquo; can ask for them.
          </p>
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
            <nav className="mt-4 flex flex-wrap gap-2" aria-label="Jump to section">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollToAnchor(s.anchor)}
                  className="tap-safe rounded border border-border bg-surface px-3 py-1 text-xs text-text-2 hover:border-border-strong hover:text-text"
                >
                  {s.title} ({s.count})
                </button>
              ))}
            </nav>
          )}

          <div className="mt-8 space-y-10">
            {plates.map((plate) => (
              <PlateFigure key={plate.item.id} plate={plate} courseId={id} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
