import { useState } from 'react';
import type { SessionItem } from '@/lib/buildSessionItems';
import { RichText } from '@/components/items/RichText';
import { missedLine } from '@/lib/missedLine';

/**
 * The adaptive quiz's line above the card (docs/proposals/zen.md): the note
 * once everything that was due is done, and every
 * miss so far, opened at once (the owner, 2026-11-22: "a way to see them all
 * at once") without stopping the sitting.
 */
export function AdaptiveBar({ missed, dueDone }: { missed: SessionItem[]; dueDone: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4 border-b border-border pb-2 text-small">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="mark whitespace-nowrap text-text-3">Adaptive quiz</span>
        {dueDone && <span className="text-text-3">Everything due is done. Carry on, or stop here.</span>}
        {missed.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="tap-safe ml-auto whitespace-nowrap text-text-3 underline-offset-4 hover:text-text hover:underline"
          >
            {open ? 'Hide missed' : `Missed (${missed.length})`}
          </button>
        )}
      </div>
      {open && (
        <ol className="mt-3 max-h-[50vh] space-y-3 overflow-y-auto border-t border-border pt-3">
          {missed.map((item) => {
            const line = missedLine(item);
            if (!line) return null;
            return (
              <li key={`${item._courseId ?? ''}${item.id}`} className="border-b border-border pb-3">
                <div className="text-text"><RichText text={line.question} /></div>
                <div className="mt-1 text-success"><RichText text={line.answer} /></div>
                {line.why && <div className="mt-1 text-text-3"><RichText text={line.why} /></div>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
