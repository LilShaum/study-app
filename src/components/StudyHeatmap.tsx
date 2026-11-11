import { useMemo, useState } from 'react';
import { useStudyLogStore } from '@/store/studyLog';
import { dayLine, heatmapWeeks, monthLabels, studyStats, summaryLine, sumDays, timeStudied, type HeatCell } from '@/lib/heatmap';

const SIZE = 11;
const PITCH = 13;
const LABEL_H = 14;
/** The widest a week's column may be drawn, in CSS pixels. */
const GROWN_PITCH = 22;
/** Ink mixed toward the paper, one share of ink per level. */
const INK = [0, 22, 45, 68, 90];

const fillOf = (level: number) => (level ? `color-mix(in oklab, var(--color-text) ${INK[level]}%, var(--color-bg))` : 'none');

/**
 * The student's own days of study: a calendar of small squares, darker for
 * more minutes (docs/proposals/heatmap.md). Nothing until there is a day of
 * study, no streak, and an empty day is plain paper.
 */
export function StudyHeatmap() {
  const byCourse = useStudyLogStore((s) => s.byCourse);
  const [picked, setPicked] = useState<string | null>(null);

  const totals = useMemo(() => sumDays(byCourse), [byCourse]);
  const weeks = useMemo(() => heatmapWeeks(totals, new Date()), [totals]);
  const stats = useMemo(() => studyStats(totals, new Date()), [totals]);
  const summary = useMemo(() => summaryLine(weeks), [weeks]);
  const labels = useMemo(() => {
    const l = monthLabels(weeks);
    // The first column's name would run into a name one column on.
    if (l[1]) l[0] = null;
    return l;
  }, [weeks]);

  if (!summary) return null;

  // The last column ends a square short of a full pitch; one pixel more each
  // side keeps today's outline (half outside its square) from being clipped.
  const width = weeks.length * PITCH - (PITCH - SIZE) + 2;
  const height = LABEL_H + 7 * PITCH - (PITCH - SIZE) + 1;
  const pickedCell: HeatCell | undefined = picked ? weeks.flat().find((c) => c.date === picked) : undefined;

  return (
    <section className="mt-10" aria-label="Days of study">
      <h2 className="mark text-text-3">Days of study</h2>
      <svg
        role="img"
        aria-label={summary}
        viewBox={`-1 0 ${width} ${height}`}
        // Squares grow to fill the column, up to about 19px, so a few weeks
        // of history is not a postage stamp and half a year still fits a phone.
        style={{ maxWidth: weeks.length * GROWN_PITCH }}
        className="mt-3 block h-auto w-full select-none [-webkit-touch-callout:none]"
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') setPicked(null);
        }}
      >
        {labels.map((name, w) =>
          name ? (
            <text key={`m${w}`} x={w * PITCH} y={9} fontSize={9} fill="currentColor" className="text-text-3">
              {name}
            </text>
          ) : null,
        )}
        {weeks.map((col, w) =>
          col.map((c, d) =>
            c.future ? null : (
              <rect
                key={c.date}
                x={w * PITCH}
                y={LABEL_H + d * PITCH}
                width={SIZE}
                height={SIZE}
                data-date={c.date}
                data-level={c.level}
                fill={fillOf(c.level)}
                stroke={c.today ? 'var(--color-accent)' : c.level === 0 ? 'var(--color-border)' : 'none'}
                strokeWidth={1}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') setPicked(c.date);
                }}
                onPointerDown={(e) => {
                  if (e.pointerType === 'mouse') setPicked(c.date);
                  else setPicked((held) => (held === c.date ? null : c.date));
                }}
              />
            ),
          ),
        )}
      </svg>
      <p className="mt-3 text-small text-text-2" aria-live="polite">
        {pickedCell ? dayLine(pickedCell) : summary}
      </p>
      {/* Figures to look at, never a nudge: no "keep your streak" anywhere. */}
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border pt-3 sm:grid-cols-4">
        {(
          [
            ['Time studied', timeStudied(stats.seconds)],
            ['Days studied', `${stats.days}`],
            ['Longest streak', `${stats.longest} day${stats.longest === 1 ? '' : 's'}`],
            ['Current streak', `${stats.current} day${stats.current === 1 ? '' : 's'}`],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="mark text-text-3">{label}</dt>
            <dd className="mt-0.5 text-body tabular-nums text-text">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
