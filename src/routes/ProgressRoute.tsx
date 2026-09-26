import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { sectionMemory } from '@/lib/sectionMemory';
import { sortedSections } from '@/lib/sortedSections';
import { useCoursesStore } from '@/store/courses';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { computeCourseStats, type StatRow } from '@/lib/computeCourseStats';
import { CourseTree } from '@/components/CourseTree';
import { examRule } from '@/lib/exam';

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
 * is already sorted worst-first.
 *
 * A second pass then made the weak rows accent-blue, which was the same
 * mistake in one hue: twelve filled bars is still the largest painted region
 * on the page, and the rule this app works to is that the accent MARKS a
 * thing and never fills a region. So the bars are ink on a hairline now,
 * measured rules rather than coloured ones, and the ranking does the
 * pointing — the list is sorted worst-first and the figure is right there.
 * What is left of the emphasis is weight: a row below the solid mark is set
 * in full ink, a solid one recedes.
 */
function BarRow({ row }: { row: StatRow }) {
  const acc = row.acc ?? 0;
  const needsWork = acc < SOLID;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className={`text-small ${needsWork ? 'text-text' : 'text-text-2'}`}>{row.label}</span>
        <span className="shrink-0 whitespace-nowrap text-small tabular-nums text-text-2">
          {acc}% <span className="text-text-3">of {row.attempts} answers</span>
        </span>
      </div>
      <div className="relative mb-1 mt-2.5 h-px w-full bg-border">
        <div
          className={`h-px ${needsWork ? 'bg-text' : 'bg-text-3'}`}
          style={{ width: `${acc}%` }}
        />
        {/* Where "solid" starts, so the emphasis explains itself without a
            sentence underneath saying what it means. Drawn as a short tick
            crossing the rule rather than a dot sitting on it, the way a
            scale is marked. */}
        <div
          className="absolute -top-1 h-[7px] w-px bg-text-3"
          style={{ left: `${SOLID}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

/**
 * One figure and what it counts.
 *
 * Four bordered tiles in a row is a dashboard's KPI strip, and it was the
 * last one left in the app. On a page that is otherwise ruled, a figure
 * needs no box around it — the rule above it and the space beside it are
 * enough to say where it starts and stops.
 */
function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div className="border-t border-border-strong pt-2">
      <div className="font-display text-title font-semibold tabular-nums text-text">{num}</div>
      <div className="mark mt-0.5 text-text-3">{label}</div>
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
  // Fading is judged as of opening the page; rendering must not read the clock.
  const [now] = useState(Date.now);

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
        <Link to={`/study/${id}`} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
          ← Back
        </Link>
        <h1 className="mt-4 font-display text-title font-semibold text-text">No progress yet</h1>
        <p className="mt-2 text-text-2">
          Answer some questions, flashcards or terms in &ldquo;{course.metadata.title}&rdquo; and
          they will show up here.
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

  // What the tree draws, as figures: for each section studied, how much of
  // what it learned is still held, lowest first. Accuracy says how well you
  // answered; this says how much of it is still there, which is what decides
  // what to do next.
  const exam = examRule(course, progress, now);
  const fading = sortedSections(course)
    .map((section) => ({ section, m: sectionMemory(section, progress, now, exam) }))
    .filter(({ m }) => m.studied > 0)
    .map(({ section, m }) => ({ section, due: m.due, held: Math.round((m.learned ? m.held / m.learned : 1) * 100) }))
    .sort((a, b) => a.held - b.held || b.due - a.due);

  return (
    <div>
      <Link to={`/study/${id}`} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
        ← Back
      </Link>
      <div className="mt-4 flex items-start gap-5">
        <CourseTree courseId={id} course={course} progress={progress} className="h-28 sm:h-36" />
        <div className="min-w-0 flex-1">
          <p className="mark text-text-3">Progress</p>
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

      {fading.length > 0 && (
        <div className="mt-8">
          <h2 className="mark mb-3 text-text-3">Still remembered</h2>
          <div className="space-y-3">
            {fading.map(({ section, due, held }) => (
              <div key={section.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`text-small ${due > 0 ? 'text-text' : 'text-text-2'}`}>{section.title}</span>
                  <span className="shrink-0 whitespace-nowrap text-small tabular-nums text-text-2">
                    {held}%
                    {due > 0 && (
                      <>
                        {' · '}
                        <Link
                          to={`/session/${id}/review?section=${encodeURIComponent(section.id)}`}
                          className="text-accent hover:underline"
                        >
                          Review {due}
                        </Link>
                      </>
                    )}
                  </span>
                </div>
                <div className="relative mb-1 mt-2.5 h-px w-full bg-border">
                  <div className={`h-px ${due > 0 ? 'bg-text' : 'bg-text-3'}`} style={{ width: `${held}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.weakestSections.length > 0 && (
        <div className="mt-8">
          <h2 className="mark mb-3 text-text-3">
            Least accurate sections
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
          <h2 className="mark mb-3 text-text-3">
            Least accurate tags
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
          className="group mt-8 flex items-baseline justify-between gap-4 border-y-2 border-text-3 py-4"
        >
          <span className="font-display text-heading font-semibold text-text">Practise the weakest</span>
          <span className="shrink-0 text-small text-text-2">{stats.gradableCount} items →</span>
        </Link>
      )}
    </div>
  );
}
