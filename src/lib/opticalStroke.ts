/**
 * The stroke weight a mark should carry at the size it is drawn.
 *
 * An SVG stroke is measured in viewBox units, so it scales linearly with the
 * render box: the sprig at a fixed strokeWidth of 9 lands at 0.94px in the
 * running head and 2.25px in an empty state, and the fleuron — one leaf
 * blown up out of a 56-unit slice — lands at 2.25px against an icon set that
 * sits between 0.83 and 1.17px. That is where "the mark looks chunkier than
 * the icons" comes from: not the drawing, the arithmetic.
 *
 * Holding the stroke at a constant number of screen pixels instead
 * (vector-effect: non-scaling-stroke) overcorrects — a large drawing does
 * want more weight than a small one, just nowhere near proportionally. So
 * this grows it sub-linearly, which is the same idea as the display face's
 * optical size axis: the big cut is heavier than the small cut scaled up,
 * but not by the ratio of their sizes.
 *
 * The exponent is 0.35, anchored at 1.15px for a 20px mark. That puts the
 * running head at ~1.15, a 48px empty-state sprig at ~1.55 and a 16px
 * fleuron at ~1.07 — all inside the band the icon set occupies, with the
 * larger drawings still a touch heavier.
 *
 * The home-screen icon is drawn by scripts/make-icons.mjs and is NOT this:
 * it renders at 48px on a launcher with no type beside it to be weighed
 * against, and a hairline there disappears.
 */
export function opticalStroke(renderedPx: number, viewBoxSpan: number): number {
  const px = 1.15 * Math.pow(renderedPx / 20, 0.35);
  // Convert the wanted screen weight back into viewBox units.
  return (px * viewBoxSpan) / renderedPx;
}
