import { Link, Navigate, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { computeCourseStats, type StatRow } from '@/lib/computeCourseStats';
import { CourseTree } from '@/components/CourseTree';

/** Below this, a section is not solid yet. The one number the page is about. */
const SOLID = 80;

/**
 * One ranked row: the name on its own line, then the bar.
 *
 * The name used to share a line with the bar out of a 128px column, which
 * turned every section in a real course into "Linearising the …" — and the
 * only question this page exists to answer is WHICH section is weak.
 *
 * Bars are ink, not a traffic light. Accuracy here is a magnitude being
 * ranked, not a status being reported, and painting six rows in saturated
 * green and ochre made the largest coloured area in the app out of data that
 * is already sorted worst-first. Instead the rows that are not solid yet
 * carry the accent and the rest recede: one hue, used to point.
 */
function BarRow({ row }: { row: StatRow }) {
  const acc = row.acc ?? 0;
  const needsWork = acc < SOLID;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-small ${needsWork ? 'text-text' : 'text-text-2'}`}>{row.label}</span>
        <span className="shrink-0 whitespace-nowrap text-small tabular-nums text-text-2">
          {acc}% <span className="text-text-3">of {row.attempts}</span>
        </span>
      </div>
      <div className="relative mt-1 h-1.5 rounded-sm bg-surface-sunken">
        <div
          className={`h-1.5 rounded-sm ${needsWork ? 'bg-accent' : 'bg-border-strong'}`}
          style={{ width: `${acc}%` }}
        />
        {/* Where "solid" starts, so the emphasis explains itself without a
            sentence underneath saying what the colours mean. */}
        <div
          className="absolute top-0 h-1.5 w-px bg-text-3 opacity-60"
          style={{ left: `${SOLID}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div className="rounded border border-border bg-surface px-3 py-2.5 text-center">
      <div className="font-display text-title font-semibold tabular-nums text-text">{num}</div>
      <div className="text-micro text-text-2">{label}</div>
    </div>
  );
}

/** "3 hours ago" beats a timestamp for the only question being asked of it. */
function ago(ts: number): string {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** "/study/:id/progress" — accuracy + weakest sections/tags, ported from the vanilla dashboard. */
export function ProgressRoute() {
  const { id } = useParams<{ id: string }>();
  const course = useCoursesStore((s) => (id ? s.courses[id] : undefined));
  // Both branches must return stable references — see EMPTY_PROGRESS.
  const progress = useProgressStore((s) => (id ? s.getProgress(id) : EMPTY_PROGRESS));

  if (!id) return <Navigate to="/" replace />;
  if (!course) {
    return (
      <div className="py-6 text-center text-text-2">
        Course not found.{' '}
        <Link to="/" className="text-accent hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  const stats = computeCourseStats(course, progress);

  if (stats.studiedCount === 0) {
    return (
      <div className="py-10 text-center">
        <Link to={`/study/${id}`} className="text-sm text-text-2 hover:text-text">
          ← Back
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-text">No progress yet</h1>
        <p className="mt-2 text-text-2">
          Study some Quiz or Flashcard items in &ldquo;{course.metadata.title}&rdquo; to see stats here.
        </p>
        <Link
          to={`/study/${id}`}
          className="press press-ink mt-4"
        >
          Back to Course
        </Link>
      </div>
    );
  }

  const lastSeenText = stats.lastSeen ? ago(stats.lastSeen) : '—';

  return (
    <div>
      <Link to={`/study/${id}`} className="text-sm text-text-2 hover:text-text">
        ← Back
      </Link>
      <div className="mt-4 flex items-start gap-5">
        <CourseTree courseId={id} course={course} progress={progress} className="h-28 sm:h-36" />
        <div className="min-w-0 flex-1">
          <p className="text-micro uppercase tracking-wider text-text-3">Progress</p>
          <h1 className="mt-1 font-display text-title font-semibold text-text sm:text-display">
            {course.metadata.title}
          </h1>
          <p className="mt-2 text-small text-text-2">Last studied {lastSeenText}.</p>
        </div>
      </div>

      {/* 2-up on phones — four tiles at 375px wrapped labels and looked broken. */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat num={`${stats.accuracyPct ?? 0}%`} label="Accuracy" />
        <Stat num={String(stats.studiedCount)} label={`of ${stats.gradableCount} studied`} />
        <Stat num={String(stats.totalGot)} label="Correct" />
        <Stat num={String(stats.totalMissed)} label="Missed" />
      </div>

      {stats.weakestSections.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-micro font-semibold uppercase tracking-wider text-text-3">
            Weakest sections
          </h2>
          <div className="space-y-3">
            {stats.weakestSections.map((row) => (
              <BarRow key={row.label} row={row} />
            ))}
          </div>
        </div>
      )}

      {stats.weakestTags.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-micro font-semibold uppercase tracking-wider text-text-3">
            Weakest tags
          </h2>
          <div className="space-y-3">
            {stats.weakestTags.map((row) => (
              <BarRow key={row.label} row={row} />
            ))}
          </div>
        </div>
      )}

      {stats.weakestSections.length > 0 && (
        <Link
          to={`/session/${id}/weakest`}
          className="mt-8 flex items-center justify-between gap-4 rounded border border-border-strong bg-surface-raised px-5 py-4 shadow transition-colors hover:bg-surface"
        >
          <span className="font-display text-heading font-semibold text-text">Practise the weakest</span>
          <span className="shrink-0 text-small text-text-2">{stats.gradableCount} items →</span>
        </Link>
      )}
    </div>
  );
}
