/**
 * Prepares a course's inline `svg` for rendering: makes it theme-legible and
 * strips anything executable.
 *
 * Why this exists: CLAUDE.md asks the generator to emit inline SVG diagrams,
 * and LLM-authored SVG defaults to hardcoded dark strokes (#000, #222, #333).
 * Three of the four tree themes are dark, so those diagrams render as
 * near-invisible ghosts. CLAUDE.md now asks for `currentColor`, but that only
 * helps files generated from here on — this rescues everything already made.
 *
 * The remap rule: near-black becomes `currentColor` and near-white becomes the
 * card surface. That's correct in BOTH light and dark themes (in light mode
 * currentColor is already near-black), so it needs no theme awareness. Colors
 * in between are left alone — a red arrow was a deliberate choice and should
 * survive.
 *
 * Since we already parse the document here, we also drop scripts and event
 * handlers. Course files are self-generated today, so this isn't urgent, but
 * the format is meant to be shared and the cost is a few lines.
 */

/** Attributes whose value is a paint we may remap. */
const COLOR_ATTRS = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color'] as const;

/** Elements that can execute or embed arbitrary content. */
const FORBIDDEN_TAGS = new Set(['script', 'foreignobject', 'iframe', 'embed', 'object', 'use']);

const DARK_MAX_LUMINANCE = 0.28;
const LIGHT_MIN_LUMINANCE = 0.9;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseColor(raw: string): Rgb | null {
  const value = raw.trim().toLowerCase();
  if (!value || value === 'none' || value === 'transparent' || value === 'currentcolor') return null;
  if (value.startsWith('url(') || value.startsWith('var(')) return null;

  if (value === 'black') return { r: 0, g: 0, b: 0 };
  if (value === 'white') return { r: 255, g: 255, b: 255 };

  if (value.startsWith('#')) {
    let hex = value.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length !== 6) return null;
    const n = Number.parseInt(hex, 16);
    if (Number.isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  const rgb = value.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };

  return null;
}

/** Perceived luminance, 0 (black) to 1 (white). */
function luminance({ r, g, b }: Rgb): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** Returns a replacement paint, or null to leave the value untouched. */
function remapPaint(value: string): string | null {
  const rgb = parseColor(value);
  if (!rgb) return null;
  const l = luminance(rgb);
  if (l <= DARK_MAX_LUMINANCE) return 'currentColor';
  if (l >= LIGHT_MIN_LUMINANCE) return 'var(--color-surface)';
  return null;
}

/** Rewrites color declarations inside an inline style attribute. */
function remapStyleAttr(style: string): string {
  return style
    .split(';')
    .map((decl) => {
      const idx = decl.indexOf(':');
      if (idx === -1) return decl;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const val = decl.slice(idx + 1);
      if (!(COLOR_ATTRS as readonly string[]).includes(prop)) return decl;
      const replacement = remapPaint(val);
      return replacement ? `${decl.slice(0, idx)}:${replacement}` : decl;
    })
    .join(';');
}

function scrub(el: Element): void {
  for (const attr of [...el.attributes]) {
    const name = attr.name.toLowerCase();

    // Event handlers (onload, onerror, ...) and javascript: targets.
    if (name.startsWith('on')) {
      el.removeAttribute(attr.name);
      continue;
    }
    if ((name === 'href' || name === 'xlink:href') && attr.value.trim().toLowerCase().startsWith('javascript:')) {
      el.removeAttribute(attr.name);
      continue;
    }

    if ((COLOR_ATTRS as readonly string[]).includes(name)) {
      const replacement = remapPaint(attr.value);
      if (replacement) el.setAttribute(attr.name, replacement);
      continue;
    }

    if (name === 'style') {
      el.setAttribute(attr.name, remapStyleAttr(attr.value));
    }
  }

  for (const child of [...el.children]) {
    if (FORBIDDEN_TAGS.has(child.nodeName.toLowerCase())) {
      child.remove();
      continue;
    }
    scrub(child);
  }
}

/**
 * Returns sanitized, theme-adapted SVG markup, or null if the input isn't
 * usable SVG (in which case the caller should show its placeholder).
 */
export function prepareSvg(raw: string | undefined): string | null {
  if (!raw || !raw.trim()) return null;

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(raw, 'image/svg+xml');
  } catch {
    return null;
  }

  if (doc.querySelector('parsererror')) return null;

  const svg = doc.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== 'svg') return null;

  scrub(svg);

  // Sizing: let the diagram scale down on narrow screens regardless of the
  // authored size. A viewBox-only SVG (no width/height, which is exactly what
  // the generator is told to emit) has no intrinsic size, so `height:auto`
  // alone collapses it to 0x0 inside a flex container — it needs an explicit
  // width, capped at the viewBox width so small diagrams aren't blown up.
  let sizing = 'max-width:100%;height:auto;';
  if (!(svg.hasAttribute('width') && svg.hasAttribute('height'))) {
    const viewBoxWidth = Number(svg.getAttribute('viewBox')?.split(/[\s,]+/)[2]);
    if (Number.isFinite(viewBoxWidth) && viewBoxWidth > 0) {
      sizing = `width:100%;max-width:${viewBoxWidth}px;height:auto;`;
    }
  }
  svg.setAttribute('style', `${sizing}${svg.getAttribute('style') ?? ''}`);

  return new XMLSerializer().serializeToString(svg);
}
