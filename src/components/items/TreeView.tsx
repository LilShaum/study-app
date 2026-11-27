import { useMemo, useState } from 'react';
import type { DiagramPart, FlowDiagram } from '@/schema/diagram';
import type { DecisionTree } from '@/lib/diagram';

/**
 * A decision tree (a key: "Fluent? yes → Comprehends? no → …") set down the
 * page instead of across it. PROTOTYPE: three ways to show it, for the owner
 * to pick from; the two not picked are removed.
 */
export type TreeVariant = 'key' | 'walk' | 'branches';

export function TreeView({ diagram, tree, title, still, variant }: { diagram: FlowDiagram; tree: DecisionTree; title: string; still: boolean; variant: TreeVariant }) {
  const byId = useMemo(() => new Map(diagram.parts.map((p) => [p.id, p])), [diagram.parts]);
  // A hierarchy has no questions to walk or key: it is always an outline.
  if (!tree.decision) return <Branches tree={tree} byId={byId} title={title} still={still} />;
  if (variant === 'walk' && !still) return <Walk tree={tree} byId={byId} title={title} />;
  if (variant === 'branches') return <Branches tree={tree} byId={byId} title={title} still={still} />;
  return <Key tree={tree} byId={byId} title={title} still={still} />;
}

type Props = { tree: DecisionTree; byId: Map<string, DiagramPart>; title: string };

const isEnd = (tree: DecisionTree, id: string) => (tree.branches.get(id) ?? []).length === 0;

/* A field guide's key: numbered couplets, each answer leading to a number or a name. */
function Key({ tree, byId, title, still }: Props & { still: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [lit, setLit] = useState<string | null>(null);
  // Questions numbered in the order you would meet them going down the first answers first.
  const order = useMemo(() => {
    const out: string[] = [];
    const walk = (id: string) => {
      if (isEnd(tree, id)) return;
      out.push(id);
      for (const b of tree.branches.get(id)!) walk(b.to);
    };
    walk(tree.root);
    return out;
  }, [tree]);
  const num = new Map(order.map((id, i) => [id, i + 1]));

  return (
    <div data-diagram role="group" aria-label={title} className="w-full">
      <ol className="border-t border-border">
        {order.map((id) => (
          <li key={id} id={`key-${id}`} className={'grid grid-cols-[1.75rem_minmax(0,1fr)] border-b border-border py-2 transition-colors ' + (lit === id ? 'bg-accent/5' : '')}>
            <span className="pt-0.5 font-display text-small text-text-3 tabular-nums">{num.get(id)}</span>
            <div>
              <p className="font-display text-body font-semibold text-text">{byId.get(id)!.label}</p>
              <ul className="mt-0.5">
                {tree.branches.get(id)!.map((b) => {
                  const end = isEnd(tree, b.to);
                  const target = end ? byId.get(b.to)!.label : String(num.get(b.to));
                  return (
                    <li key={b.to} className="flex items-baseline gap-2 text-small">
                      <span className="max-w-[45%] text-text-2">{b.answer}</span>
                      <span className="min-w-0 flex-1 translate-y-[-3px] border-b border-dotted border-border-strong" aria-hidden />
                      {still ? (
                        <span className={end ? 'font-display text-text' : 'tabular-nums text-text-2'}>{target}</span>
                      ) : (
                        <button
                          type="button"
                          className={'tap-safe py-1 text-right font-display text-accent hover:text-accent-hover ' + (open === b.to ? 'underline decoration-accent decoration-2 underline-offset-4' : '')}
                          onClick={() => {
                            if (end) setOpen((o) => (o === b.to ? null : b.to));
                            else {
                              setLit(b.to);
                              document.getElementById(`key-${b.to}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                              window.setTimeout(() => setLit((l) => (l === b.to ? null : l)), 1400);
                            }
                          }}
                        >
                          {end ? target : `go to ${target}`}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {tree.branches.get(id)!.map((b) =>
                open === b.to && byId.get(b.to)!.note ? (
                  <p key={b.to} className="mt-1 border-l-2 border-border-strong pl-3 text-small text-text-2">
                    {byId.get(b.to)!.note}
                  </p>
                ) : null,
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* One question at a time, the way the teacher would ask it. */
function Walk({ tree, byId, title }: Props) {
  const [path, setPath] = useState<{ at: string; answer: string }[]>([]);
  const at = path.length ? (tree.branches.get(path[path.length - 1].at)!.find((b) => b.answer === path[path.length - 1].answer)!.to) : tree.root;
  const part = byId.get(at)!;
  const end = isEnd(tree, at);
  const ends = useMemo(() => [...tree.branches.keys()].filter((id) => isEnd(tree, id)).length, [tree]);

  return (
    <div data-diagram role="group" aria-label={title} className="w-full">
      {path.length > 0 && (
        <ol className="flex flex-wrap gap-x-3 gap-y-1 text-small text-text-3">
          {path.map((s, i) => (
            <li key={i}>
              <button type="button" className="tap-safe py-1 text-accent hover:text-accent-hover" onClick={() => setPath(path.slice(0, i))}>
                {byId.get(s.at)!.label} <span className="text-text-2">{s.answer}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <div aria-live="polite" className="mt-3 border-t border-border pt-4">
        {end ? (
          <>
            <p className="mark text-text-3">So it is</p>
            <p className="mt-1 font-display text-title font-semibold text-text">{part.label}</p>
            {part.note && <p className="mt-2 text-small text-text-2">{part.note}</p>}
            <button type="button" className="press mt-5" onClick={() => setPath([])}>
              Start again
            </button>
          </>
        ) : (
          <>
            <p className="font-display text-title font-semibold text-text">{part.label}</p>
            {part.note && <p className="mt-1 text-small text-text-2">{part.note}</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              {tree.branches.get(at)!.map((b) => (
                <button key={b.to} type="button" className="press min-w-[6rem]" onClick={() => setPath([...path, { at, answer: b.answer }])}>
                  {b.answer}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <p className="mt-4 text-micro text-text-3">
        {path.length === 0 ? `${ends} possible answers` : end ? `${path.length} questions` : `question ${path.length + 1}`}
      </p>
    </div>
  );
}

/* The whole tree, indented, every branch visible. */
function Branches({ tree, byId, title, still }: Props & { still: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const node = (id: string, answer: string | null, depth: number) => {
    const part = byId.get(id)!;
    const end = isEnd(tree, id);
    const label = end ? (
      still ? (
        <span className="font-display text-text">{part.label}</span>
      ) : (
        <button type="button" onClick={() => setOpen((o) => (o === id ? null : id))} className={'tap-safe py-0.5 text-left font-display text-accent hover:text-accent-hover ' + (open === id ? 'underline decoration-accent decoration-2 underline-offset-4' : '')}>
          {part.label}
        </button>
      )
    ) : (
      <span className="font-display font-semibold text-text">{part.label}</span>
    );
    return (
      <li key={id} className={depth ? "relative pl-4 before:absolute before:left-0 before:top-[0.8em] before:w-3 before:border-t before:border-border-strong" : ''}>
        <p className="py-0.5 text-small leading-snug">
          {answer && tree.decision && <span className="mr-1.5 text-text-3">{answer}</span>}
          {label}
        </p>
        {open === id && part.note && <p className="mb-1 border-l-2 border-border-strong pl-3 text-small text-text-2">{part.note}</p>}
        {!end && (
          <ul className="ml-1 border-l border-border-strong">
            {tree.branches.get(id)!.map((b) => node(b.to, b.answer, depth + 1))}
          </ul>
        )}
      </li>
    );
  };
  return (
    <div data-diagram role="group" aria-label={title} className="w-full">
      <ul>{node(tree.root, null, 0)}</ul>
    </div>
  );
}
