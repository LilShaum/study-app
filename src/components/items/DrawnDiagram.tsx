import { Fragment, useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CompareDiagram, Diagram, DiagramLink, DiagramPart, FlowDiagram } from '@/schema/diagram';
import { asDecisionTree, boxEdgePoint, flowRows, isWaypoint, whatIfEffect, type WhatIfEffect } from '@/lib/diagram';
import { TreeView, type TreeVariant } from './TreeView';

/**
 * A diagram the app draws from the generator's description
 * (docs/proposals/diagrams.md): in the book's type, in both themes, at the
 * width it is given. What a teacher does at the board, it does here:
 *
 * - **Step through it**: one part at a time, in the order written, its note
 *   beside the drawing; what is still to come stays faint.
 * - **Tap a part** for what it is or does.
 * - **What if …?**: a failure the lecture teaches (a part damaged, a link
 *   cut), with what fails drawn dashed and what is affected marked,
 *   and the consequence in words.
 *
 * Parts are set as HTML (so they wrap, take the book's face and can be
 * tapped) and the lines are drawn over them in SVG once the parts are
 * measured, so nothing is placed by guesswork.
 */

type Box = { x: number; y: number; w: number; h: number };

export function DrawnDiagram({ diagram, title, still = false }: { diagram: Diagram; title: string; still?: boolean }) {
  if (diagram.kind === 'compare') return <CompareView diagram={diagram} title={title} still={still} />;
  const tree = asDecisionTree(diagram);
  if (tree) {
    // PROTOTYPE switch for the owner's pick; removed once chosen.
    const variant = ((globalThis as { __treeVariant?: TreeVariant }).__treeVariant ??
      new URLSearchParams(globalThis.location?.search).get('tree') ??
      'key') as TreeVariant;
    return <TreeView diagram={diagram} tree={tree} title={title} still={still} variant={variant} />;
  }
  return <FlowView diagram={diagram} title={title} still={still} />;
}

/* ------------------------------------------------------------------ */
/* Flow and cycle                                                      */
/* ------------------------------------------------------------------ */

/** A cycle of this many parts or fewer is drawn as a ring; a longer one as a column that returns to its start. */
const RING_MAX = 7;

function FlowView({ diagram, title, still }: { diagram: FlowDiagram; title: string; still: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [step, setStep] = useState<number | null>(null);
  const [whatIfAt, setWhatIfAt] = useState<number | null>(null);

  const partsById = useMemo(() => new Map(diagram.parts.map((p) => [p.id, p])), [diagram.parts]);
  const effect = useMemo(
    () => (whatIfAt == null ? null : whatIfEffect(diagram, diagram.what_ifs[whatIfAt])),
    [diagram, whatIfAt],
  );
  const ring = diagram.kind === 'cycle' && diagram.parts.length <= RING_MAX;

  const stepping = step != null;
  const current = stepping ? diagram.parts[step] : selected ? partsById.get(selected) : undefined;
  const reached = useMemo(() => (stepping ? new Set(diagram.parts.slice(0, step + 1).map((p) => p.id)) : null), [diagram.parts, step, stepping]);

  const tapPart = (id: string) => {
    if (still) return;
    if (stepping) {
      setStep(diagram.parts.findIndex((p) => p.id === id));
      return;
    }
    setSelected((s) => (s === id ? null : id));
  };

  const stateOf = (id: string): PartState => {
    if (effect?.brokenParts.has(id)) return 'broken';
    if (effect?.affected.has(id)) return 'affected';
    if (stepping) return id === current?.id ? 'current' : reached!.has(id) ? 'reached' : 'ahead';
    if (selected === id) return 'current';
    return 'rest';
  };

  return (
    <div data-diagram className="w-full" role="group" aria-label={title}>
      <Measured
        parts={diagram.parts}
        links={diagram.links}
        ring={ring}
        diagram={diagram}
        renderPart={(p) => <PartButton key={p.id} part={p} state={stateOf(p.id)} still={still} onTap={() => tapPart(p.id)} />}
        linkState={(l) => linkState(l, effect, reached, still)}
      />

      {!still && (
        <>
          {effect && (
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-micro text-text-3" aria-hidden>
              {/* Only the marks this case draws, named for what they mean. */}
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-5 border-t-2 border-dashed border-error" /> fails
              </span>
              {effect.affected.size > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-5 border-t-2 border-warning" /> affected
                </span>
              )}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {stepping ? (
              <>
                <button type="button" className="press" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, (s ?? 0) - 1))}>
                  ← Back
                </button>
                {step < diagram.parts.length - 1 ? (
                  <button type="button" className="press press-ink" onClick={() => setStep((s) => (s ?? 0) + 1)}>
                    Next part
                  </button>
                ) : (
                  <button type="button" className="press press-ink" onClick={() => setStep(null)}>
                    Done
                  </button>
                )}
                <span className="text-micro text-text-3">
                  {step + 1} of {diagram.parts.length}
                </span>
              </>
            ) : (
              <button
                type="button"
                className="press"
                onClick={() => {
                  setWhatIfAt(null);
                  setSelected(null);
                  setStep(0);
                }}
              >
                Step through it
              </button>
            )}
          </div>

          <div aria-live="polite">
            {effect && whatIfAt != null ? (
              <Note heading={diagram.what_ifs[whatIfAt].name ?? diagram.what_ifs[whatIfAt].ask} tone="what-if">
                {diagram.what_ifs[whatIfAt].then}
              </Note>
            ) : current ? (
              <Note heading={stepping ? `${step + 1}. ${current.label}` : current.label}>{current.note}</Note>
            ) : null}
          </div>

          {diagram.what_ifs.length > 0 && (
            <div className="mt-5 border-t border-border pt-3">
              <p className="mark text-text-3">What if</p>
              <ul className="mt-1">
                {diagram.what_ifs.map((w, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      aria-pressed={whatIfAt === i}
                      onClick={() => {
                        setStep(null);
                        setSelected(null);
                        setWhatIfAt((at) => (at === i ? null : i));
                      }}
                      className={
                        'tap-safe py-1.5 text-left text-small text-accent hover:text-accent-hover ' +
                        (whatIfAt === i ? 'underline decoration-accent decoration-2 underline-offset-4' : '')
                      }
                    >
                      {w.ask}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

type PartState = 'rest' | 'current' | 'reached' | 'ahead' | 'broken' | 'affected';
type LinkStyle = 'rest' | 'on' | 'faint' | 'broken' | 'affected';

function linkState(l: DiagramLink, effect: WhatIfEffect | null, reached: Set<string> | null, still: boolean): LinkStyle {
  if (still) return 'rest';
  if (effect) {
    if (effect.brokenLinks.has(l.id)) return 'broken';
    if (effect.affected.has(l.to) && (effect.affected.has(l.from) || effect.brokenParts.has(l.from) || effect.brokenLinks.has(l.id))) return 'affected';
    if (effect.affected.has(l.from)) return 'affected';
    return 'rest';
  }
  if (reached) return reached.has(l.from) && reached.has(l.to) ? 'on' : 'faint';
  return 'rest';
}

const PART_CLASS: Record<PartState, string> = {
  // Blue: a part can be tapped, as everything blue in the app can.
  rest: 'border-border-strong text-accent shadow-[0_2px_0_0_var(--color-border-strong)] hover:text-accent-hover',
  current: 'border-accent text-text shadow-[0_2px_0_0_var(--color-accent)]',
  reached: 'border-text-3 text-text shadow-[0_2px_0_0_var(--color-text-3)]',
  ahead: 'border-border text-text-3 opacity-50',
  broken: 'border-dashed border-error text-error',
  affected: 'border-warning text-warning shadow-[0_2px_0_0_var(--color-warning)]',
};

// PROTOTYPE switch for the owner's pick of how a part is set; removed once chosen.
const PART_STYLE: 'box' | 'label' =
  ((globalThis as { __partStyle?: 'box' | 'label' }).__partStyle ?? new URLSearchParams(globalThis.location?.search).get('parts')) === 'label' ? 'label' : 'box';

function PartButton({ part, state, still, onTap }: { part: DiagramPart; state: PartState; still: boolean; onTap: () => void }) {
  const cls =
    (PART_STYLE === 'label'
      ? // A label on a plate: the words, ruled once underneath, as a herbarium sheet names its parts.
        'max-w-[11rem] border-b-2 px-1 pb-1 pt-0.5 text-center font-display text-small leading-snug '
      : 'max-w-[11rem] rounded-[1px] border px-2.5 py-1.5 text-center font-display text-small leading-snug ') +
    'transition-[color,border-color,opacity,box-shadow] duration-150 motion-reduce:transition-none ' +
    (PART_STYLE === 'label' ? PART_CLASS[state].replace(/shadow-\[[^\]]*\]/g, '') : PART_CLASS[state]);
  if (still) {
    return (
      <span data-part={part.id} className={cls}>
        {part.label}
      </span>
    );
  }
  return (
    <button type="button" data-part={part.id} aria-pressed={state === 'current'} onClick={onTap} className={cls + ' tap-safe'}>
      {part.label}
    </button>
  );
}

function Note({ heading, tone, children }: { heading: string; tone?: 'what-if'; children?: ReactNode }) {
  return (
    <div className={'mt-4 border-l-2 pl-3 ' + (tone === 'what-if' ? 'border-warning' : 'border-border-strong')}>
      <p className="font-display text-small font-semibold text-text">{heading}</p>
      {children && <p className="mt-0.5 text-small text-text-2">{children}</p>}
    </div>
  );
}

/**
 * Lays the parts out (rows down the page, or a ring), measures where each
 * landed, and draws the links between the measured boxes.
 */
function Measured({
  parts,
  links,
  ring,
  diagram,
  renderPart,
  linkState: styleOf,
}: {
  parts: DiagramPart[];
  links: DiagramLink[];
  ring: boolean;
  diagram: FlowDiagram;
  renderPart: (p: DiagramPart) => ReactNode;
  linkState: (l: DiagramLink) => LinkStyle;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [size, setSize] = useState({ w: 0, h: 0 });

  const { slots, waypoints, backLinks } = useMemo(
    () => (ring ? { slots: [] as string[][], waypoints: new Map<string, string[]>(), backLinks: new Set<string>() } : flowRows(diagram)),
    [diagram, ring],
  );
  const byId = useMemo(() => new Map(parts.map((p) => [p.id, p])), [parts]);
  const hasRail = backLinks.size > 0;

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const next: Record<string, Box> = {};
    el.querySelectorAll<HTMLElement>('[data-part]').forEach((node) => {
      const id = node.dataset.part!;
      const at = offsetIn(node, el);
      next[id] = { x: at.x, y: at.y, w: node.offsetWidth, h: node.offsetHeight };
    });
    setBoxes(next);
    setSize({ w: el.offsetWidth, h: el.offsetHeight });
  }, []);

  useLayoutEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    // Fraunces arriving late changes every label's width.
    void document.fonts?.ready.then(() => measure());
    return () => ro.disconnect();
  }, [measure, parts, ring]);

  // A ring's radius follows the width it is given, so once the width is
  // known the parts move and must be measured again where they landed.
  const ringLayout = ring ? ringPositions(parts.length, size.w) : null;
  useLayoutEffect(() => {
    if (ring) measure();
  }, [ring, size.w, measure]);

  return (
    <div ref={ref} className="relative w-full" style={ringLayout ? { height: ringLayout.height } : undefined}>
      {ringLayout ? (
        parts.map((p, i) => (
          <div
            key={p.id}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 justify-center"
            style={{ left: ringLayout.points[i].x, top: ringLayout.points[i].y, width: ringLayout.slot }}
          >
            {renderPart(p)}
          </div>
        ))
      ) : (
        <div className={'flex flex-col gap-y-11 py-1 ' + (hasRail ? 'pr-7' : '')}>
          {slots.map((row, r) => (
            // One row never wraps: a second line would put parts under parts
            // and send the arrows through them. The parts narrow instead.
            <div key={r} className="flex flex-nowrap items-center justify-center gap-x-3">
              {row.map((id) =>
                isWaypoint(id) ? (
                  // Room for a line passing through this row on its way down.
                  <span key={id} data-part={id} aria-hidden className="h-6 w-3 shrink-0" />
                ) : (
                  renderPart(byId.get(id)!)
                ),
              )}
            </div>
          ))}
        </div>
      )}

      <svg className="pointer-events-none absolute inset-0 overflow-visible" width={size.w} height={size.h} aria-hidden>
        {links.map((l) => {
          const a = boxes[l.from];
          const b = boxes[l.to];
          if (!a || !b) return null;
          return (
            <LinkPath
              key={l.id}
              link={l}
              a={a}
              b={b}
              style={styleOf(l)}
              rail={backLinks.has(l.id) ? Math.max(...Object.values(boxes).map((x) => x.x + x.w)) + 14 : null}
              via={(waypoints.get(l.id) ?? []).map((w) => boxes[w]).filter(Boolean).map((w) => ({ x: w.x + w.w / 2, y: w.y + w.h / 2 }))}
              center={ringLayout ? { x: size.w / 2, y: ringLayout.height / 2 } : null}
            />
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Where a part sits inside the drawing, in the drawing's own pixels. Read
 * from the screen (so a part placed with a transform is where it looks) and
 * divided by the drawing's own scale, so a drawing shrunk into a grid tile
 * still lines its arrows up.
 */
function offsetIn(node: HTMLElement, root: HTMLElement): { x: number; y: number } {
  const a = node.getBoundingClientRect();
  const b = root.getBoundingClientRect();
  const k = root.offsetWidth ? b.width / root.offsetWidth || 1 : 1;
  return { x: (a.left - b.left) / k, y: (a.top - b.top) / k };
}

function ringPositions(n: number, width: number) {
  const w = Math.max(width, 260);
  const slot = Math.min(176, w * 0.36);
  const rx = w / 2 - slot / 2;
  const ry = Math.min(rx, 150);
  const height = ry * 2 + 90;
  const points = Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return { x: w / 2 + rx * Math.sin(t), y: height / 2 - ry * Math.cos(t) };
  });
  return { points, slot, height };
}

const LINK_CLASS: Record<LinkStyle, string> = {
  rest: 'text-text-3',
  on: 'text-text',
  faint: 'text-text-3 opacity-30',
  broken: 'text-error',
  affected: 'text-warning',
};

function LinkPath({
  link,
  a,
  b,
  style,
  rail,
  center,
  via = [],
}: {
  link: DiagramLink;
  a: Box;
  b: Box;
  style: LinkStyle;
  rail: number | null;
  center: { x: number; y: number } | null;
  /** Points the line passes through on its way, in rows it skips. */
  via?: { x: number; y: number }[];
}) {
  const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  let d: string;
  let end: { x: number; y: number };
  let dir: { x: number; y: number };
  let mid: { x: number; y: number };
  let inward: 'start' | 'end' = 'start';

  if (rail != null) {
    // A link back up the page runs up the right-hand side.
    const s = { x: a.x + a.w + 3, y: ac.y };
    end = { x: b.x + b.w + 3, y: bc.y };
    d = `M${s.x},${s.y} H${rail} V${end.y} H${end.x}`;
    dir = { x: -1, y: 0 };
    mid = { x: rail, y: (s.y + end.y) / 2 };
  } else if (center) {
    // Round a ring: bowed outward, away from the centre.
    const m = { x: (ac.x + bc.x) / 2, y: (ac.y + bc.y) / 2 };
    const out = { x: m.x - center.x, y: m.y - center.y };
    const len = Math.hypot(out.x, out.y) || 1;
    const bow = Math.hypot(bc.x - ac.x, bc.y - ac.y) * 0.18;
    const c = { x: m.x + (out.x / len) * bow, y: m.y + (out.y / len) * bow };
    const s = boxEdgePoint(a, c.x, c.y);
    end = boxEdgePoint(b, c.x, c.y);
    d = `M${s.x},${s.y} Q${c.x},${c.y} ${end.x},${end.y}`;
    dir = unit(end.x - c.x, end.y - c.y);
    mid = { x: 0.25 * s.x + 0.5 * c.x + 0.25 * end.x, y: 0.25 * s.y + 0.5 * c.y + 0.25 * end.y };
    // Set inside the ring, where there is room, never off the page's edge.
    inward = mid.x > center.x ? 'end' : 'start';
  } else if (via.length) {
    // Down through the rows it skips, beside the parts there.
    const first = via[0];
    const last = via[via.length - 1];
    const s = boxEdgePoint(a, first.x, first.y);
    end = boxEdgePoint(b, last.x, last.y);
    d = `M${s.x},${s.y} ` + via.map((p) => `L${p.x},${p.y}`).join(' ') + ` L${end.x},${end.y}`;
    dir = unit(end.x - last.x, end.y - last.y);
    mid = { x: (s.x + first.x) / 2, y: (s.y + first.y) / 2 };
  } else {
    const s = boxEdgePoint(a, bc.x, bc.y);
    end = boxEdgePoint(b, ac.x, ac.y);
    d = `M${s.x},${s.y} L${end.x},${end.y}`;
    dir = unit(end.x - s.x, end.y - s.y);
    mid = { x: (s.x + end.x) / 2, y: (s.y + end.y) / 2 };
  }

  const n = { x: -dir.y, y: dir.x };
  const head =
    link.kind === 'blocks'
      ? `M${end.x + n.x * 6},${end.y + n.y * 6} L${end.x - n.x * 6},${end.y - n.y * 6}`
      : `M${end.x - dir.x * 7 + n.x * 4},${end.y - dir.y * 7 + n.y * 4} L${end.x},${end.y} L${end.x - dir.x * 7 - n.x * 4},${end.y - dir.y * 7 - n.y * 4}`;

  return (
    <g className={LINK_CLASS[style] + ' transition-opacity duration-150 motion-reduce:transition-none'}>
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={style === 'rest' || style === 'faint' ? 1.25 : 1.75}
        strokeDasharray={style === 'broken' ? '5 4' : undefined}
      />
      <path d={head} fill="none" stroke="currentColor" strokeWidth={link.kind === 'blocks' ? 2.25 : 1.5} strokeLinecap="round" strokeLinejoin="round" />
      {link.label && (
        <text
          x={inward === 'end' ? mid.x - 6 : mid.x + 6}
          y={mid.y}
          textAnchor={inward}
          dominantBaseline="middle"
          fill="currentColor"
          className="diagram-link-label"
        >
          {link.label}
        </text>
      )}
    </g>
  );
}

function unit(x: number, y: number) {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

/* ------------------------------------------------------------------ */
/* Compare                                                             */
/* ------------------------------------------------------------------ */

/**
 * Two to four things set against each other on the same rows. Pick one to
 * read it alone; the rows where they differ are the ones in full ink, and
 * the rows they share step back, since the difference is what is asked.
 */
function CompareView({ diagram, title, still }: { diagram: CompareDiagram; title: string; still: boolean }) {
  const [focus, setFocus] = useState<number | null>(null);
  const n = diagram.columns.length;
  const differs = diagram.rows.map((r) => new Set(r.values.map((v) => v.trim().toLowerCase())).size > 1);
  const same = n === 2 ? 'the same in both' : 'the same in all';
  // Side by side when the columns fit a phone: three always, four only when every value is short.
  const grid = n <= 3 || diagram.rows.every((r) => r.values.every((v) => v.length <= 28));
  const cols = { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` };
  const shown = focus == null ? null : focus;

  // The column names, once, at the top. Tapping one reads that column alone; tapping it again brings the others back.
  const head = (
    <div className={grid ? 'grid items-end gap-x-3 border-b border-border-strong pb-2' : 'flex flex-wrap gap-x-4 gap-y-1 border-b border-border-strong pb-2'} style={grid ? cols : undefined}>
      {diagram.columns.map((c, i) =>
        still ? (
          <span key={c.id} className="font-display text-small font-semibold leading-snug text-text">
            {c.label}
          </span>
        ) : (
          <button
            key={c.id}
            type="button"
            aria-pressed={focus === i}
            onClick={() => setFocus((f) => (f === i ? null : i))}
            className={
              'tap-safe py-1 text-left font-display text-small font-semibold leading-snug text-accent hover:text-accent-hover ' +
              (focus === i ? 'underline decoration-accent decoration-2 underline-offset-4' : focus != null ? 'opacity-60' : '')
            }
          >
            {c.label}
          </button>
        ),
      )}
    </div>
  );

  return (
    <div data-diagram className="w-full" role="group" aria-label={title}>
      {head}
      <dl className="divide-y divide-border">
        {diagram.rows.map((row, r) => (
          <div key={r} className="py-2.5">
            <dt className="mark text-text-3">
              {row.label}
              {!differs[r] && <span className="normal-case tracking-normal"> · {same}</span>}
            </dt>
            {shown != null ? (
              <dd className="mt-1 text-small text-text">{row.values[shown] || '—'}</dd>
            ) : !differs[r] ? (
              <dd className="mt-1 text-small text-text-2">{row.values[0] || '—'}</dd>
            ) : grid ? (
              <dd className="mt-1 grid gap-x-3 text-small leading-snug text-text" style={cols}>
                {diagram.columns.map((c, i) => (
                  <span key={c.id}>{row.values[i] || '—'}</span>
                ))}
              </dd>
            ) : (
              <dd className="mt-1 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1 text-small">
                {diagram.columns.map((c, i) => (
                  <Fragment key={c.id}>
                    <span className="max-w-[9rem] font-semibold text-text-2">{c.label}</span>
                    <span className="text-text">{row.values[i] || '—'}</span>
                  </Fragment>
                ))}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
