import { describe, expect, it } from 'vitest';
import { prepareSvg } from './prepareSvg';

const wrap = (inner: string, attrs = 'viewBox="0 0 100 50"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${inner}</svg>`;

describe('prepareSvg', () => {
  describe('theme legibility', () => {
    // The bug this exists for: LLM-authored diagrams use hardcoded dark
    // strokes, which are invisible on the three dark themes.
    it('remaps near-black strokes and fills to currentColor', () => {
      const out = prepareSvg(wrap('<rect stroke="#222" fill="#000"/>'))!;
      expect(out).toContain('stroke="currentColor"');
      expect(out).toContain('fill="currentColor"');
      expect(out).not.toContain('#222');
    });

    it('handles named black and rgb() notation', () => {
      const out = prepareSvg(wrap('<line stroke="black"/><line stroke="rgb(10, 12, 14)"/>'))!;
      expect(out.match(/stroke="currentColor"/g)).toHaveLength(2);
    });

    it('remaps near-white fills to the card surface', () => {
      const out = prepareSvg(wrap('<rect fill="#ffffff"/>'))!;
      expect(out).toContain('fill="var(--color-surface)"');
    });

    it('leaves deliberate mid-tone colors alone', () => {
      // A red "inhibits" arrow carries meaning and must survive.
      const out = prepareSvg(wrap('<path stroke="#e04545"/>'))!;
      expect(out).toContain('#e04545');
      expect(out).not.toContain('currentColor');
    });

    it('leaves fill="none" and existing currentColor untouched', () => {
      const out = prepareSvg(wrap('<rect fill="none" stroke="currentColor"/>'))!;
      expect(out).toContain('fill="none"');
      expect(out).toContain('stroke="currentColor"');
    });

    it('remaps colors inside inline style attributes', () => {
      const out = prepareSvg(wrap('<rect style="stroke:#111;fill:none"/>'))!;
      expect(out).toContain('currentColor');
      expect(out).toContain('fill:none');
    });
  });

  describe('sizing', () => {
    // A viewBox-only SVG has no intrinsic size and collapsed to 0x0 in a
    // flex container, which made diagrams disappear entirely.
    it('gives a viewBox-only svg an explicit width capped at its viewBox', () => {
      const out = prepareSvg(wrap('<rect/>', 'viewBox="0 0 320 140"'))!;
      expect(out).toContain('width:100%');
      expect(out).toContain('max-width:320px');
    });

    it('leaves explicitly sized svgs to scale down only', () => {
      const out = prepareSvg(wrap('<rect/>', 'width="320" height="140" viewBox="0 0 320 140"'))!;
      expect(out).toContain('max-width:100%');
      expect(out).not.toContain('max-width:320px');
    });
  });

  describe('sanitization', () => {
    it('strips event handler attributes', () => {
      const out = prepareSvg(wrap('<image href="x" onerror="alert(1)"/>'))!;
      expect(out).not.toContain('onerror');
    });

    it('removes script elements', () => {
      const out = prepareSvg(wrap('<script>alert(1)</script><rect/>'))!;
      expect(out.toLowerCase()).not.toContain('<script');
    });

    it('strips javascript: hrefs', () => {
      const out = prepareSvg(wrap('<a href="javascript:alert(1)"><rect/></a>'))!;
      expect(out).not.toContain('javascript:');
    });
  });

  describe('invalid input', () => {
    it('returns null for empty, non-svg, and malformed markup', () => {
      expect(prepareSvg(undefined)).toBeNull();
      expect(prepareSvg('   ')).toBeNull();
      expect(prepareSvg('<div>not svg</div>')).toBeNull();
      expect(prepareSvg('<svg><rect'))
        .toBeNull();
    });
  });
});
