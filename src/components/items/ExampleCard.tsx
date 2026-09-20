import type { ExampleItem } from '@/schema/course';
import { Icon } from '@/components/Icon';
import { DifficultyBadge } from './DifficultyBadge';
import { SourceNote } from './SourceNote';

export function ExampleCard({ item }: { item: ExampleItem }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-3">
        <Icon name="clipboard" size={13} />
        Worked Example
        <DifficultyBadge difficulty={item.difficulty} />
      </div>
      <div className="font-display text-heading font-semibold text-text">{item.title}</div>
      {item.context && <div className="mt-1 text-sm text-text-2">{item.context}</div>}

      {item.steps && item.steps.length > 0 && (
        <ol className="mt-3 space-y-2">
          {item.steps.map((step, i) => (
            <li key={i} className="flex gap-2 text-sm text-text">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-xs font-semibold text-text-2">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}

      {item.takeaway && (
        <div className="mt-3 flex items-start gap-1.5 rounded border-l-2 border-border-strong bg-surface-sunken px-3 py-2 text-sm text-text">
          <Icon name="bulb" size={13} className="mt-0.5 shrink-0" />
          <span>
            <span className="font-medium">Key Takeaway</span> — {item.takeaway}
          </span>
        </div>
      )}
      <SourceNote excerpt={item.source_excerpt} />
    </div>
  );
}
