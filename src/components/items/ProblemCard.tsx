import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { ProblemItem } from '@/schema/course';
import { answerKind, checkAnswer, shownAnswer, unitOf, type ProblemVerdict } from '@/lib/problemAnswer';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { DifficultyBadge } from './DifficultyBadge';
import { SourceNote } from './SourceNote';
import { CodeBlock, RichText } from './RichText';
import { FRAME, type ItemFrame } from './frame';

interface ProblemCardProps {
  item: ProblemItem;
  /** A checked answer's verdict, recorded once; right with a step shown is a miss. */
  onAnswered?: (correct: boolean) => void;
  /** The student overruling the checker: corrects the record, never adds to it. */
  onOverride?: (correct: boolean) => void;
  /** A problem checked against its steps: graded by the steps ticked, then on to the next card. */
  onGot?: () => void;
  onMissed?: () => void;
  onNext?: () => void;
  /** True only for the one card in a study session. */
  keyboardEnabled?: boolean;
  frame?: ItemFrame;
  /** Learn: the passage opens after every answer (see SourceNote). */
  learning?: boolean;
}

/** The worked steps, numbered: as many as `upTo`, all of them by default. */
export function SolutionSteps({ steps, upTo = steps.length }: { steps: string[]; upTo?: number }) {
  return (
    <ol className="mt-1 border-y border-border">
      {steps.slice(0, upTo).map((step, k) => (
        <li key={k} className="flex gap-3 border-b border-border py-2.5 text-body text-text last:border-b-0">
          <span className="shrink-0 tabular-nums text-text-3">{k + 1}.</span>
          <span className="min-w-0">
            <RichText text={step} />
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * A problem to work out (schema: ProblemItem), the way an exam sets one.
 *
 * The student works it, on paper or here, then types the answer: a number
 * or a short exact answer is checked (lib/problemAnswer), anything else is
 * checked against the worked steps, ticked like a written answer's points.
 * Stuck, the steps come one at a time: a worked solution that fades in on
 * request, so the student does as much of it as they can (docs/evidence.md,
 * worked examples). Right with a step shown counts as not yet: it comes back
 * sooner, to do alone. A wrong answer that a known mistake leads to says
 * which mistake. The whole solution and the method come after every answer.
 */
export function ProblemCard({
  item,
  onAnswered,
  onOverride,
  onGot,
  onMissed,
  onNext,
  keyboardEnabled = false,
  frame = 'card',
  learning = false,
}: ProblemCardProps) {
  const kind = answerKind(item);
  const steps = item.steps ?? [];
  const unit = kind === 'number' ? unitOf(item) : '';
  // Code to read or write: the working is code too, set in the code face.
  const codey = !!item.code?.trim() || item.question.includes('`');
  const fieldId = useId();
  const [typed, setTyped] = useState('');
  /** Steps shown before answering, as hints. */
  const [hints, setHints] = useState(0);
  const [verdict, setVerdict] = useState<ProblemVerdict | null>(null);
  /** What is recorded: the verdict, or the student's overrule of it. */
  const [counted, setCounted] = useState<boolean | null>(null);
  const [dontKnow, setDontKnow] = useState(false);
  /** Checked against the steps: the solution is showing. */
  const [shown, setShown] = useState(false);
  const [ticked, setTicked] = useState<boolean[]>(() => steps.map(() => false));
  const [nudge, setNudge] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const answered = verdict !== null || dontKnow || shown;
  // The last step usually is the answer: never offered as a hint.
  const canHint = !answered && hints < steps.length - 1;

  // On a keyboard the cursor starts on the answer line. Not on a phone,
  // where the keyboard would cover the problem before it is read.
  useEffect(() => {
    if (keyboardEnabled && kind !== 'self' && window.matchMedia?.('(pointer: fine)').matches) inputRef.current?.focus();
  }, [keyboardEnabled, kind]);

  // Once checked, Enter moves on (see RecallCard).
  useEffect(() => {
    if (verdict === null && !dontKnow) return;
    if (nextRef.current?.offsetParent) nextRef.current.focus();
    else inputRef.current?.blur();
  }, [verdict, dontKnow]);

  const check = (e: FormEvent) => {
    e.preventDefault();
    if (answered) return;
    const v = checkAnswer(item, typed);
    if (!v) {
      setNudge(true);
      return;
    }
    const got = v.right && hints === 0;
    setVerdict(v);
    setCounted(got);
    onAnswered?.(got);
  };

  const giveUp = () => {
    if (answered) return;
    setDontKnow(true);
    if (kind !== 'self') {
      setCounted(false);
      onAnswered?.(false);
    }
  };

  const overrule = () => {
    if (counted === null) return;
    const next = !counted;
    setCounted(next);
    onOverride?.(next);
  };

  /** Checked against the steps: every step for full marks, none of them shown first. */
  const grade = (got: boolean) => {
    if (got) onGot?.();
    else onMissed?.();
  };
  const made = ticked.filter(Boolean).length;
  const full = hints === 0 && made === steps.length;
  const toggle = (k: number) => setTicked((t) => t.map((v, i) => (i === k ? !v : v)));

  useKeyboardShortcuts((e) => {
    if (kind === 'self' && !shown && !dontKnow) {
      if (e.code === 'Space') {
        e.preventDefault();
        setShown(true);
      }
      return;
    }
    if (kind !== 'self') return;
    // Checked against the steps: a number ticks that step, Enter is Done.
    if (e.key === 'Enter') {
      e.preventDefault();
      grade(!dontKnow && full);
      return;
    }
    const k = Number(e.key) - 1;
    if (!dontKnow && hints === 0 && k >= 0 && k < steps.length) {
      e.preventDefault();
      toggle(k);
    }
  }, keyboardEnabled);

  const shownAs = shownAnswer(item);
  const overruled = verdict !== null && counted !== (verdict.right && hints === 0);

  return (
    <div className={FRAME[frame]}>
      <div className="mark mb-3 flex items-center gap-2 text-text-3">
        Work it out
        <DifficultyBadge difficulty={item.difficulty} />
      </div>

      <p className="font-display text-heading text-text">
        <RichText text={item.question} />
      </p>
      {item.code?.trim() && <CodeBlock code={item.code} />}

      {/* Steps asked for while stuck, above the answer they lead to. */}
      {hints > 0 && !answered && (
        <div className="mt-4">
          <p className="mark text-text-3">{hints === 1 ? 'The first step' : `The first ${hints} steps`}</p>
          <SolutionSteps steps={steps} upTo={hints} />
        </div>
      )}

      {kind !== 'self' ? (
        <form onSubmit={check} className="mt-5 flex items-baseline gap-3">
          <label htmlFor={fieldId} className="sr-only">
            Your answer{unit ? `, in ${unit}` : ''}
          </label>
          <input
            id={fieldId}
            ref={inputRef}
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              setNudge(false);
            }}
            readOnly={answered}
            placeholder="Your answer"
            // The device must not answer for the student (see RecallCard).
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            autoComplete="off"
            className={`field min-w-0 flex-1 text-body ${counted === null ? '' : counted ? 'text-success' : 'text-error'}`}
          />
          {unit && <span className="shrink-0 text-body text-text-2">{unit}</span>}
          {!answered && (
            <button type="submit" disabled={!typed.trim()} className="press press-ink tap-safe shrink-0">
              Check
            </button>
          )}
        </form>
      ) : (
        !answered && (
          <>
            <label htmlFor={fieldId} className="sr-only">
              Your working
            </label>
            <textarea
              id={fieldId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  setShown(true);
                }
              }}
              rows={4}
              placeholder="Work it out here, or on paper"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              className={`field mt-4 block w-full resize-y ${codey ? 'font-mono text-small' : 'text-body'}`}
            />
            <button type="button" onClick={() => setShown(true)} className="press press-ink tap-safe mt-4">
              Show the solution
            </button>
          </>
        )
      )}
      {nudge && !answered && (
        <p className="mt-2 text-small text-text-3" role="status">
          Type the answer as a number{unit ? `, in ${unit}` : ''}.
        </p>
      )}
      {!answered && (
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          {canHint && (
            <button
              type="button"
              onClick={() => setHints((h) => h + 1)}
              className="tap-safe text-small text-text-3 underline-offset-4 hover:text-text hover:underline"
            >
              {hints === 0 ? 'Stuck? Show the first step' : 'Show the next step'}
            </button>
          )}
          <button type="button" onClick={giveUp} className="tap-safe text-small text-text-3 underline-offset-4 hover:text-text hover:underline">
            I don&rsquo;t know
          </button>
        </div>
      )}

      {answered && (
        <div className="mt-4" aria-live="polite">
          {kind !== 'self' && (
            <>
              {/* The verdict keeps its own colour when overruled (see RecallCard). */}
              <p className={`font-medium ${dontKnow ? 'text-text' : verdict?.right ? 'text-success' : 'text-error'}`}>
                {dontKnow
                  ? `The answer is ${shownAs}.`
                  : verdict?.right
                    ? hints === 0
                      ? `✓ Right: ${shownAs}.`
                      : `✓ Right, with ${hints === 1 ? 'a step' : `${hints} steps`} shown.`
                    : `✗ Not this time: the answer is ${shownAs}.`}
              </p>
              {verdict?.mistake && (
                <p className="mt-2 text-small text-text-2">
                  <span className="font-semibold text-text">Where that answer comes from: </span>
                  <RichText text={verdict.mistake} />
                </p>
              )}
              {verdict?.right && hints > 0 && (
                <p className="mt-1 text-small text-text-3">With help it counts as not yet: it comes back soon, to do on your own.</p>
              )}
              {overruled && (
                <p className="mt-1 text-small text-text-3">
                  Counted as {counted ? 'right' : 'wrong'}. Your call, not the checker&rsquo;s.
                </p>
              )}
            </>
          )}

          {kind === 'self' && typed.trim() && (
            <div className="mb-4 border-l-2 border-border-strong pl-3">
              <p className="mark text-text-3">You wrote</p>
              <p className={`mt-1 whitespace-pre-wrap text-small text-text-2 ${codey ? 'font-mono' : ''}`}>{typed.trim()}</p>
            </div>
          )}

          {kind === 'self' && !dontKnow && hints === 0 ? (
            <>
              <p className="mark text-text-3">{typed.trim() ? 'Tick each step your work got right' : 'Tick each step you would have got right'}</p>
              <ul className="mt-1 border-y border-border">
                {steps.map((step, k) => (
                  <li key={k} className="border-b border-border last:border-b-0">
                    <label className="flex cursor-pointer items-start gap-3 py-2.5 text-body text-text">
                      <input type="checkbox" checked={!!ticked[k]} onChange={() => toggle(k)} className="tap-safe mt-1.5 shrink-0 accent-accent" />
                      <span className="min-w-0">
                        <RichText text={step} />
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className={`mark text-text-3 ${kind === 'self' ? '' : 'mt-4'}`}>The solution</p>
              <SolutionSteps steps={steps} />
            </>
          )}

          {item.takeaway?.trim() && (
            <p className="mt-3 text-small text-text-2">
              <span className="font-semibold text-text">The method: </span>
              <RichText text={item.takeaway} />
            </p>
          )}

          {kind === 'self' ? (
            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              {dontKnow || hints > 0 ? (
                <>
                  <button type="button" onClick={() => grade(false)} className="press press-ink tap-safe">
                    Next
                  </button>
                  <span className="text-small text-text-3">
                    {dontKnow ? 'Counted as missed, so it comes back sooner.' : 'With a step shown it counts as not yet: it comes back soon, to do on your own.'}
                  </span>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => grade(full)} className={`press tap-safe ${full ? 'press-yes' : 'press-ink'}`}>
                    Done: {made} of {steps.length}
                  </button>
                  <span className="text-small text-text-3">
                    {full ? 'Every step: counted as got it.' : 'Short of every step, it comes back sooner.'}
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {onNext && (
                // Hidden on a phone, where the bar below has Next (see RecallCard).
                <button ref={nextRef} type="button" onClick={onNext} className="press tap-safe hidden sm:inline-flex">
                  Next
                </button>
              )}
              {/* For when the checker is wrong: a right answer typed another way.
                  Not after help: that is not the checker's call. */}
              {!dontKnow && !(verdict?.right && hints > 0) && (
                <button type="button" onClick={overrule} className="press press-quiet tap-safe">
                  {counted ? 'Count it as wrong' : 'I was right, count it'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {answered && <SourceNote excerpt={item.source_excerpt} open={learning || dontKnow || counted === false} />}
    </div>
  );
}
