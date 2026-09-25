import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { scoredEntries } from '@/lib/scored';
import { examTime, isDueFor } from '@/lib/memory';
import { useCoursesStore } from '@/store/courses';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { availableModes, findSection, sectionStats } from '@/lib/sectionStats';
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
  // Judged as of opening the page; rendering must not read the clock.
  const [now] = useState(Date.now);

  if (!id || !sectionId) return <Navigate to="/" replace />;

  const section = course ? findSection(course, sectionId) : undefined;
  if (!course || !section) {
    return (
      <div className="py-6 text-center text-text-2">
        Section not found.{' '}
        <Link to={course ? `/study/${id}` : '/'} className="text-accent hover:underline">
          {course ? 'Back to course' : 'Back to Library'}
        </Link>
      </div>
    );
  }

  const stats = sectionStats(section, progress);
  const modes = availableModes(section);

  const scored = scoredEntries(section.items);
  const examAt = examTime(course.metadata.exam_date);
  const due = scored.filter(({ id: itemId }) => isDueFor(progress[itemId], now, examAt)).length;
  const missed = scored.filter(({ id: itemId }) => {
    const r = progress[itemId];
    return r && r.missed > r.got;
  }).length;

  const MODE_LINKS: { mode: string; label: string; count: number; lead?: boolean; unit?: string }[] = [
    // Review leads while it has work and is absent when it has none, as on
    // the course page.
    ...(due > 0
      ? [{ mode: 'review', label: 'Review', count: due, lead: true, unit: `${due} due` }]
      : []),
    { mode: 'learn', label: 'Learn', count: modes.learn, lead: true },
    { mode: 'quiz', label: 'Quiz', count: modes.quiz },
    { mode: 'flashcards', label: 'Flashcards', count: modes.flashcards },
    { mode: 'definitions', label: 'Terms', count: modes.definitions },
    { mode: 'mixed', label: 'Mixed', count: modes.mixed },
    { mode: 'weakest', label: 'Weakest first', count: modes.weakest },
    ...(missed > 0 ? [{ mode: 'missed', label: 'Review missed', count: missed }] : []),
  ];

  return (
    <div>
      <Link to={`/study/${id}`} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
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
        <div className="mt-4 border-l-2 border-border-strong py-2 pl-3 text-sm">
          {stats.accuracy === null ? (
            <span className="text-text-2">
              Nothing studied in this section yet — {plural(stats.gradable, 'item')} can be scored.
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <span className="font-medium text-text">{stats.accuracy}% accuracy</span>
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
        <p className="mt-6 border-y border-border py-5 text-center text-sm text-text-2">
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
          {/* The same ruled list the course page uses. This was a grid of
              tiles — icon, then label, then count, stacked — so on a phone
              each mode was a quarter of a screen tall and six of them ran on
              for two screens, in a different style from the page that led
              here. */}
          <ul className="border-t border-border">
            {MODE_LINKS.map((m) => (
              <li key={m.mode} className="border-b border-border">
                {m.count > 0 ? (
                  <Link
                    to={`/session/${id}/${m.mode}?section=${encodeURIComponent(section.id)}`}
                    className="group tap-safe flex items-baseline gap-3 py-3"
                  >
                    <span
                      className={`font-display text-text group-hover:text-accent ${
                        m.lead ? 'text-heading font-semibold' : 'text-body'
                      }`}
                    >
                      {m.label}
                    </span>
                    <span className="leaders hidden sm:block" aria-hidden="true" />
                    <span className="mark shrink-0 tabular-nums text-text-3">{m.unit ?? plural(m.count, 'item')}</span>
                  </Link>
                ) : (
                  <div aria-disabled="true" className="flex items-baseline gap-3 py-3 text-text-3">
                    <span className="font-display text-body">{m.label}</span>
                    <span className="leaders hidden sm:block" aria-hidden="true" />
                    <span className="mark shrink-0">none here</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
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
