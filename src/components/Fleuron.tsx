import { SPRIG_LEAVES, SPRIG_STROKE_WIDTH } from '@/lib/sprigMark';

/**
 * The printer's ornament between sections of a page.
 *
 * The classic fleuron is a leaf, so this is one of the sprig's own leaves —
 * the same drawing as the mark and the icon, doing the job a ❦ does on a
 * printed page. Used between major sections, not between every paragraph.
 */
export function Fleuron({ className = '' }: { className?: string }) {
  return (
    <div className={`flex justify-center text-text-3 ${className}`} aria-hidden="true">
      <svg
        // The tip leaf's own bounds, with a margin, so it fills the glyph
        // without a transform.
        viewBox="88 8 52 56"
        fill="none"
        stroke="currentColor"
        strokeWidth={SPRIG_STROKE_WIDTH * 0.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5 [&_.lf]:fill-[var(--color-surface)]"
      >
        <path d={SPRIG_LEAVES[3]} className="lf" />
      </svg>
    </div>
  );
}
