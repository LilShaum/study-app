import { useMemo } from 'react';
import type { GraphicItem } from '@/schema/course';
import { prepareSvg } from '@/lib/prepareSvg';
import { normalizeDiagram } from '@/schema/diagram';
import { purposeLabel } from '@/lib/figurePurpose';
import { DifficultyBadge } from './DifficultyBadge';
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
        <DifficultyBadge difficulty={item.difficulty} />
      </div>
      <div className="font-display text-heading font-semibold text-text">{item.title}</div>

      {/* What to look for, then the figure: the teacher pointing at the
          screen. So it sits with the title, above the drawing. */}
      {item.why && (
        <p className="prose-set mt-2 text-body text-text">
          <RichText text={item.why} />
        </p>
      )}

      {diagram ? (
        <div className="mt-4">
          <DrawnDiagram key={item.id} diagram={diagram} title={item.alt_text || item.title} />
        </div>
      ) : svg ? (
        <div
          role="img"
          aria-label={item.alt_text || item.title}
          className="mt-3 flex items-center justify-center text-text [&_svg]:max-h-80 [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="mt-3">
          <FigureElsewhere where={item.where} />
        </div>
      )}

      {item.caption && <div className="mt-2 text-sm text-text-2">{item.caption}</div>}
      <SourceNote excerpt={item.source_excerpt} page={item.source_page} open={notesOpen} />
    </div>
  );
}
