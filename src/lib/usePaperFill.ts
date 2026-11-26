import { useEffect, useState, type RefObject } from 'react';

/**
 * The page's paper, as an SVG paint: what a leaf is filled with, so every
 * leaf is cut from the same page it sits on (the owner, 2026-11-26: "all the
 * leaves are just filled in with the same colour and texture of the
 * background plus the vein").
 *
 * The grain is the theme's own (`--paper-grain` and its size, opacity and
 * blend, styles/theme.css), read from the document so it changes with the
 * theme, and laid out at the page's scale: a tile of 220 CSS pixels on the
 * page is 220 pixels' worth of the drawing's own units, however large the
 * tree is drawn. Null until it can be measured (and under test, where
 * nothing is drawn): the leaves then fall back to the flat paper colour.
 */
export interface PaperFill {
  /** Each grain layer: its image and its tile size in CSS pixels. */
  layers: { href: string; px: number }[];
  opacity: number;
  blend: string;
  /** Drawing units per CSS pixel at the size the tree is drawn. */
  unitsPerPx: number;
}

function readGrain(): Omit<PaperFill, 'unitsPerPx'> | null {
  if (typeof getComputedStyle !== 'function') return null;
  const css = getComputedStyle(document.documentElement);
  const images = [...css.getPropertyValue('--paper-grain').matchAll(/url\((["']?)(.*?)\1\)/g)].map((m) => m[2]!);
  const sizes = css
    .getPropertyValue('--paper-grain-size')
    .split(',')
    .map((s) => parseFloat(s));
  if (!images.length) return null;
  return {
    layers: images.map((href, i) => ({ href, px: sizes[i] || sizes[0] || 220 })),
    opacity: parseFloat(css.getPropertyValue('--paper-grain-opacity')) || 0.2,
    blend: css.getPropertyValue('--paper-grain-blend').trim() || 'normal',
  };
}

export function usePaperFill(svgRef: RefObject<SVGSVGElement | null>): PaperFill | null {
  const [grain, setGrain] = useState(() => readGrain());
  const [unitsPerPx, setUnitsPerPx] = useState<number | null>(null);

  // The theme: an attribute on the document, or the device's own setting.
  useEffect(() => {
    const again = () => setGrain(readGrain());
    const watch = typeof MutationObserver === 'function' ? new MutationObserver(again) : null;
    watch?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener?.('change', again);
    return () => {
      watch?.disconnect();
      media?.removeEventListener?.('change', again);
    };
  }, []);

  // The scale the tree is drawn at, kept as it is resized.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof svg.getScreenCTM !== 'function') return;
    const measure = () => {
      const ctm = svg.getScreenCTM();
      const perUnit = ctm ? Math.hypot(ctm.a, ctm.b) : 0;
      if (perUnit > 0) setUnitsPerPx((was) => (was && Math.abs(was - 1 / perUnit) < 1e-3 ? was : 1 / perUnit));
    };
    measure();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    ro?.observe(svg);
    return () => ro?.disconnect();
  }, [svgRef]);

  return grain && unitsPerPx ? { ...grain, unitsPerPx } : null;
}
