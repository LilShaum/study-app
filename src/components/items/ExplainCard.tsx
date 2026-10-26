import type { ExplainItem } from '@/schema/course';
import { FRAME, type ItemFrame } from './frame';
import { SourceNote } from './SourceNote';

/**
 * A key idea explained, to read before the questions on it: what it is, why,
 * and how it follows from what came before, as a tutor would say it in
 * class. Set as prose on the page, like a definition, not as a card: it
 * teaches and asks nothing.
 */
export function ExplainCard({ item, frame = 'card', notesOpen = false }: { item: ExplainItem; frame?: ItemFrame; notesOpen?: boolean }) {
  const paragraphs = item.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className={FRAME[frame]}>
      <div className="mark mb-2 text-text-3">The idea</div>
      <h3 className="font-display text-heading font-semibold text-text">{item.title}</h3>
      <div className="prose-set mt-2 space-y-2 text-body text-text">
        {paragraphs.map((p, k) => (
          <p key={k}>{p}</p>
        ))}
      </div>
      <SourceNote excerpt={item.source_excerpt} open={notesOpen} />
    </div>
  );
}
