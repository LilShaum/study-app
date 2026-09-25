import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { RecallItem } from '@/lib/buildSessionItems';
import { gradeTyped, maskTerm, type Verdict } from '@/lib/typedAnswer';
import { DifficultyBadge } from './DifficultyBadge';
import { SourceNote } from './SourceNote';
import { FRAME, type ItemFrame } from './frame';

interface RecallCardProps {
  item: RecallItem;
  /** The grader's verdict, recorded once. */
  onAnswered?: (correct: boolean) => void;
  /** The student overruling that verdict: corrects the record, never adds to it. */
  onOverride?: (correct: boolean) => void;
  onNext?: () => void;
  /** True only for the one card in a study session. */
  keyboardEnabled?: boolean;
  frame?: ItemFrame;
}

/** What the verdict says, in the words a student needs to read next. */
function verdictLine(v: Verdict, term: string): string {
  switch (v.kind) {
    case 'exact':
      return `✓ Correct — ${term}`;
    case 'typo':
      // Accepted, but the right spelling is worth seeing once.
      return `✓ Accepted — it is spelled ${v.spelled}`;
    case 'confused':
      return `✗ That is ${v.with}. This one is ${term}.`;
    case 'wrong':
      return `✗ The answer is ${term}.`;
  }
}

/**
 * The meaning, and a line to write the word on.
 *
 * Production rather than recognition: nothing on screen contains the answer,
 * so the student has to pull it out of memory — the harder retrieval, and the
 * one that sticks. Grading is forgiving of typing and strict about meaning
 * (see typedAnswer.ts), and because no grader is perfect the verdict can be
 * overruled in one tap — which corrects the recorded attempt instead of
 * adding a second one.
 */
export function RecallCard({
  item,
  onAnswered,
  onOverride,
  onNext,
  keyboardEnabled = false,
  frame = 'card',
}: RecallCardProps) {
  const inputId = useId();
  const [typed, setTyped] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  /** What is recorded now — the verdict, or the student's override of it. */
  const [counted, setCounted] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // In a session the card is for typing, so the cursor starts on the line.
  useEffect(() => {
    if (keyboardEnabled) inputRef.current?.focus();
  }, [keyboardEnabled]);

  // Once graded, Enter should move on: focus goes to Next, where Enter lands.
  useEffect(() => {
    if (verdict) nextRef.current?.focus();
  }, [verdict]);

  const check = (e: FormEvent) => {
    e.preventDefault();
    if (verdict || !typed.trim()) return;
    const v = gradeTyped(typed, item.target, item.pool);
    setVerdict(v);
    setCounted(v.correct);
    onAnswered?.(v.correct);
  };

  const overrule = () => {
    if (counted === null) return;
    const next = !counted;
    setCounted(next);
    onOverride?.(next);
  };

  const term = item.target.term;
  const overruled = verdict !== null && counted !== verdict.correct;

  return (
    <div className={FRAME[frame]}>
      <div className="mark mb-3 flex items-center gap-2 text-text-3">
        Name the term
        <DifficultyBadge difficulty={item.difficulty} />
      </div>

      {/* Blanked where it names its own term, until answered: then shown whole. */}
      <p className="font-display text-heading text-text">
        {verdict ? item.target.definition : maskTerm(item.target.definition, item.target)}
      </p>

      <form onSubmit={check} className="mt-5 flex items-baseline gap-3">
        <label htmlFor={inputId} className="sr-only">
          The term
        </label>
        <input
          id={inputId}
          ref={inputRef}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          readOnly={verdict !== null}
          placeholder="Type the term"
          // A spellchecker would underline a wrong answer and autocorrect
          // would rewrite a right one: both are the device answering for you.
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          className={`field min-w-0 flex-1 text-body ${verdict ? (counted ? 'text-success' : 'text-error') : ''}`}
        />
        {!verdict && (
          <button type="submit" disabled={!typed.trim()} className="press press-ink tap-safe shrink-0">
            Check
          </button>
        )}
      </form>

      {verdict && (
        <div className="mt-4" aria-live="polite">
          {/* The verdict keeps its own colour when overruled: a green ✗ reads
              as a contradiction. What is counted shows in the answer line. */}
          <p className={`font-medium ${verdict.correct ? 'text-success' : 'text-error'}`}>{verdictLine(verdict, term)}</p>
          {overruled && (
            <p className="mt-1 text-small text-text-3">
              Counted as {counted ? 'right' : 'wrong'} — your call, not the grader&rsquo;s.
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {onNext && (
              // Hidden on a phone, where the Prev/Next bar below does the job
              // (see McqCard). On a desktop it stays: it is where Enter lands.
              <button ref={nextRef} type="button" onClick={onNext} className="press tap-safe hidden sm:inline-flex">
                Next
              </button>
            )}
            {/* The fallback for when the grader is wrong. One tap either way,
                and it can be flipped back; it corrects the attempt already
                recorded rather than recording another. */}
            <button type="button" onClick={overrule} className="press press-quiet tap-safe">
              {counted ? 'Count it as wrong' : 'I was right — count it'}
            </button>
          </div>
        </div>
      )}

      {verdict && <SourceNote excerpt={item.source_excerpt} />}
    </div>
  );
}
