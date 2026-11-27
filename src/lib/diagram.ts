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
/** A waypoint's id in `slots`: where a link that skips rows passes through a row it does not stop in. */
export const isWaypoint = (id: string) => id.startsWith('~');

export function flowRows(diagram: FlowDiagram): {
  rows: string[][];
  /** The rows as drawn: parts, and the waypoints of links that pass through, so a line runs beside a part, never through it. */
  slots: string[][];
  /** Each row-skipping link's waypoints, top to bottom. */
  waypoints: Map<string, string[]>;
  backLinks: Set<string>;
} {
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

  // A link that skips rows gets a waypoint in each row between, so it is
  // laid out like a thin part and its line goes round the parts there.
  const slots = rows.map((r) => [...r]);
  const waypoints = new Map<string, string[]>();
  // Each slot's feeders, for the ordering below: a part is fed by the parts
  // (or the last waypoint) of the links into it; a waypoint by the one before.
  const feeds = new Map<string, string[]>();
  const feed = (to: string, from: string) => feeds.set(to, [...(feeds.get(to) ?? []), from]);
  for (const l of forward) {
    const from = rank.get(l.from)!;
    const to = rank.get(l.to)!;
    let prev = l.from;
    if (to - from > 1) {
      const wps: string[] = [];
      for (let r = from + 1; r < to; r++) {
        const w = `~${l.id}~${r}`;
        slots[r].push(w);
        wps.push(w);
        feed(w, prev);
        prev = w;
      }
      waypoints.set(l.id, wps);
    }
    feed(l.to, prev);
  }

  // One sweep down: order each row by the mean position of what feeds it.
  for (let r = 1; r < slots.length; r++) {
    const above = new Map(slots[r - 1].map((id, i) => [id, i]));
    const key = (id: string) => {
      const at = (feeds.get(id) ?? []).filter((f) => above.has(f)).map((f) => above.get(f)!);
      return at.length ? at.reduce((a, b) => a + b, 0) / at.length : Number.POSITIVE_INFINITY;
    };
    const order = (id: string) => index.get(id) ?? ids.length;
    slots[r] = [...slots[r]].sort((a, b) => key(a) - key(b) || order(a) - order(b));
    rows[r] = slots[r].filter((id) => !isWaypoint(id));
  }
  return { rows, slots, waypoints, backLinks };
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

/** A flow that branches like a key: one start, each part reached by one way only, and at least one choice. */
export interface DecisionTree {
  root: string;
  /** Each part's branches, in the order written: the answer on the link and where it goes. */
  branches: Map<string, { answer: string; to: string }[]>;
  /** Questions with answers ("Fluent?" yes / no), rather than a whole divided into parts. */
  decision: boolean;
}

/**
 * Reads a flow as a decision tree when it is one (a key to the aphasias, a
 * diagnostic path): a single part with nothing leading in, every other part
 * reached by exactly one link, no way back, and some part with two or more
 * ways out. A tree drawn as rows spreads sideways faster than a
 * phone is wide (eight ends in three questions), so it is set down the page
 * instead; returns undefined for anything else.
 */
export function asDecisionTree(diagram: FlowDiagram): DecisionTree | undefined {
  if (diagram.kind !== 'flow' || diagram.what_ifs.length > 0) return undefined;
  const ids = diagram.parts.map((p) => p.id);
  const incoming = new Map(ids.map((id) => [id, 0]));
  const branches = new Map<string, { answer: string; to: string }[]>(ids.map((id) => [id, []]));
  for (const l of diagram.links) {
    if (l.kind !== 'leads') return undefined;
    incoming.set(l.to, (incoming.get(l.to) ?? 0) + 1);
    branches.get(l.from)!.push({ answer: l.label ?? '', to: l.to });
  }
  const roots = ids.filter((id) => incoming.get(id) === 0);
  if (roots.length !== 1 || ids.some((id) => (incoming.get(id) ?? 0) > 1)) return undefined;
  const choices = [...branches.values()].filter((b) => b.length >= 2);
  // Every part that goes on branches: a pathway that runs a while and then
  // forks (a tract that crosses, 90% one way) is a flow, drawn as one.
  if (choices.length === 0 || [...branches.values()].some((b) => b.length === 1)) return undefined;
  // A key asks: every choice's ways out carry different answers. A hierarchy
  // ("divides into") repeats one label or none, and is read as an outline.
  const decision = choices.every((b) => b.every((x) => x.answer) && new Set(b.map((x) => x.answer.toLowerCase())).size === b.length);
  // Every part reachable from the start (one incoming each and one root rules out loops only if all are reached).
  const seen = new Set<string>();
  const walk = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const b of branches.get(id)!) walk(b.to);
  };
  walk(roots[0]);
  if (seen.size !== ids.length) return undefined;
  return { root: roots[0], branches, decision };
}
