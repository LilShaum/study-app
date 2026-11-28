import { SPRIG_LEAF_STROKE_WIDTH, SPRIG_LEAVES, SPRIG_STEM, SPRIG_VIEWBOX } from '@/lib/sprigMark';
import { opticalStroke } from '@/lib/opticalStroke';

interface SprigProps {
  /**
   * The drawn height in px. A number rather than a height class because the
   * stem's stroke weight is computed from it, see opticalStroke.
   */
  size?: number;
  className?: string;
}

/**
 * The app mark, in ink.
 *
 * The same drawing as the icon on the home screen and the tab, so the three
 * read as one thing: a stem and six solid leaves. The icon's pale midribs are
 * left out here; at about 20px they would be mud.
 */
export function Sprig({ size = 20, className = '' }: SprigProps) {
  return (
    <svg
      viewBox={SPRIG_VIEWBOX}
      // 512 is the viewBox span; the sprig's box is square.
      style={{ height: size, width: size }}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d={SPRIG_STEM} strokeWidth={opticalStroke(size, 512)} />
      {SPRIG_LEAVES.map((d, i) => (
        <path key={i} d={d} fill="currentColor" strokeWidth={SPRIG_LEAF_STROKE_WIDTH} />
      ))}
    </svg>
  );
}
