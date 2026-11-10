/**
 * One SVG path for a QR code: every dark module, offset by the quiet zone.
 *
 * Horizontal runs of dark modules become one rectangle each, so a code of a
 * few hundred modules is a few hundred short segments in a single <path>
 * rather than one element per module.
 */
export function qrPath(
  isDark: (row: number, col: number) => boolean,
  size: number,
  quiet = 4,
): { d: string; viewBox: number } {
  const parts: string[] = [];
  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      if (!isDark(r, c)) {
        c++;
        continue;
      }
      const start = c;
      while (c < size && isDark(r, c)) c++;
      const len = c - start;
      parts.push(`M${start + quiet} ${r + quiet}h${len}v1h-${len}z`);
    }
  }
  return { d: parts.join(''), viewBox: size + 2 * quiet };
}
