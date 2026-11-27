import { useMemo } from 'react';
import type { GraphicItem } from '@/schema/course';
import { prepareSvg } from '@/lib/prepareSvg';
import { normalizeDiagram } from '@/schema/diagram';
import { purposeLabel } from '@/lib/figurePurpose';
import { FRAME, type ItemFrame } from './frame';
import { RichText } from './RichText';
import { DrawnDiagram } from './DrawnDiagram';
import { SourceNote } from './SourceNote';

/**
 * Where a figure is in the student's own material, when the app has no
 * drawing of its own. Most of a real lecture's figures (a labelled plate, a
 * photograph, a results plot) cannot be honestly redrawn, and a crude copy is
 * worth less than being sent to the real one (docs/proposals/narration.md).
 * Worded for any source: the place carries its own unit.
 */
export function FigureElsewhere({ where }: { where?: string }) {
  return (
    <p className="text-sm text-text-3">
      In your own notes{where ? <>: <span className="text-text-2">{where}</span></> : null}
    </p>
  );
}

/**
 * What to take from a figure. When the app drew it, the whole `why` sits by
 * the drawing. When it could not, a student without the slides needs the
 * point first and the description of a picture they cannot see second
 * (the fresh-eyes test, 2026-11-27: "a locked door with a description of
 * the room"), so the first sentence leads and the rest folds under where
 * the picture is.
 */
export function FigureWhy({ why, where, drawn, className }: { why?: string; where?: string; drawn: boolean; className: string }) {
  if (!why) return drawn ? null : <FigureElsewhere where={where} />;
  if (drawn) {
    return (
      <p className={className}>
        <RichText text={why} />
      </p>
    );
  }
  const [lead, ...rest] = why.split(/(?<=[.!?])\s+(?=[A-Z'"(])/);
  return (
    <>
      <p className={className}>
        <RichText text={lead} />
      </p>
      {rest.length > 0 ? (
        <details className="group mt-2">
          <summary className="tap-safe inline-flex cursor-pointer list-none items-center py-1 text-small text-accent hover:text-accent-hover [&::-webkit-details-marker]:hidden">
            {where ? `What the picture on ${where} shows` : 'What the picture in your notes shows'}
            <span aria-hidden className="ml-1 inline-block transition-transform group-open:rotate-90 motion-reduce:transition-none">▸</span>
          </summary>
          <p className="mt-1 border-l-2 border-border-strong pl-3 text-small text-text-2">
            <RichText text={rest.join(' ')} />
          </p>
        </details>
      ) : (
        <div className="mt-2">
          <FigureElsewhere where={where} />
        </div>
      )}
    </>
  );
}

export function GraphicCard({
  item,
  frame = 'card',
  notesOpen = false,
  sectionTitle,
}: {
  item: GraphicItem;
  frame?: ItemFrame;
  notesOpen?: boolean;
  /** The section the figure belongs to, so one met at a section's edge is not taken for the next one's. */
  sectionTitle?: string;
}) {
  // Sanitized + theme-adapted; see prepareSvg for why raw markup isn't used.
  const svg = useMemo(() => prepareSvg(item.svg), [item.svg]);
  const diagram = useMemo(() => normalizeDiagram(item.diagram), [item.diagram]);
  const purpose = purposeLabel(item.purpose);

  return (
    <div className={FRAME[frame]}>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-3">
        Diagram
        {sectionTitle?.trim() && <span className="font-normal normal-case tracking-normal">· {sectionTitle.trim()}</span>}
        {purpose && <span className="font-normal normal-case tracking-normal">· {purpose}</span>}
      </div>
      <div className="font-display text-heading font-semibold text-text">{item.title}</div>

      {/* What to look for, then the figure: the teacher pointing at the
          screen. So it sits with the title, above the drawing. */}
      <FigureWhy why={item.why} where={item.where} drawn={!!(diagram || svg)} className="prose-set mt-2 text-body text-text" />

      {diagram ? (
        <div className="mt-4">
          <DrawnDiagram key={item.id} diagram={diagram} title={item.alt_text || item.title} />
        </div>
      ) : svg ? (
        <div
          role="img"
          aria-label={item.alt_text || item.title}
          className="figure-svg mt-3 flex items-center justify-center text-text [&_svg]:max-h-80 [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : null}

      {item.caption && <div className="mt-2 text-sm text-text-2">{item.caption}</div>}
      <SourceNote excerpt={item.source_excerpt} page={item.source_page} open={notesOpen} />
    </div>
  );
}
