import { useEffect, useRef } from 'react';

/** Where a card that is answered in steps is: the question, the answer showing, or "I don't know". */
export type CardStage = 'front' | 'back' | 'dont';

/**
 * Tells the session where a card is whenever that changes, so the line of
 * keys under it lists only the ones that work now. A ref keeps the effect off
 * the callback's identity.
 */
export function useReportStage(stage: CardStage, onStage?: (s: CardStage) => void) {
  const report = useRef(onStage);
  useEffect(() => {
    report.current = onStage;
  });
  useEffect(() => {
    report.current?.(stage);
  }, [stage]);
}
