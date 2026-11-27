import { describe, it, expect } from 'vitest';
import { DiagramField, normalizeDiagram, type FlowDiagram, type CompareDiagram } from '@/schema/diagram';
import { GraphicItemSchema } from '@/schema/course';

const flow = (raw: unknown) => normalizeDiagram(raw) as FlowDiagram;
const parts = (...ids: string[]) => ids.map((id) => ({ id, label: id.toUpperCase() }));

describe('normalizeDiagram', () => {
  it('rejects non-objects and unknown kinds', () => {
    expect(normalizeDiagram(undefined)).toBeUndefined();
    expect(normalizeDiagram(null)).toBeUndefined();
    expect(normalizeDiagram('flow')).toBeUndefined();
    expect(normalizeDiagram(42)).toBeUndefined();
    expect(normalizeDiagram([])).toBeUndefined();
    expect(normalizeDiagram({ kind: 'nope', parts: parts('a', 'b') })).toBeUndefined();
    expect(normalizeDiagram({ parts: parts('a', 'b') })).toBeUndefined();
  });

  it('needs at least two valid parts for a flow', () => {
    expect(normalizeDiagram({ kind: 'flow' })).toBeUndefined();
    expect(normalizeDiagram({ kind: 'flow', parts: parts('a') })).toBeUndefined();
    expect(normalizeDiagram({ kind: 'flow', parts: [{ id: 'a', label: 'A' }, { id: 'b' }] })).toBeUndefined();
    expect(normalizeDiagram({ kind: 'flow', parts: parts('a', 'b') })).toBeDefined();
  });

  it('keeps the first of duplicate part ids', () => {
    const d = flow({ kind: 'flow', parts: [{ id: 'a', label: 'First' }, { id: 'a', label: 'Second' }, { id: 'b', label: 'B' }] });
    expect(d.parts.map((p) => p.label)).toEqual(['First', 'B']);
  });

  it('keeps a part note and omits an empty one', () => {
    const d = flow({ kind: 'flow', parts: [{ id: 'a', label: 'A', note: 'about a' }, { id: 'b', label: 'B', note: '  ' }] });
    expect(d.parts[0].note).toBe('about a');
    expect('note' in d.parts[1]).toBe(false);
  });

  it('drops links with unknown ends and self-links', () => {
    const d = flow({
      kind: 'flow',
      parts: parts('a', 'b'),
      links: [{ from: 'a', to: 'zzz' }, { from: 'zzz', to: 'b' }, { from: 'a', to: 'a' }, { from: 'a', to: 'b' }],
    });
    expect(d.links.map((l) => l.id)).toEqual(['a>b']);
  });

  it('defaults link id to from>to and kind to leads', () => {
    const d = flow({ kind: 'flow', parts: parts('a', 'b'), links: [{ from: 'a', to: 'b' }] });
    expect(d.links).toEqual([{ id: 'a>b', from: 'a', to: 'b', kind: 'leads' }]);
  });

  it('keeps a written link id, label and blocks kind; bad kind falls back to leads', () => {
    const d = flow({
      kind: 'flow',
      parts: parts('a', 'b', 'c'),
      links: [
        { id: 'x', from: 'a', to: 'b', label: 'inhibits', kind: 'blocks' },
        { from: 'b', to: 'c', kind: 'weird' },
      ],
    });
    expect(d.links[0]).toEqual({ id: 'x', from: 'a', to: 'b', label: 'inhibits', kind: 'blocks' });
    expect(d.links[1].kind).toBe('leads');
  });

  it('drops a second link with the same id', () => {
    const d = flow({ kind: 'flow', parts: parts('a', 'b'), links: [{ from: 'a', to: 'b' }, { from: 'a', to: 'b', label: 'dup' }] });
    expect(d.links).toHaveLength(1);
    expect(d.links[0].label).toBeUndefined();
  });

  it('generates cycle links from part order and wraps the last to the first', () => {
    const d = flow({ kind: 'cycle', parts: parts('a', 'b', 'c') });
    expect(d.kind).toBe('cycle');
    expect(d.links.map((l) => [l.from, l.to, l.id, l.kind])).toEqual([
      ['a', 'b', 'a>b', 'leads'],
      ['b', 'c', 'b>c', 'leads'],
      ['c', 'a', 'c>a', 'leads'],
    ]);
  });

  it('lets a written link lend its label, kind and id to a cycle link; ignores links off the cycle order', () => {
    const d = flow({
      kind: 'cycle',
      parts: parts('a', 'b', 'c'),
      links: [
        { id: 'step1', from: 'a', to: 'b', label: 'then', kind: 'blocks' },
        { from: 'a', to: 'c', label: 'shortcut' },
      ],
    });
    expect(d.links).toHaveLength(3);
    expect(d.links[0]).toMatchObject({ id: 'step1', label: 'then', kind: 'blocks' });
    expect(d.links.some((l) => l.label === 'shortcut')).toBe(false);
  });

  it('drops what-ifs with no known breaks and filters unknown ids from breaks and affects', () => {
    const d = flow({
      kind: 'flow',
      parts: parts('a', 'b', 'c'),
      links: [{ from: 'a', to: 'b' }],
      what_ifs: [
        { ask: 'nothing known', breaks: ['zzz'], then: 't' },
        { ask: 'no breaks', then: 't' },
        { ask: 'mixed', breaks: ['a', 'zzz'], affects: ['b', 'zzz'], then: 'ok', name: 'Case' },
      ],
    });
    expect(d.what_ifs).toEqual([{ ask: 'mixed', name: 'Case', breaks: ['a'], affects: ['b'], then: 'ok' }]);
  });

  it('allows a break to name a link id', () => {
    const d = flow({
      kind: 'flow',
      parts: parts('a', 'b'),
      links: [{ from: 'a', to: 'b' }],
      what_ifs: [{ ask: 'cut it', breaks: ['a>b'], then: 'gone' }],
    });
    expect(d.what_ifs[0].breaks).toEqual(['a>b']);
    expect(d.what_ifs[0].affects).toBeUndefined();
  });

  it('skips a malformed part inside an otherwise valid list', () => {
    const d = flow({ kind: 'flow', parts: [{ id: 'a', label: 'A' }, { nope: true }, 7, null, { id: 'b', label: 'B' }] });
    expect(d.parts.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('accepts numbers as ids and labels', () => {
    const d = flow({ kind: 'flow', parts: [{ id: 1, label: 10 }, { id: 2, label: 20 }], links: [{ from: 1, to: 2 }] });
    expect(d.parts).toEqual([{ id: '1', label: '10' }, { id: '2', label: '20' }]);
    expect(d.links[0].id).toBe('1>2');
  });

  it('truncates long labels, notes and what-if text to their maximum', () => {
    const d = flow({
      kind: 'flow',
      parts: [{ id: 'a', label: 'x'.repeat(200), note: 'n'.repeat(500) }, { id: 'b', label: 'B' }],
      links: [{ from: 'a', to: 'b', label: 'l'.repeat(100) }],
      what_ifs: [{ ask: 'q'.repeat(300), breaks: ['a'], then: 't'.repeat(900) }],
    });
    expect(d.parts[0].label).toHaveLength(80);
    expect(d.parts[0].note).toHaveLength(300);
    expect(d.links[0].label).toHaveLength(60);
    expect(d.what_ifs[0].ask).toHaveLength(120);
    expect(d.what_ifs[0].then).toHaveLength(400);
  });

  it('caps parts at 16', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, label: `P${i}` }));
    expect(flow({ kind: 'flow', parts: many }).parts).toHaveLength(16);
  });

  describe('compare', () => {
    const cols = [{ label: 'Left' }, { label: 'Right' }];

    it('needs at least two columns', () => {
      expect(normalizeDiagram({ kind: 'compare', columns: [{ label: 'Only' }], rows: [{ label: 'r', values: ['x'] }] })).toBeUndefined();
      expect(normalizeDiagram({ kind: 'compare', rows: [{ label: 'r', values: ['x'] }] })).toBeUndefined();
    });

    it('needs at least one row with some non-empty value', () => {
      expect(normalizeDiagram({ kind: 'compare', columns: cols })).toBeUndefined();
      expect(normalizeDiagram({ kind: 'compare', columns: cols, rows: [] })).toBeUndefined();
      expect(normalizeDiagram({ kind: 'compare', columns: cols, rows: [{ label: 'r', values: ['', '  '] }] })).toBeUndefined();
      expect(normalizeDiagram({ kind: 'compare', columns: cols, rows: [{ label: 'r', values: [] }] })).toBeUndefined();
    });

    it('pads short rows and truncates long ones to the column count', () => {
      const d = normalizeDiagram({
        kind: 'compare',
        columns: cols,
        rows: [
          { label: 'short', values: ['only'] },
          { label: 'long', values: ['1', '2', '3', '4'] },
        ],
      }) as CompareDiagram;
      expect(d.rows).toEqual([
        { label: 'short', values: ['only', ''] },
        { label: 'long', values: ['1', '2'] },
      ]);
    });

    it('drops all-empty rows but keeps others, generates column ids, accepts numbers', () => {
      const d = normalizeDiagram({
        kind: 'compare',
        columns: [{ label: 1 }, { id: 'right', label: 2 }],
        rows: [
          { label: 'empty', values: [null, ''] },
          { label: 'num', values: [5, 6] },
        ],
      }) as CompareDiagram;
      expect(d.columns).toEqual([{ id: 'c0', label: '1' }, { id: 'right', label: '2' }]);
      expect(d.rows).toEqual([{ label: 'num', values: ['5', '6'] }]);
    });
  });
});

describe('DiagramField', () => {
  it('never fails a lecture, whatever the diagram holds', () => {
    expect(DiagramField.safeParse({ kind: 'flow', parts: parts('a', 'b') }).success).toBe(true);
    expect(DiagramField.safeParse('garbage').success).toBe(true);
  });
});

describe('GraphicItemSchema with a diagram', () => {
  const base = { id: 'g1', type: 'graphic', title: 'A figure' };

  // The app keeps the file as written (parseCourse returns the caller's
  // object), so a bad diagram must never fail the lecture; it is read with
  // normalizeDiagram where it is drawn.
  it('parses a graphic whose diagram is bad', () => {
    const r = GraphicItemSchema.safeParse({ ...base, diagram: { kind: 'nope' } });
    expect(r.success).toBe(true);
    expect(normalizeDiagram(r.data?.diagram)).toBeUndefined();
  });

  it('keeps a good diagram, drawable', () => {
    const r = GraphicItemSchema.safeParse({ ...base, diagram: { kind: 'flow', parts: parts('a', 'b') } });
    expect(r.success).toBe(true);
    expect(normalizeDiagram(r.data?.diagram)?.kind).toBe('flow');
  });

  it('normalizing twice gives the same diagram', () => {
    const once = normalizeDiagram({ kind: 'cycle', parts: parts('a', 'b', 'c'), links: [{ from: 'a', to: 'b', label: 'x' }] });
    expect(normalizeDiagram(once)).toEqual(once);
    const cmp = normalizeDiagram({ kind: 'compare', columns: [{ label: 'A' }, { label: 'B' }], rows: [{ label: 'r', values: ['1', '2'] }] });
    expect(normalizeDiagram(cmp)).toEqual(cmp);
  });
});
