import { useState } from 'react';
import type { FlashcardItem } from '@/schema/course';
import { DifficultyBadge } from './DifficultyBadge';
import { SourceNote } from './SourceNote';

interface FlashcardCardProps {
  item: FlashcardItem;
  onGot?: () => void;
  onMissed?: () => void;
}

export function FlashcardCard({ item, onGot, onMissed }: FlashcardCardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-3">
        Flashcard
        <DifficultyBadge difficulty={item.difficulty} />
      </div>

      {!flipped ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg text-text">{item.front}</p>
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Flip Card
          </button>
        </div>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg text-text">{item.back}</p>
          {item.hint && <p className="text-sm text-text-3">💡 {item.hint}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setFlipped(false);
                onGot?.();
              }}
              className="rounded bg-success px-4 py-2 text-sm font-medium text-white hover:bg-success-hover"
            >
              Got it ✓
            </button>
            <button
              type="button"
              onClick={() => {
                setFlipped(false);
                onMissed?.();
              }}
              className="rounded bg-error px-4 py-2 text-sm font-medium text-white hover:bg-error-hover"
            >
              Missed it ✗
            </button>
          </div>
          <SourceNote excerpt={item.source_excerpt} />
        </div>
      )}
    </div>
  );
}
