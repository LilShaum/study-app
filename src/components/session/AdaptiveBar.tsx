/**
 * The adaptive quiz's line above the card (docs/proposals/zen.md): the note
 * once everything that was due at the start is done. Each answer is marked
 * as it is given, with its why and passage, so no list of misses is needed
 * (the owner, 2026-11-25, on a Missed list that only repeated that).
 */
export function AdaptiveBar({ dueDone }: { dueDone: boolean }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-2 text-small">
      <span className="mark whitespace-nowrap text-text-3">Adaptive quiz</span>
      {dueDone && <span className="text-text-3">Everything to review is done. Carry on, or stop here.</span>}
    </div>
  );
}
