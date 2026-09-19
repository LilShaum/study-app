import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { sortedSections } from '@/lib/sortedSections';
import { Icon } from '@/components/Icon';
import { GraphicCard } from '@/components/items/GraphicCard';
import type { GraphicItem } from '@/schema/course';

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

  const groups = useMemo(() => {
    if (!course) return [];
    return sortedSections(course)
      .map((section) => ({
        id: section.id,
        title: section.title,
        diagrams: section.items.filter((i): i is GraphicItem => i.type === 'graphic'),
      }))
      .filter((g) => g.diagrams.length > 0);
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

  const total = groups.reduce((n, g) => n + g.diagrams.length, 0);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link to={`/study/${id}`} className="text-sm text-text-2 hover:text-text">
        ← {course.metadata.title}
      </Link>
      <h1 className="mt-3 font-display text-display font-semibold text-text">Diagrams</h1>

      {total === 0 ? (
        <div className="mt-6 rounded-lg border border-border bg-surface p-6 text-center">
          <span className="inline-flex text-text-3">
            <Icon name="layers" size={28} />
          </span>
          <p className="mt-2 text-text-2">This course has no diagrams.</p>
          <p className="mt-1 text-sm text-text-3">
            The generator only draws one where a picture genuinely clarifies something — a cycle, a
            structure, a flowchart. If your notes have figures it skipped, &ldquo;More
            practice&rdquo; can ask for them.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-2 text-body text-text-2">
            {total} diagram{total === 1 ? '' : 's'} across {groups.length} section
            {groups.length === 1 ? '' : 's'}.
          </p>

          {groups.length > 1 && (
            <nav className="mt-4 flex flex-wrap gap-2" aria-label="Jump to section">
              {groups.map((g) => (
                <a
                  key={g.id}
                  href={`#diagrams-${encodeURIComponent(g.id)}`}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-2 hover:border-accent-border hover:text-text"
                >
                  {g.title} ({g.diagrams.length})
                </a>
              ))}
            </nav>
          )}

          <div className="mt-6 space-y-8">
            {groups.map((g) => (
              <section key={g.id}>
                <h2
                  id={`diagrams-${encodeURIComponent(g.id)}`}
                  className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-3"
                >
                  <Link
                    to={`/study/${id}/section/${encodeURIComponent(g.id)}`}
                    className="hover:text-text"
                  >
                    {g.title}
                  </Link>
                </h2>
                <div className="space-y-4">
                  {g.diagrams.map((item) => (
                    <GraphicCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
