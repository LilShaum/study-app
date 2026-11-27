import type { DiagramLink, DiagramWhatIf, FlowDiagram } from '@/schema/diagram';

/**
 * The thinking behind a drawn diagram, kept out of the component so it can
 * be tested: which rows a flow is laid out in, and what a "what if" breaks.
 * See docs/proposals/diagrams.md.
 */

/** What a what-if does to the drawing: the parts and links that fail, and the parts that stop working because of them. */
export interface WhatIfEffect {
  brokenParts: Set<string>;
  brokenLinks: Set<string>;
  affected: Set<string>;
}

/**
 * The parts a failure reaches. Written `affects` wins: the lecture knows
 * which functions are lost (a cut link in a speech pathway spares
 * comprehension but not repetition), and a graph walk cannot. Without it,
 * everything downstream along `leads` links is affected; a `blocks` link
 * carries no loss forward, since losing an inhibitor releases its target
 * rather than stopping it.
 */
export function whatIfEffect(diagram: FlowDiagram, whatIf: DiagramWhatIf): WhatIfEffect {
  const partIds = new Set(diagram.parts.map((p) => p.id));
  const brokenParts = new Set(whatIf.breaks.filter((id) => partIds.has(id)));
  const brokenLinks = new Set(whatIf.breaks.filter((id) => !partIds.has(id)));
  // A broken part takes the links out of it with it.
  for (const l of diagram.links) if (brokenParts.has(l.from)) brokenLinks.add(l.id);

  if (whatIf.affects) {
    return { brokenParts, brokenLinks, affected: new Set(whatIf.affects.filter((id) => !brokenParts.has(id))) };
  }

  const affected = new Set<string>();
  const queue: string[] = [];
  const reach = (link: DiagramLink) => {
    if (link.kind !== 'leads' || brokenParts.has(link.to) || affected.has(link.to)) return;
    // A part still fed by a working link from a working part keeps working.
    const fedElsewhere = diagram.links.some(
      (o) => o.to === link.to && o.kind === 'leads' && !brokenLinks.has(o.id) && !brokenParts.has(o.from) && !affected.has(o.from) && o.id !== link.id,
    );
    if (fedElsewhere) return;
    affected.add(link.to);
    queue.push(link.to);
  };
  for (const l of diagram.links) if (brokenLinks.has(l.id)) reach(l);
  while (queue.length) {
    const id = queue.shift()!;
    for (const l of diagram.links) if (l.from === id) reach(l);
  }
  return { brokenParts, brokenLinks, affected };
}

/**
 * Rows for a flow, top to bottom (a phone is tall, not wide): each part sits
 * one row below the deepest part that leads into it, so arrows run down.
 * Links that would run back up (a loop, feedback) are found by a walk in the
 * order the parts were written and left out of the ranking; the drawing
 * routes them up the side. Within a row, parts keep the written order,
 * then are nudged toward the parts that feed them, so lines cross less.
 */
export function flowRows(diagram: FlowDiagram): { rows: string[][]; backLinks: Set<string> } {
  const ids = diagram.parts.map((p) => p.id);
  const index = new Map(ids.map((id, i) => [id, i]));
  const out = new Map<string, DiagramLink[]>(ids.map((id) => [id, []]));
  for (const l of diagram.links) out.get(l.from)?.push(l);

  // Back links: a link to a part still on the walk's path.
  const backLinks = new Set<string>();
  const state = new Map<string, 'on' | 'done'>();
  const walk = (id: string) => {
    state.set(id, 'on');
    for (const l of out.get(id) ?? []) {
      const s = state.get(l.to);
      if (s === 'on') backLinks.add(l.id);
      else if (!s) walk(l.to);
    }
    state.set(id, 'done');
  };
  for (const id of ids) if (!state.has(id)) walk(id);

  const forward = diagram.links.filter((l) => !backLinks.has(l.id));
  const rank = new Map<string, number>(ids.map((id) => [id, 0]));
  // Longest path; the forward links form no loop, so |parts| passes settle it.
  for (let pass = 0; pass < ids.length; pass++) {
    let changed = false;
    for (const l of forward) {
      const r = rank.get(l.from)! + 1;
      if (r > rank.get(l.to)!) {
        rank.set(l.to, r);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const rowCount = Math.max(...rank.values()) + 1;
  const rows: string[][] = Array.from({ length: rowCount }, () => []);
  for (const id of ids) rows[rank.get(id)!].push(id);

  // One sweep down: order each row by the mean position of what feeds it.
  for (let r = 1; r < rows.length; r++) {
    const above = new Map(rows[r - 1].map((id, i) => [id, i]));
    const key = (id: string) => {
      const feeds = forward.filter((l) => l.to === id && above.has(l.from)).map((l) => above.get(l.from)!);
      return feeds.length ? feeds.reduce((a, b) => a + b, 0) / feeds.length : Number.POSITIVE_INFINITY;
    };
    rows[r] = [...rows[r]].sort((a, b) => key(a) - key(b) || index.get(a)! - index.get(b)!);
  }
  return { rows, backLinks };
}

/** The point where the line from a box's centre toward (tx, ty) leaves the box. */
export function boxEdgePoint(
  box: { x: number; y: number; w: number; h: number },
  tx: number,
  ty: number,
  pad = 3,
): { x: number; y: number } {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const hw = box.w / 2 + pad;
  const hh = box.h / 2 + pad;
  const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
  return { x: cx + dx * scale, y: cy + dy * scale };
}
