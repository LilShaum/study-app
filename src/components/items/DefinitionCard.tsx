import type { DefinitionItem } from '@/schema/course';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { DifficultyBadge } from './DifficultyBadge';
import { FRAME, type ItemFrame } from './frame';
import { SourceNote } from './SourceNote';

interface DefinitionCardProps {
  item: DefinitionItem;
  /** Only true for the single card in a study session, never in Browse. */
  keyboardEnabled?: boolean;
  onNext?: () => void;
  frame?: ItemFrame;
}

/**
 * A definition, to be read. There used to be a reveal mode — term first,
 * meaning on Enter — for the Definitions study mode; that mode now asks for
 * the term instead (RecallCard), which is the retrieval the reveal only
 * gestured at.
 */
export function DefinitionCard({ item, keyboardEnabled = false, onNext, frame = 'card' }: DefinitionCardProps) {
  useKeyboardShortcuts((e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    onNext?.();
  }, keyboardEnabled);

  return (
    <div className={FRAME[frame]}>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-3">
        Definition
        <DifficultyBadge difficulty={item.difficulty} />
      </div>
      {/* An entry, not a form: the headword runs into its definition, the way
          a dictionary sets one. */}
      <div>
        <p className="prose-set text-body text-text">
          <span className="mr-1.5 text-small font-semibold uppercase tracking-wider text-text">{item.term}.</span>
          {item.definition}
        </p>
        {item.example_sentence && (
          <div className="mt-2 text-sm italic text-text-2">&ldquo;{item.example_sentence}&rdquo;</div>
        )}
        {item.related_terms && item.related_terms.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-sm text-text-2">
            <span>Related:</span>
            {item.related_terms.map((t) => (
              <span key={t} className="press">
                {t}
              </span>
            ))}
          </div>
        )}
        {item.also_known_as && item.also_known_as.length > 0 && (
          <div className="mt-2 text-xs text-text-3">Also known as: {item.also_known_as.join(', ')}</div>
        )}
        <SourceNote excerpt={item.source_excerpt} />
      </div>
    </div>
  );
}
