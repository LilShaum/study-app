import { Fragment, useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CompareDiagram, Diagram, DiagramLink, DiagramPart, FlowDiagram } from '@/schema/diagram';
import { boxEdgePoint, flowRows, whatIfEffect, type WhatIfEffect } from '@/lib/diagram';

/**
 * A diagram the app draws from the generator's description
 * (docs/proposals/diagrams.md): in the book's type, in both themes, at the
 * width it is given. What a teacher does at the board, it does here:
 *
 * - **Step through it**: one part at a time, in the order written, its note
 *   beside the drawing; what is still to come stays faint.
 * - **Tap a part** for what it is or does.
 * - **What if …?**: a failure the lecture teaches (a part damaged, a link
 *   cut), with what breaks drawn struck and what stops working marked,
 *   and the consequence in words.
 *
 * Parts are set as HTML (so they wrap, take the book's face and can be
 * tapped) and the lines are drawn over them in SVG once the parts are
 * measured, so nothing is placed by guesswork.
 */

type Box = { x: number; y: number; w: number; h: number };

export function DrawnDiagram({ diagram, title, still = false }: { diagram: Diagram; title: string; still?: boolean }) {
  if (diagram.kind === 'compare') return <CompareView diagram={diagram} title={title} still={still} />;
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
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-5 border-t-2 border-dashed border-error" /> cut or damaged
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-5 border-t-2 border-warning" /> stops working
              </span>
            </p>
          )}

          <div aria-live="polite">
            {effect && whatIfAt != null ? (
              <Note heading={diagram.what_ifs[whatIfAt].name ?? diagram.what_ifs[whatIfAt].ask} tone="what-if">
                {diagram.what_ifs[whatIfAt].then}
              </Note>
            ) : current ? (
              <Note heading={stepping ? `${step + 1}. ${current.label}` : current.label}>{current.note}</Note>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {stepping ? (
              <>
                <button type="button" className="press" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, (s ?? 0) - 1))}>
                  ← Back
                </button>
                {step < diagram.parts.length - 1 ? (
                  <button type="button" className="press press-ink" onClick={() => setStep((s) => (s ?? 0) + 1)}>
                    Next →
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
    return 'faint';
  }
  if (reached) return reached.has(l.from) && reached.has(l.to) ? 'on' : 'faint';
  return 'rest';
}

const PART_CLASS: Record<PartState, string> = {
  rest: 'border-border-strong text-text shadow-[0_2px_0_0_var(--color-border-strong)]',
  current: 'border-accent text-text shadow-[0_2px_0_0_var(--color-accent)]',
  reached: 'border-text-3 text-text shadow-[0_2px_0_0_var(--color-text-3)]',
  ahead: 'border-border text-text-3 opacity-50',
  broken: 'border-dashed border-error text-error line-through decoration-error',
  affected: 'border-warning text-warning shadow-[0_2px_0_0_var(--color-warning)]',
};

function PartButton({ part, state, still, onTap }: { part: DiagramPart; state: PartState; still: boolean; onTap: () => void }) {
  const cls =
    'max-w-[11rem] rounded-[1px] border px-2.5 py-1.5 text-center font-display text-small leading-snug transition-[color,border-color,opacity,box-shadow] duration-150 motion-reduce:transition-none ' +
    PART_CLASS[state];
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

  const { rows, backLinks } = useMemo(() => (ring ? { rows: [], backLinks: new Set<string>() } : flowRows(diagram)), [diagram, ring]);
  const byId = useMemo(() => new Map(parts.map((p) => [p.id, p])), [parts]);
  const hasRail = backLinks.size > 0;

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const next: Record<string, Box> = {};
    el.querySelectorAll<HTMLElement>('[data-part]').forEach((node) => {
      const id = node.dataset.part!;
      next[id] = { x: offsetIn(node, el).x, y: offsetIn(node, el).y, w: node.offsetWidth, h: node.offsetHeight };
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

  // A ring's radius follows the width it is given.
  const ringLayout = ring ? ringPositions(parts.length, size.w) : null;

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
          {rows.map((row, r) => (
            <div key={r} className="flex flex-wrap items-center justify-center gap-x-3 gap-y-4">
              {row.map((id) => renderPart(byId.get(id)!))}
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
              center={ringLayout ? { x: size.w / 2, y: ringLayout.height / 2 } : null}
            />
          );
        })}
      </svg>
    </div>
  );
}

function offsetIn(node: HTMLElement, root: HTMLElement): { x: number; y: number } {
  const a = node.getBoundingClientRect();
  const b = root.getBoundingClientRect();
  return { x: a.left - b.left, y: a.top - b.top };
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
}: {
  link: DiagramLink;
  a: Box;
  b: Box;
  style: LinkStyle;
  rail: number | null;
  center: { x: number; y: number } | null;
}) {
  const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  let d: string;
  let end: { x: number; y: number };
  let dir: { x: number; y: number };
  let mid: { x: number; y: number };

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
          x={mid.x + 6}
          y={mid.y}
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
  const differs = diagram.rows.map((r) => new Set(r.values.map((v) => v.toLowerCase())).size > 1);

  return (
    <div data-diagram className="w-full" role="group" aria-label={title}>
      {!still && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-border pb-2" role="radiogroup" aria-label="Show">
          {[null, ...diagram.columns.map((_, i) => i)].map((i) => (
            <button
              key={i ?? 'all'}
              type="button"
              role="radio"
              aria-checked={focus === i}
              onClick={() => setFocus(i)}
              className={
                'tap-safe py-1 font-display text-small ' +
                (focus === i ? 'text-accent underline decoration-accent decoration-2 underline-offset-4' : 'text-text-2 hover:text-text')
              }
            >
              {i == null ? 'Side by side' : diagram.columns[i].label}
            </button>
          ))}
        </div>
      )}

      <dl className="divide-y divide-border">
        {diagram.rows.map((row, r) => (
          <div key={r} className={'py-2.5 ' + (differs[r] ? '' : 'opacity-60')}>
            <dt className="mark text-text-3">
              {row.label}
              {!differs[r] && <span className="normal-case tracking-normal"> · the same in all</span>}
            </dt>
            {focus == null ? (
              // One line per thing, its name in a column of its own, so the
              // values sit under one another and read down like a table.
              <dd className="mt-1 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1 text-small">
                {diagram.columns.map((c, i) => (
                  <Fragment key={c.id}>
                    <span className="max-w-[9rem] font-semibold text-text-2">{c.label}</span>
                    <span className="text-text">{row.values[i] || '—'}</span>
                  </Fragment>
                ))}
              </dd>
            ) : (
              <dd className="mt-1 text-small text-text">{row.values[focus] || '—'}</dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
