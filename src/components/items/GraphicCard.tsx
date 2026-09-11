import type { GraphicItem } from '@/schema/course';
import { DifficultyBadge } from './DifficultyBadge';

export function GraphicCard({ item }: { item: GraphicItem }) {
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
        className="mt-3 flex items-center justify-center [&_svg]:max-h-80 [&_svg]:max-w-full"
      >
        {item.svg ? (
          // Trusted markup produced by the course generator (see CLAUDE.md),
          // same trust boundary the vanilla app used for this field.
          <div dangerouslySetInnerHTML={{ __html: item.svg }} />
        ) : (
          <div className="text-sm text-text-3">No diagram provided</div>
        )}
      </div>

      {item.caption && <div className="mt-2 text-sm text-text-2">{item.caption}</div>}
    </div>
  );
}
