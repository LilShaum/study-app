import { useState, type KeyboardEvent } from 'react';
import type { DefinitionItem } from '@/schema/course';
import { DifficultyBadge } from './DifficultyBadge';
import { SourceNote } from './SourceNote';

interface DefinitionCardProps {
  item: DefinitionItem;
  /** "definitions" study mode: term first, click/Enter to reveal the definition. */
  revealMode?: boolean;
}

export function DefinitionCard({ item, revealMode = false }: DefinitionCardProps) {
  const [revealed, setRevealed] = useState(!revealMode);

  const toggle = () => setRevealed((r) => !r);
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div
      className={`rounded-lg border border-border bg-surface p-5 shadow ${revealMode ? 'cursor-pointer' : ''}`}
      role={revealMode ? 'button' : undefined}
      tabIndex={revealMode ? 0 : undefined}
      aria-expanded={revealMode ? revealed : undefined}
      onClick={revealMode ? toggle : undefined}
      onKeyDown={revealMode ? handleKeyDown : undefined}
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-3">
        Definition
        <DifficultyBadge difficulty={item.difficulty} />
      </div>
      <div className="text-lg font-medium text-text">{item.term}</div>

      {revealMode && !revealed && <div className="mt-1 text-sm text-accent">Click to reveal definition →</div>}

      {revealed && (
        <div className="mt-2">
          <div className="text-text">{item.definition}</div>
          {item.example_sentence && (
            <div className="mt-2 text-sm italic text-text-2">&ldquo;{item.example_sentence}&rdquo;</div>
          )}
          {item.related_terms && item.related_terms.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 text-sm text-text-2">
              <span>Related:</span>
              {item.related_terms.map((t) => (
                <span key={t} className="rounded bg-accent-light px-1.5 py-0.5 text-accent">
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
      )}
    </div>
  );
}
