import { SPRIG_LEAVES } from '@/lib/sprigMark';
import { opticalStroke } from '@/lib/opticalStroke';

/**
 * The printer's ornament between sections of a page.
 *
 * The classic fleuron is a leaf, so this is one of the sprig's own leaves —
 * the same drawing as the mark and the icon, doing the job a ❦ does on a
 * printed page. Used between major sections, not between every paragraph,
 * and not at the foot of the page: a book closes with the printer's device,
 * which is the whole mark, not one leaf of it.
 */
export function Fleuron({ className = '', size = 18 }: { className?: string; size?: number }) {
  return (
    <div className={`flex justify-center text-text-3 ${className}`} aria-hidden="true">
      <svg
        // The tip leaf's own bounds, with a margin, so it fills the glyph
        // without a transform. 56 is the span that the stroke scales against.
        viewBox="88 8 52 56"
        style={{ height: size, width: size }}
        fill="none"
        stroke="currentColor"
        strokeWidth={opticalStroke(size, 56)}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="[&_.lf]:fill-[var(--color-bg)]"
      >
        <path d={SPRIG_LEAVES[3]} className="lf" />
      </svg>
    </div>
  );
}
