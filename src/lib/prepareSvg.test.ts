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

    // The two ways round the old hand-written denylist (docs/HANDOFF.md §6).
    it('strips a javascript: link hidden behind control characters', () => {
      const out = prepareSvg(wrap('<a href="&#x09;java&#x0A;script:alert(1)"><rect/></a>'))!;
      // What a browser would follow: the attribute as parsed, with the
      // tabs and newlines it ignores taken out.
      const doc = new DOMParser().parseFromString(out, 'image/svg+xml');
      const links = [...doc.querySelectorAll('*')].flatMap((el) => [el.getAttribute('href'), el.getAttribute('xlink:href')]);
      // eslint-disable-next-line no-control-regex -- the control characters are the attack
      expect(links.filter((h) => h && /^javascript:/i.test(h.replace(/[\s\x00-\x1f]/g, '')))).toEqual([]);
    });

    it('removes animate and set, which can swap a link in after cleaning', () => {
      const out = prepareSvg(
        wrap('<a href="#"><set attributeName="href" to="javascript:alert(1)"/><animate attributeName="href" values="javascript:alert(1)"/><rect/></a>'),
      )!;
      expect(out).not.toMatch(/<set|<animate|javascript:/i);
    });

    it('removes embedded HTML and external references', () => {
      const out = prepareSvg(
        wrap('<foreignObject><iframe src="https://evil.example"></iframe></foreignObject><use href="https://evil.example/x.svg#a"/><rect/>'),
      )!;
      expect(out).not.toMatch(/foreignobject|iframe|<use|evil/i);
      expect(out).toContain('<rect');
    });

    it('keeps an ordinary diagram whole', () => {
      const out = prepareSvg(
        wrap('<defs><marker id="m"><path d="M0 0L4 2L0 4z"/></marker></defs><text x="1" y="9" font-size="6">ATP</text><line x1="0" y1="0" x2="9" y2="9" stroke="#e04545" marker-end="url(#m)"/>'),
      )!;
      expect(out).toContain('<marker');
      expect(out).toContain('ATP');
      expect(out).toContain('marker-end="url(#m)"');
    });

    // SVG's camel-case names are easy to lose in a sanitizer: an XML-mode
    // pass dropped every one and diagrams rendered clipped.
    it('keeps camel-case attributes and elements', () => {
      const out = prepareSvg(
        wrap('<defs><linearGradient id="g" gradientUnits="userSpaceOnUse"/><marker id="m" markerWidth="4" refX="2"/></defs><rect/>'),
      )!;
      for (const name of ['viewBox="0 0 100 50"', 'linearGradient', 'gradientUnits', 'markerWidth', 'refX']) expect(out).toContain(name);
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
