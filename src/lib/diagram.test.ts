import { describe, it, expect } from 'vitest';
import { boxEdgePoint, flowRows, whatIfEffect } from '@/lib/diagram';
import type { DiagramWhatIf, FlowDiagram } from '@/schema/diagram';

/** Builds a flow from part ids and `a>b` link specs (`a|b` makes a blocks link). */
function make(ids: string[], links: string[]): FlowDiagram {
  return {
    kind: 'flow',
    parts: ids.map((id) => ({ id, label: id })),
    links: links.map((s) => {
      const blocks = s.includes('|');
      const [from, to] = s.split(blocks ? '|' : '>');
      return { id: `${from}>${to}`, from, to, kind: blocks ? ('blocks' as const) : ('leads' as const) };
    }),
    what_ifs: [],
  };
}

const wi = (breaks: string[], affects?: string[]): DiagramWhatIf => ({ ask: 'q', breaks, ...(affects ? { affects } : {}), then: 't' });
const sorted = (s: Set<string>) => [...s].sort();

describe('whatIfEffect', () => {
  const chain = make(['A', 'B', 'C', 'D'], ['A>B', 'B>C', 'C>D']);

  it('breaking a part affects everything downstream and not upstream', () => {
    const e = whatIfEffect(chain, wi(['B']));
    expect(sorted(e.brokenParts)).toEqual(['B']);
    expect(sorted(e.affected)).toEqual(['C', 'D']);
  });

  it('breaking a link affects the target and what follows', () => {
    const e = whatIfEffect(chain, wi(['B>C']));
    expect(e.brokenParts.size).toBe(0);
    expect(sorted(e.brokenLinks)).toEqual(['B>C']);
    expect(sorted(e.affected)).toEqual(['C', 'D']);
  });

  it('breaking a part also marks its outgoing links broken', () => {
    const e = whatIfEffect(chain, wi(['B']));
    expect(sorted(e.brokenLinks)).toEqual(['B>C']);
  });

  it('explicit affects overrides the walk and excludes broken parts', () => {
    const e = whatIfEffect(chain, wi(['B'], ['B', 'D']));
    expect(sorted(e.affected)).toEqual(['D']);
    expect(sorted(e.brokenParts)).toEqual(['B']);
    const none = whatIfEffect(chain, wi(['B'], []));
    expect(none.affected.size).toBe(0);
  });

  it('a part fed by another working link is not affected', () => {
    const d = make(['A', 'B', 'C'], ['A>C', 'B>C']);
    const e = whatIfEffect(d, wi(['A']));
    expect(e.affected.size).toBe(0);
    // Break both feeders and C goes.
    const both = whatIfEffect(d, wi(['A', 'B']));
    expect(sorted(both.affected)).toEqual(['C']);
  });

  it('a blocks link carries no loss forward', () => {
    const d = make(['A', 'B', 'C'], ['A|B', 'B>C']);
    const e = whatIfEffect(d, wi(['A']));
    expect(e.affected.size).toBe(0);
    expect(sorted(e.brokenLinks)).toEqual(['A>B']);
  });
});

describe('flowRows', () => {
  it('puts a chain one part per row in order', () => {
    const { rows, backLinks } = flowRows(make(['A', 'B', 'C'], ['A>B', 'B>C']));
    expect(rows).toEqual([['A'], ['B'], ['C']]);
    expect(backLinks.size).toBe(0);
  });

  it('lays a branch out as A / B C / D', () => {
    const { rows } = flowRows(make(['A', 'B', 'C', 'D'], ['A>B', 'A>C', 'B>D', 'C>D']));
    expect(rows).toEqual([['A'], ['B', 'C'], ['D']]);
  });

  it('marks the closing link of a loop as a back link and still ranks the parts', () => {
    const { rows, backLinks } = flowRows(make(['A', 'B', 'C'], ['A>B', 'B>C', 'C>A']));
    expect([...backLinks]).toEqual(['C>A']);
    expect(rows).toEqual([['A'], ['B'], ['C']]);
  });

  it('puts unlinked parts all in row 0', () => {
    const { rows, backLinks } = flowRows(make(['A', 'B', 'C'], []));
    expect(rows).toEqual([['A', 'B', 'C']]);
    expect(backLinks.size).toBe(0);
  });

  it('ranks a part below its deepest feeder', () => {
    const { rows } = flowRows(make(['A', 'B', 'C'], ['A>B', 'B>C', 'A>C']));
    expect(rows).toEqual([['A'], ['B'], ['C']]);
  });
});

describe('boxEdgePoint', () => {
  const box = { x: 10, y: 20, w: 100, h: 40 }; // centre (60, 40)

  it('exits on the right edge plus pad when the target is to the right', () => {
    const p = boxEdgePoint(box, 500, 40, 3);
    expect(p.x).toBeCloseTo(60 + 50 + 3);
    expect(p.y).toBeCloseTo(40);
  });

  it('exits on the bottom edge when the target is below', () => {
    const p = boxEdgePoint(box, 60, 500, 3);
    expect(p.x).toBeCloseTo(60);
    expect(p.y).toBeCloseTo(40 + 20 + 3);
  });

  it('returns the centre when the target is the centre', () => {
    expect(boxEdgePoint(box, 60, 40)).toEqual({ x: 60, y: 40 });
  });

  it('defaults pad to 3', () => {
    expect(boxEdgePoint(box, 500, 40).x).toBeCloseTo(113);
  });

  it('works with zero pad on a diagonal', () => {
    const p = boxEdgePoint({ x: 0, y: 0, w: 20, h: 20 }, 100, 100, 0);
    expect(p.x).toBeCloseTo(20);
    expect(p.y).toBeCloseTo(20);
  });
});
