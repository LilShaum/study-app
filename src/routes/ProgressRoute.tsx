import { Link, Navigate, useParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { computeCourseStats, type StatRow } from '@/lib/computeCourseStats';

function barColor(acc: number | null): string {
  if (acc == null) return 'bg-border';
  if (acc >= 80) return 'bg-success';
  if (acc >= 50) return 'bg-warning';
  return 'bg-error';
}

function BarRow({ row }: { row: StatRow }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 shrink-0 truncate text-sm text-text-2 sm:w-32" title={row.label}>
        {row.label}
      </div>
      <div className="h-2 min-w-0 flex-1 rounded-full bg-border">
        <div className={`h-2 rounded-full ${barColor(row.acc)}`} style={{ width: `${row.acc ?? 0}%` }} />
      </div>
      <div className="w-16 shrink-0 text-right text-sm text-text-2 sm:w-24">
        {row.acc ?? 0}% <span className="hidden text-text-3 sm:inline">({row.attempts})</span>
      </div>
    </div>
  );
}

function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 text-center">
      <div className="text-xl font-semibold text-text">{num}</div>
      <div className="text-xs text-text-2">{label}</div>
    </div>
  );
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
      <div className="mx-auto max-w-2xl p-6 text-center text-text-2">
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
      <div className="mx-auto max-w-2xl p-10 text-center">
        <Link to={`/study/${id}`} className="text-sm text-text-2 hover:text-text">
          ← Back
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-text">No progress yet</h1>
        <p className="mt-2 text-text-2">
          Study some Quiz or Flashcard items in &ldquo;{course.metadata.title}&rdquo; to see stats here.
        </p>
        <Link
          to={`/study/${id}`}
          className="mt-4 inline-block rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Back to Course
        </Link>
      </div>
    );
  }

  const lastSeenText = stats.lastSeen
    ? new Date(stats.lastSeen).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link to={`/study/${id}`} className="text-sm text-text-2 hover:text-text">
        ← Back
      </Link>
      <h1 className="mt-3 font-display text-display font-semibold text-text">{course.metadata.title}</h1>
      <p className="mt-1 text-body text-text-3">Progress</p>

      {/* 2-up on phones — four tiles at 375px wrapped labels and looked broken. */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat num={`${stats.accuracyPct ?? 0}%`} label="Accuracy" />
        <Stat num={String(stats.studiedCount)} label={`of ${stats.gradableCount} studied`} />
        <Stat num={String(stats.totalGot)} label="Correct" />
        <Stat num={String(stats.totalMissed)} label="Missed" />
      </div>
      <div className="mt-2 text-center text-xs text-text-3">Last studied: {lastSeenText}</div>

      {stats.weakestSections.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-3">Weakest Sections</h2>
          <div className="space-y-2">
            {stats.weakestSections.map((row) => (
              <BarRow key={row.label} row={row} />
            ))}
          </div>
        </div>
      )}

      {stats.weakestTags.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-3">Weakest Tags</h2>
          <div className="space-y-2">
            {stats.weakestTags.map((row) => (
              <BarRow key={row.label} row={row} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
