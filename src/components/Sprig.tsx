import { SPRIG_LEAVES, SPRIG_STEM, SPRIG_VIEWBOX } from '@/lib/sprigMark';
import { opticalStroke } from '@/lib/opticalStroke';

interface SprigProps {
  /**
   * The drawn height in px. A number rather than a height class because the
   * stroke weight is computed from it — see opticalStroke.
   */
  size?: number;
  className?: string;
}

/**
 * The app mark, in ink.
 *
 * The same drawing as the icon on the home screen, so the two read as one
 * thing. Leaves are filled with the page colour rather than left open: an
 * unfilled leaf lets the stem run straight through it, which is the
 * difference between a drawing and a tangle of loops.
 */
export function Sprig({ size = 20, className = '' }: SprigProps) {
  return (
    <svg
      viewBox={SPRIG_VIEWBOX}
      // 192 is the viewBox span; the sprig's box is square.
      style={{ height: size, width: size }}
      fill="none"
      stroke="currentColor"
      strokeWidth={opticalStroke(size, 192)}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 [&_.lf]:fill-[var(--color-bg)] ${className}`}
    >
      <path d={SPRIG_STEM} />
      {SPRIG_LEAVES.map((d, i) => (
        <path key={i} d={d} className="lf" />
      ))}
    </svg>
  );
}
