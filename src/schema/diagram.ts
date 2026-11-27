import { z } from 'zod';

/**
 * A diagram the generator describes and the app draws (docs/proposals/diagrams.md).
 *
 * Why not SVG: a language model placing every coordinate blind is the worst
 * way to draw. Labels collided, arrows missed their boxes, and no two
 * diagrams looked alike. Described as parts and links instead, the app lays
 * it out in its own type and both themes, at phone width, and because it
 * knows what each part is it can step through it, show a part's note, and
 * play out a "what if" the lecture teaches (a part damaged, a link cut).
 *
 * Read leniently, like the rest of a course: anything malformed is dropped,
 * and a diagram left with too little to draw becomes `undefined`, so the
 * figure falls back to its `svg` or its `where`.
 */

const text = (max: number) =>
  z.preprocess((v) => (typeof v === 'number' ? String(v) : v), z.string().trim().min(1).transform((s) => s.slice(0, max)));

const optText = (max: number) => z.preprocess((v) => (typeof v === 'string' && v.trim() ? v : undefined), text(max).optional()).catch(undefined);

const idText = z.preprocess((v) => (typeof v === 'number' ? String(v) : v), z.string().trim().min(1).max(80));

const PartSchema = z.looseObject({
  id: idText,
  label: text(80),
  /** What this part is or does, shown when it is tapped or reached in a step-through. */
  note: optText(300),
});

const LinkSchema = z.looseObject({
  /** Optional: a link is otherwise named `from>to`, which is what a what-if's `breaks` uses. */
  id: idText.optional().catch(undefined),
  from: idText,
  to: idText,
  label: optText(60),
  /** `blocks` is drawn with a bar for an end, as inhibition is drawn in every textbook. */
  kind: z.enum(['leads', 'blocks']).optional().catch(undefined),
});

const WhatIfSchema = z.looseObject({
  /** The question as the student taps it: "What if Broca's area is damaged?" */
  ask: text(120),
  /** A name for the case, where the lecture has one: "Broca's aphasia". */
  name: optText(60),
  /** Part ids, or link ids (`from>to`), that fail. */
  breaks: z.array(idText).catch([]),
  /** Parts that stop working as a result; computed from the links when absent. */
  affects: z.array(idText).optional().catch(undefined),
  /** What follows, as the lecture says it. */
  then: text(400),
});

const ColumnSchema = z.looseObject({ id: idText.optional().catch(undefined), label: text(60) });
const RowSchema = z.looseObject({ label: text(60), values: z.array(z.preprocess((v) => (v == null ? '' : String(v)), z.string().max(240))).catch([]) });

const lenientArray = <T extends z.ZodType>(schema: T, max: number) =>
  z.preprocess(
    (v) => (Array.isArray(v) ? v.filter((x) => schema.safeParse(x).success).slice(0, max) : []),
    z.array(schema),
  );

const RawDiagramSchema = z.looseObject({
  kind: z.enum(['flow', 'cycle', 'compare']),
  parts: lenientArray(PartSchema, 16).optional(),
  links: lenientArray(LinkSchema, 30).optional(),
  what_ifs: lenientArray(WhatIfSchema, 6).optional(),
  columns: lenientArray(ColumnSchema, 4).optional(),
  rows: lenientArray(RowSchema, 12).optional(),
});

export type DiagramPart = { id: string; label: string; note?: string };
export type DiagramLink = { id: string; from: string; to: string; label?: string; kind: 'leads' | 'blocks' };
export type DiagramWhatIf = { ask: string; name?: string; breaks: string[]; affects?: string[]; then: string };

export type FlowDiagram = { kind: 'flow' | 'cycle'; parts: DiagramPart[]; links: DiagramLink[]; what_ifs: DiagramWhatIf[] };
export type CompareDiagram = { kind: 'compare'; columns: { id: string; label: string }[]; rows: { label: string; values: string[] }[] };
export type Diagram = FlowDiagram | CompareDiagram;

/** Turns what the generator wrote into something the app can draw, or `undefined`. */
export function normalizeDiagram(raw: unknown): Diagram | undefined {
  const parsed = RawDiagramSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  const d = parsed.data;

  if (d.kind === 'compare') {
    const columns = (d.columns ?? []).map((c, i) => ({ id: c.id ?? `c${i}`, label: c.label }));
    if (columns.length < 2) return undefined;
    const rows = (d.rows ?? [])
      .map((r) => ({ label: r.label, values: columns.map((_, i) => (r.values[i] ?? '').trim()) }))
      .filter((r) => r.values.some(Boolean));
    if (rows.length === 0) return undefined;
    return { kind: 'compare', columns, rows };
  }

  // Parts: unique ids, first one wins.
  const seen = new Set<string>();
  const parts: DiagramPart[] = [];
  for (const p of d.parts ?? []) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    parts.push({ id: p.id, label: p.label, ...(p.note ? { note: p.note } : {}) });
  }
  if (parts.length < 2) return undefined;

  let links: DiagramLink[];
  if (d.kind === 'cycle') {
    // A cycle's order is its parts' order; written links only lend labels and kinds.
    const written = new Map((d.links ?? []).map((l) => [`${l.from}>${l.to}`, l]));
    links = parts.map((p, i) => {
      const next = parts[(i + 1) % parts.length];
      const w = written.get(`${p.id}>${next.id}`);
      return { id: w?.id ?? `${p.id}>${next.id}`, from: p.id, to: next.id, ...(w?.label ? { label: w.label } : {}), kind: w?.kind ?? 'leads' };
    });
  } else {
    const linkIds = new Set<string>();
    links = [];
    for (const l of d.links ?? []) {
      if (!seen.has(l.from) || !seen.has(l.to) || l.from === l.to) continue;
      const id = l.id ?? `${l.from}>${l.to}`;
      if (linkIds.has(id)) continue;
      linkIds.add(id);
      links.push({ id, from: l.from, to: l.to, ...(l.label ? { label: l.label } : {}), kind: l.kind ?? 'leads' });
    }
  }

  const known = new Set([...parts.map((p) => p.id), ...links.map((l) => l.id)]);
  const what_ifs: DiagramWhatIf[] = [];
  for (const w of d.what_ifs ?? []) {
    const breaks = w.breaks.filter((id) => known.has(id));
    if (breaks.length === 0) continue;
    const affects = w.affects?.filter((id) => seen.has(id));
    what_ifs.push({ ask: w.ask, ...(w.name ? { name: w.name } : {}), breaks, ...(affects ? { affects } : {}), then: w.then });
  }

  return { kind: d.kind, parts, links, what_ifs };
}

/**
 * The schema field. Kept as written: the app stores the file as the AI
 * wrote it (parseCourse returns the caller's object), so a diagram is read
 * with `normalizeDiagram` where it is drawn, and a bad one never fails the
 * lecture.
 */
export const DiagramField = z.unknown().optional();
