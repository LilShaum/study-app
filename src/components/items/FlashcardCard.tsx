import { useId, useState } from 'react';
import type { FlashcardItem } from '@/schema/course';
import { Icon } from '@/components/Icon';
import { answerPoints, type AnswerPoints } from '@/lib/answerPoints';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { DifficultyBadge } from './DifficultyBadge';
import { SourceNote } from './SourceNote';

interface FlashcardCardProps {
  item: FlashcardItem;
  onGot?: () => void;
  onMissed?: () => void;
  /** Only true for the single card in a study session, never in Browse. */
  keyboardEnabled?: boolean;
  /** Learn: the passage opens after every answer, right or wrong (see SourceNote). */
  learning?: boolean;
}

const FACE = 'flip-face flex min-h-[220px] w-full flex-col items-center justify-center gap-4 text-center';

export function FlashcardCard(props: FlashcardCardProps) {
  const points = answerPoints(props.item);
  // Keyed, so ← → to another card starts it unflipped and unwritten.
  return points ? <WrittenCard key={props.item.id} {...props} answer={points} /> : <FlipCard key={props.item.id} {...props} />;
}

function FlipCard({ item, onGot, onMissed, keyboardEnabled = false, learning = false }: FlashcardCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  /** Said "I don't know": the answer shown, and it is a miss (the owner, 2026-10-26). */
  const [dontKnow, setDontKnow] = useState(false);

  const grade = (got: boolean) => {
    setFlipped(false);
    setHintShown(false);
    setDontKnow(false);
    if (got) onGot?.();
    else onMissed?.();
  };

  // Space flips; G/M grade once the answer is showing (grading blind would
  // record a result the user never actually checked).
  useKeyboardShortcuts((e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      setFlipped((f) => !f);
      return;
    }
    if (!flipped) return;
    if (dontKnow) {
      if (e.key === 'Enter') {
        e.preventDefault();
        grade(false);
      }
      return;
    }
    if (e.key === 'g' || e.key === 'G') {
      e.preventDefault();
      grade(true);
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      grade(false);
    }
  }, keyboardEnabled);

  return (
    <div className="rounded-sm border border-border-light border-t-text-3 border-t-2 bg-surface p-5 shadow sm:p-6">
      <div className="mark mb-4 flex items-center gap-2 border-b border-border-light pb-2 text-text-3">
        Flashcard
        <DifficultyBadge difficulty={item.difficulty} />
        {/* Space flips both ways on a keyboard; a phone had no way back
            after a mis-tap. In the header, not on the answer face, which
            takes its height from the question side and has no room to
            spare. Turning back cannot hide what was seen. */}
        {flipped && (
          <button type="button" onClick={() => setFlipped(false)} className="tap-safe ml-auto text-text-3 hover:text-text">
            Flip back
          </button>
        )}
      </div>

      <div className="flip-scene">
        <div className={`flip-card min-h-[220px] ${flipped ? 'is-flipped' : ''}`}>
          {/* Front */}
          <div className={FACE} aria-hidden={flipped}>
            <p className="font-display text-heading text-text">{item.front}</p>
            {/* A hint helps only before the answer is seen: offered here, on
                the front, for the student to ask for. It used to be printed
                on the back, under the answer it was meant to lead to. */}
            {item.hint &&
              (hintShown ? (
                <p className="flex items-center gap-1.5 text-sm text-text-2">
                  <Icon name="bulb" size={13} />
                  {item.hint}
                </p>
              ) : (
                <button
                  type="button"
                  tabIndex={flipped ? -1 : 0}
                  onClick={() => setHintShown(true)}
                  className="tap-safe text-sm text-text-3 underline-offset-4 hover:text-text hover:underline"
                >
                  Show a hint
                </button>
              ))}
            <button
              type="button"
              tabIndex={flipped ? -1 : 0}
              onClick={() => setFlipped(true)}
              className="press press-ink tap-safe"
            >
              Flip card
            </button>
            <button
              type="button"
              tabIndex={flipped ? -1 : 0}
              onClick={() => {
                setDontKnow(true);
                setFlipped(true);
              }}
              className="tap-safe text-small text-text-3 underline-offset-4 hover:text-text hover:underline"
            >
              I don&rsquo;t know
            </button>
          </div>

          {/* Back */}
          <div className={`${FACE} flip-face--back`} aria-hidden={!flipped}>
            {/* The question stays in view above its answer, to check the one
                against the other before saying whether you got it. */}
            <p className="text-small text-text-3">{item.front}</p>
            <p className="font-display text-heading text-text">{item.back}</p>
            {dontKnow ? (
              <div className="flex flex-col items-center gap-2">
                <p className="text-small text-text-3">Counted as missed, so it comes back sooner.</p>
                <button type="button" tabIndex={flipped ? 0 : -1} onClick={() => grade(false)} className="press press-ink tap-safe">
                  Next
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  tabIndex={flipped ? 0 : -1}
                  onClick={() => grade(true)}
                  className="press press-yes tap-safe"
                >
                  Got it
                </button>
                <button
                  type="button"
                  tabIndex={flipped ? 0 : -1}
                  onClick={() => grade(false)}
                  className="press press-no tap-safe"
                >
                  Missed it
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {flipped && <SourceNote excerpt={item.source_excerpt} open={learning || dontKnow} />}
    </div>
  );
}

/**
 * A short- or long-answer question (lib/answerPoints): write the answer,
 * then tick each point of the model answer it made. Got it only with every
 * point, as full marks; the student sees which points were missing. Writing
 * is optional, for a phone on a bus: the points are ticked against what
 * would have been said.
 */
function WrittenCard({
  item,
  answer,
  onGot,
  onMissed,
  keyboardEnabled = false,
  learning = false,
}: FlashcardCardProps & { answer: AnswerPoints }) {
  const [written, setWritten] = useState('');
  const [shown, setShown] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [ticked, setTicked] = useState<boolean[]>(() => answer.points.map(() => false));
  /** Said "I don't know": the model answer shown, nothing to tick, a miss. */
  const [dontKnow, setDontKnow] = useState(false);
  const fieldId = useId();
  const one = answer.points.length === 1;
  // "Name three" of five listed: three is full marks (lib/answerPoints need).
  const need = answer.need;
  const some = need < answer.points.length;
  const made = ticked.filter(Boolean).length;

  const grade = (got: boolean) => {
    setWritten('');
    setShown(false);
    setHintShown(false);
    setTicked(answer.points.map(() => false));
    setDontKnow(false);
    if (got) onGot?.();
    else onMissed?.();
  };
  const toggle = (k: number) => setTicked((t) => t.map((v, i) => (i === k ? !v : v)));

  // Outside the box (lib/useKeyboardShortcuts): Space shows the answer, a
  // number ticks that point, Enter is Done.
  useKeyboardShortcuts((e) => {
    if (!shown) {
      if (e.code === 'Space') {
        e.preventDefault();
        setShown(true);
      }
      return;
    }
    if (dontKnow) {
      if (e.key === 'Enter') {
        e.preventDefault();
        grade(false);
      }
      return;
    }
    const k = Number(e.key) - 1;
    if (!one && k >= 0 && k < answer.points.length) {
      e.preventDefault();
      toggle(k);
    } else if (!one && e.key === 'Enter') {
      e.preventDefault();
      grade(made >= need);
    } else if (one && (e.key === 'g' || e.key === 'G' || e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      grade(e.key.toLowerCase() === 'g');
    }
  }, keyboardEnabled);

  return (
    <div className="rounded-sm border border-border-light border-t-text-3 border-t-2 bg-surface p-5 shadow sm:p-6">
      <div className="mark mb-4 flex items-center gap-2 border-b border-border-light pb-2 text-text-3">
        Write the answer
        <DifficultyBadge difficulty={item.difficulty} />
      </div>

      {!shown ? (
        <div>
          <p className="font-display text-heading text-text">{item.front}</p>
          {item.hint &&
            (hintShown ? (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-text-2">
                <Icon name="bulb" size={13} />
                {item.hint}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setHintShown(true)}
                className="tap-safe mt-3 text-sm text-text-3 underline-offset-4 hover:text-text hover:underline"
              >
                Show a hint
              </button>
            ))}
          <label htmlFor={fieldId} className="sr-only">
            Your answer
          </label>
          <textarea
            id={fieldId}
            value={written}
            onChange={(e) => setWritten(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setShown(true);
              }
            }}
            rows={5}
            placeholder="Write it as you would in the exam, or answer in your head"
            className="field mt-4 block w-full resize-y text-body"
          />
          <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <button type="button" onClick={() => setShown(true)} className="press press-ink tap-safe">
              Show the answer
            </button>
            <button
              type="button"
              onClick={() => {
                setDontKnow(true);
                setShown(true);
              }}
              className="tap-safe text-small text-text-3 underline-offset-4 hover:text-text hover:underline"
            >
              I don&rsquo;t know
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-small text-text-3">{item.front}</p>
          {written.trim() && (
            <div className="mt-3 border-l-2 border-border-strong pl-3">
              <p className="mark text-text-3">You wrote</p>
              <p className="mt-1 whitespace-pre-wrap text-small text-text-2">{written.trim()}</p>
            </div>
          )}
          {answer.lead && <p className="mt-4 text-body text-text">{answer.lead}</p>}
          {dontKnow ? (
            <>
              {one ? (
                <p className="mt-4 font-display text-heading text-text">{answer.points[0]}</p>
              ) : (
                <>
                  <p className="mark mt-4 text-text-3">
                    The points to make{some && ` (any ${need} of these ${answer.points.length})`}
                  </p>
                  <ol className="mt-1 border-y border-border">
                    {answer.points.map((point, k) => (
                      <li key={k} className="flex gap-3 border-b border-border py-2.5 text-body text-text last:border-b-0">
                        <span className="shrink-0 tabular-nums text-text-3">{k + 1}.</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
              <div className="mt-5 flex flex-wrap items-baseline gap-3">
                <button type="button" onClick={() => grade(false)} className="press press-ink tap-safe">
                  Next
                </button>
                <span className="text-small text-text-3">Counted as missed, so it comes back sooner.</span>
              </div>
            </>
          ) : one ? (
            <>
              <p className="mt-4 font-display text-heading text-text">{answer.points[0]}</p>
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={() => grade(true)} className="press press-yes tap-safe">
                  Got it
                </button>
                <button type="button" onClick={() => grade(false)} className="press press-no tap-safe">
                  Missed it
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mark mt-4 text-text-3">
                {written.trim() ? 'Tick each point you made' : 'Tick each point you would have made'}
                {some && ` (any ${need} of these ${answer.points.length})`}
              </p>
              <ul className="mt-1 border-y border-border">
                {answer.points.map((point, k) => (
                  <li key={k} className="border-b border-border last:border-b-0">
                    <label className="flex cursor-pointer items-start gap-3 py-2.5 text-body text-text">
                      <input
                        type="checkbox"
                        checked={!!ticked[k]}
                        onChange={() => toggle(k)}
                        className="tap-safe mt-1.5 shrink-0 accent-accent"
                      />
                      <span>{point}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap items-baseline gap-3">
                <button
                  type="button"
                  onClick={() => grade(made >= need)}
                  className={`press tap-safe ${made >= need ? 'press-yes' : 'press-ink'}`}
                >
                  Done: {Math.min(made, need)} of {need}
                </button>
                <span className="text-small text-text-3">
                  {made >= need ? (some ? `${need} of them: counted as got it.` : 'Every point: counted as got it.') : 'Short of full marks, it comes back sooner.'}
                </span>
              </div>
            </>
          )}
          <SourceNote excerpt={item.source_excerpt} open={learning || dontKnow} />
        </div>
      )}
    </div>
  );
}
