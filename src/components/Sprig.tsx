import { SPRIG_LEAVES, SPRIG_STEM, SPRIG_STROKE_WIDTH, SPRIG_VIEWBOX } from '@/lib/sprigMark';

interface SprigProps {
  /** Sizing classes; the svg has a viewBox and no width or height. */
  className?: string;
}

/**
 * The app mark, in ink.
 *
 * The same drawing as the icon on the home screen, so the two read as one
 * thing. Leaves are filled with the surface colour rather than left open:
 * an unfilled leaf lets the stem run straight through it, which is the
 * difference between a drawing and a tangle of loops.
 */
export function Sprig({ className = 'h-5' }: SprigProps) {
  return (
    <svg
      viewBox={SPRIG_VIEWBOX}
      fill="none"
      stroke="currentColor"
      strokeWidth={SPRIG_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`w-auto shrink-0 [&_.lf]:fill-[var(--color-surface)] ${className}`}
    >
      <path d={SPRIG_STEM} />
      {SPRIG_LEAVES.map((d, i) => (
        <path key={i} d={d} className="lf" />
      ))}
    </svg>
  );
}
