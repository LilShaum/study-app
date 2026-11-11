import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { monthLabels, type HeatCell } from '@/lib/heatmap';
import { dayLeaf } from '@/lib/dayLeaf';

/** The two looks drawn as a grid of weeks; the calendar look is StudyCalendar. */
export type WeekLook = 'green' | 'leaves';

const SIZE = 11;
const PITCH = 13;
/** The month names above the grid. */
const TOP = 14;
/** The weekday names at its left. */
const LEFT = 24;
/** The most the grid is scaled up when there are few weeks to show. */
const GROW = 1.4;
const WEEKDAYS: [number, string][] = [
  [1, 'Mon'],
  [3, 'Wed'],
  [5, 'Fri'],
];
/** A leaf's green by level: size already tells the time, so the smallest leaves start a step deep enough to be seen. */
const LEAF_HEAT = [0, 2, 3, 3, 4];

const heat = (n: number) => `var(--color-heat-${n})`;

/**
 * The student's days of study as a grid: a column a week, Sunday at the top,
 * today's week last (docs/proposals/heatmap.md). An empty day is a hairline
 * square or a small bud, never a colour for "missed". A tap on a day (or the
 * mouse over it) shows its line, which the page sets under the grid.
 */
export function StudyHeatmap({
  weeks,
  look,
  label,
  picked,
  setPicked,
}: {
  weeks: HeatCell[][];
  look: WeekLook;
  /** What the grid says, for a screen reader: the summary line. */
  label: string;
  picked: string | null;
  setPicked: Dispatch<SetStateAction<string | null>>;
}) {
  const months = useMemo(() => {
    const l = monthLabels(weeks);
    // The first column's name would run into a name one column on.
    if (l[1]) l[0] = null;
    return l;
  }, [weeks]);

  // The last column ends a square short of a full pitch; a pixel more each
  // side keeps today's outline (half outside its square) from being clipped.
  const width = LEFT + weeks.length * PITCH - (PITCH - SIZE) + 2;
  const height = TOP + 7 * PITCH - (PITCH - SIZE) + 2;

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`-1 -1 ${width} ${height}`}
      // Squares grow with the space up to GROW times, so a few weeks of
      // history is not a postage stamp and a year still fits the page.
      style={{ maxWidth: width * GROW }}
      className="block h-auto w-full select-none [-webkit-touch-callout:none]"
      data-look={look}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') setPicked(null);
      }}
    >
      {months.map((name, w) =>
        name ? (
          <text key={`m${w}`} x={LEFT + w * PITCH} y={9} fontSize={9} fill="currentColor" className="text-text-3">
            {name}
          </text>
        ) : null,
      )}
      {WEEKDAYS.map(([d, name]) => (
        <text key={name} x={0} y={TOP + d * PITCH + 8.5} fontSize={8.5} fill="currentColor" className="text-text-3">
          {name}
        </text>
      ))}
      {weeks.map((col, w) =>
        col.map((c, d) => {
          if (c.future) return null;
          const x = LEFT + w * PITCH;
          const y = TOP + d * PITCH;
          return (
            <g key={c.date}>
              {look === 'green' ? (
                <Square cell={c} x={x} y={y} picked={picked === c.date} />
              ) : (
                <Leaf cell={c} x={x} y={y} picked={picked === c.date} />
              )}
              {/* The whole pitch takes the tap, gaps included: a square is
                  11px on a phone, and a bud far less. Not drawn. */}
              <rect
                x={x - 1}
                y={y - 1}
                width={PITCH}
                height={PITCH}
                fill="transparent"
                data-date={c.date}
                data-level={c.level}
                aria-current={picked === c.date ? 'date' : undefined}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') setPicked(c.date);
                }}
                onPointerDown={(e) => {
                  if (e.pointerType === 'mouse') setPicked(c.date);
                  else setPicked((held) => (held === c.date ? null : c.date));
                }}
              />
            </g>
          );
        }),
      )}
    </svg>
  );
}

/** What outlines a day: the day picked in the ink, today in the accent. */
const outline = (cell: HeatCell, picked: boolean) => (picked ? 'var(--color-text)' : cell.today ? 'var(--color-accent)' : null);

/** L2: a square of herbarium green, deeper for more time; an empty day is a hairline. */
function Square({ cell, x, y, picked }: { cell: HeatCell; x: number; y: number; picked: boolean }) {
  const filled = cell.level > 0;
  const ring = outline(cell, picked);
  // An outline is drawn on the edge, half outside; an empty day's hairline
  // is set in by half its width so it is the same size as a filled one.
  const inset = filled || ring ? 0 : 0.5;
  return (
    <rect
      x={x + inset}
      y={y + inset}
      width={SIZE - 2 * inset}
      height={SIZE - 2 * inset}
      rx={1}
      fill={filled ? heat(cell.level) : 'none'}
      stroke={ring ?? (filled ? 'none' : 'var(--color-border)')}
      strokeWidth={ring ? 1.4 : 1}
      pointerEvents="none"
    />
  );
}

/**
 * L3: a drawn leaf, larger and deeper for more time; a day without is a bud.
 * Today's leaf is edged in the accent and the day picked in the ink; a bud
 * is drawn in that colour instead.
 */
function Leaf({ cell, x, y, picked }: { cell: HeatCell; x: number; y: number; picked: boolean }) {
  const leaf = dayLeaf(cell.date, cell.level, SIZE);
  const ring = outline(cell, picked);
  const color = cell.level ? heat(LEAF_HEAT[cell.level]) : (ring ?? 'var(--color-border)');
  return (
    <g transform={`translate(${x} ${y})`} style={{ color }} pointerEvents="none">
      <path d={leaf.stalk} fill="none" stroke="currentColor" strokeWidth={0.7} strokeLinecap="round" />
      <path d={leaf.blade} fill="currentColor" stroke={cell.level && ring ? ring : 'none'} strokeWidth={0.9} strokeLinejoin="round" />
      {leaf.vein && <path d={leaf.vein} fill="none" stroke="var(--color-bg)" strokeWidth={0.45} strokeLinecap="round" />}
    </g>
  );
}
