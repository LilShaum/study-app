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
  /**
   * The paper, colour and grain, baked into one picture: a tile `px` CSS
   * pixels square. Painting the grain's images, each a turbulence filter with
   * a blend mode, inside every one of a thousand leaves froze the first run
   * for over a second whenever the whole tree changed (measured 2026-11-27);
   * one plain picture per leaf paints the same look many times faster.
   */
  tile: { href: string; px: number };
  /** Drawing units per CSS pixel at the size the tree is drawn. */
  unitsPerPx: number;
}

interface Grain {
  /** Each grain layer: its image and its tile size in CSS pixels. */
  layers: { href: string; px: number }[];
  opacity: number;
  blend: string;
  bg: string;
}

function readGrain(): Grain | null {
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
    bg: css.getPropertyValue('--color-bg').trim() || '#fff',
  };
}

/** Baked tiles, by theme and screen density, so a tree drawn again gets its paper at once. */
const baked = new Map<string, { href: string; px: number }>();
const bakeKey = (g: Grain, dpr: number) => `${g.bg}|${g.blend}|${g.opacity}|${dpr}|${g.layers.map((l) => `${l.px}:${l.href.length}:${l.href.slice(-48)}`).join(',')}`;

function load(href: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = href;
  });
}

/**
 * The page's colour with each grain layer over it, at its own opacity and
 * blend, tiled across the coarsest layer's square: the same picture the
 * leaves' pattern used to build out of live images, drawn once at the
 * screen's density.
 */
async function bake(g: Grain, dpr: number): Promise<{ href: string; px: number } | null> {
  const px = Math.max(...g.layers.map((l) => l.px));
  const scale = Math.min(dpr, 2048 / px);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.round(px * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const images = await Promise.all(g.layers.map((l) => load(l.href)));
  ctx.scale(scale, scale);
  ctx.fillStyle = g.bg;
  ctx.fillRect(0, 0, px, px);
  ctx.globalAlpha = g.opacity;
  ctx.globalCompositeOperation = (g.blend === 'normal' ? 'source-over' : g.blend) as GlobalCompositeOperation;
  g.layers.forEach((l, i) => {
    for (let x = 0; x < px; x += l.px) for (let y = 0; y < px; y += l.px) ctx.drawImage(images[i]!, x, y, l.px, l.px);
  });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
  return blob ? { href: URL.createObjectURL(blob), px } : null;
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

  // The grain baked into one tile, once per theme and density.
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const key = grain ? bakeKey(grain, dpr) : null;
  // Read from the cache while rendering; a finished bake only asks for a render.
  const [, setBaked] = useState(0);
  const tile = key ? baked.get(key) ?? null : null;
  useEffect(() => {
    if (!grain || !key || baked.has(key)) return;
    let live = true;
    bake(grain, dpr)
      .then((t) => {
        if (!t) return;
        baked.set(key, t);
        if (live) setBaked((n) => n + 1);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [grain, key, dpr]);

  return tile && unitsPerPx ? { tile, unitsPerPx } : null;
}
