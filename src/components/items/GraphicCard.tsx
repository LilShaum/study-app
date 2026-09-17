import { useMemo } from 'react';
import type { GraphicItem } from '@/schema/course';
import { prepareSvg } from '@/lib/prepareSvg';
import { DifficultyBadge } from './DifficultyBadge';
import { SourceNote } from './SourceNote';

export function GraphicCard({ item }: { item: GraphicItem }) {
  // Sanitized + theme-adapted; see prepareSvg for why raw markup isn't used.
  const svg = useMemo(() => prepareSvg(item.svg), [item.svg]);

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-3">
        Diagram
        <DifficultyBadge difficulty={item.difficulty} />
      </div>
      <div className="text-lg font-medium text-text">{item.title}</div>

      <div
        role="img"
        aria-label={item.alt_text || item.title}
        className="mt-3 flex items-center justify-center text-text [&_svg]:max-h-80 [&_svg]:max-w-full"
      >
        {svg ? (
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div className="text-sm text-text-3">No diagram provided</div>
        )}
      </div>

      {item.caption && <div className="mt-2 text-sm text-text-2">{item.caption}</div>}
      <SourceNote excerpt={item.source_excerpt} />
    </div>
  );
}
