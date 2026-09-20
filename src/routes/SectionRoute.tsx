import { Link, Navigate, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { availableModes, findSection, sectionStats } from '@/lib/sectionStats';
import { Icon, type IconName } from '@/components/Icon';
import { ItemRenderer } from '@/components/items/ItemRenderer';
import { CourseTree } from '@/components/CourseTree';

const TYPE_LABELS: Record<string, string> = {
  mcq: 'MCQ',
  flashcard: 'flashcard',
  definition: 'definition',
  example: 'example',
  graphic: 'diagram',
};

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * "/study/:id/section/:sectionId" — one section on its own.
 *
 * The course overview listed sections but they were inert: you could see a
 * title and a count and do nothing with either. On a 150-item course that
 * matters, because "study everything or nothing" is exactly wrong when you
 * know which two sections you're weak on.
 *
 * Per-section progress needs no new storage — progress is keyed per item id
 * and a section knows its items, so these figures are a slice of the map that
 * already exists.
 */
export function SectionRoute() {
  const { id, sectionId } = useParams<{ id: string; sectionId: string }>();
  const course = useCoursesStore((s) => (id ? s.courses[id] : undefined));
  // The fallback must be the shared frozen instance: a fresh `{}` here is a
  // new snapshot on every store read, which is the render loop EMPTY_PROGRESS
  // exists to prevent.
  const progress = useProgressStore((s) => (id ? s.getProgress(id) : EMPTY_PROGRESS));

  if (!id || !sectionId) return <Navigate to="/" replace />;

  const section = course ? findSection(course, sectionId) : undefined;
  if (!course || !section) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center text-text-2">
        Section not found.{' '}
        <Link to={course ? `/study/${id}` : '/'} className="text-accent hover:underline">
          {course ? 'Back to course' : 'Back to Library'}
        </Link>
      </div>
    );
  }

  const stats = sectionStats(section, progress);
  const modes = availableModes(section);

  const MODE_LINKS: { mode: string; label: string; icon: IconName; count: number }[] = [
    { mode: 'learn', label: 'Learn', icon: 'target', count: modes.learn },
    { mode: 'quiz', label: 'Quiz', icon: 'help-circle', count: modes.quiz },
    { mode: 'flashcards', label: 'Flashcards', icon: 'layers', count: modes.flashcards },
    { mode: 'definitions', label: 'Definitions', icon: 'file-text', count: modes.definitions },
    { mode: 'mixed', label: 'Mixed', icon: 'shuffle', count: modes.mixed },
    { mode: 'weakest', label: 'Weakest first', icon: 'bar-chart', count: modes.weakest },
  ];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link to={`/study/${id}`} className="text-sm text-text-2 hover:text-text">
        ← {course.metadata.title}
      </Link>
      {/* The course's own tree with this section's limb lit and the rest
          dropped back, so a section is always somewhere in a whole rather
          than a page you arrived at from a list. */}
      <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:gap-8">
        <CourseTree
          courseId={id}
          course={course}
          progress={progress}
          className="h-24 sm:h-36"
          highlight={section.id}
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-title font-semibold text-text sm:text-display">
            {section.title}
          </h1>
          {section.description && (
            <p className="mt-2 max-w-prose text-small text-text-2">{section.description}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-2">
            <span>{plural(stats.total, 'item')}</span>
            {Object.entries(stats.byType).map(([type, n]) => (
              <span key={type} className="text-text-3">
                {plural(n, TYPE_LABELS[type] ?? type)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {stats.gradable > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
          {stats.accuracy === null ? (
            <span className="text-text-2">
              Nothing studied in this section yet — {plural(stats.gradable, 'item')} can be scored.
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <span className="font-medium text-text">{stats.accuracy}% accuracy here</span>
              <span className="text-text-2">
                {stats.studied} of {stats.gradable} studied
              </span>
              <span className="text-success">{stats.got} correct</span>
              <span className="text-error">{stats.missed} missed</span>
            </div>
          )}
        </div>
      )}

      {stats.total === 0 ? (
        // Six greyed-out "none here" tiles told an empty section's story six
        // times over; one line says it once.
        <p className="mt-6 rounded-lg border border-dashed border-border p-5 text-sm text-text-2">
          This section is empty — the generator created it but put no items in it. &ldquo;More
          practice&rdquo; on the course page can fill it, or you can add items yourself in Browse.
        </p>
      ) : (
        <>
          {/* The heading says what these are. The paragraph that used to sit
              under it explained what Learn does, on a page where Learn is one
              of five tiles that all say what they are. */}
          <h2 className="mb-3 mt-8 font-display text-title font-semibold text-text">
            Study just this section
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODE_LINKS.map((m) =>
              m.count > 0 ? (
                <Link
                  key={m.mode}
                  to={`/session/${id}/${m.mode}?section=${encodeURIComponent(section.id)}`}
                  className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong"
                >
                  <span className="mb-2 block text-accent">
                    <Icon name={m.icon} size={20} />
                  </span>
                  <div className="font-medium text-text">{m.label}</div>
                  <div className="text-sm text-text-3">{plural(m.count, 'item')}</div>
                </Link>
              ) : (
                <div
                  key={m.mode}
                  aria-disabled="true"
                  className="rounded-lg border border-dashed border-border p-4 opacity-50"
                >
                  <span className="mb-2 block text-text-3">
                    <Icon name={m.icon} size={20} />
                  </span>
                  <div className="font-medium text-text-2">{m.label}</div>
                  <div className="text-sm text-text-3">none here</div>
                </div>
              ),
            )}
          </div>
        </>
      )}

      {stats.total > 0 && (
        <>
          <h2 className="mb-4 mt-10 font-display text-title font-semibold text-text">Everything in this section</h2>
          <div className="space-y-4">
            {section.items.map((item) => (
              <ItemRenderer key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
