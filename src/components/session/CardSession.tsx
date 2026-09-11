import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Course } from '@/schema/course';
import type { StudyMode } from '@/lib/buildSessionItems';
import { useSessionStore } from '@/store/session';
import { Icon } from '@/components/Icon';
import { ItemRenderer } from '@/components/items/ItemRenderer';

type CardMode = Exclude<StudyMode, 'browse'>;

interface CardSessionProps {
  courseId: string;
  course: Course;
  mode: CardMode;
}

const MODE_LABELS: Record<CardMode, string> = {
  quiz: 'Quiz',
  flashcards: 'Flashcards',
  definitions: 'Definitions',
  mixed: 'Mixed',
  missed: 'Review Missed',
};

const EMPTY_COPY: Record<CardMode, { title: string; text: string }> = {
  quiz: { title: 'No MCQ items', text: "This course doesn't have any MCQ items yet. Try Browse or Mixed mode." },
  flashcards: {
    title: 'No Flashcard items',
    text: "This course doesn't have any Flashcard items yet. Try Browse or Mixed mode.",
  },
  definitions: {
    title: 'No Definition items',
    text: "This course doesn't have any Definition items yet. Try Browse or Mixed mode.",
  },
  mixed: { title: 'No items', text: 'This course has no items yet.' },
  missed: {
    title: 'Nothing to review',
    text:
      "You haven't missed anything yet — or you've already nailed it on a retry. Study some Quiz or Flashcards to build up practice history.",
  },
};

/** "quiz" / "flashcards" / "definitions" / "mixed" / "missed" — one item at a time. */
export function CardSession({ courseId, course, mode }: CardSessionProps) {
  const [finished, setFinished] = useState(false);
  const init = useSessionStore((s) => s.init);
  const items = useSessionStore((s) => s.items);
  const index = useSessionStore((s) => s.index);
  const score = useSessionStore((s) => s.score);
  const current = useSessionStore((s) => s.current());
  const total = useSessionStore((s) => s.total());
  const hasNext = useSessionStore((s) => s.hasNext());
  const hasPrev = useSessionStore((s) => s.hasPrev());
  const next = useSessionStore((s) => s.next);
  const prev = useSessionStore((s) => s.prev);
  const record = useSessionStore((s) => s.record);

  useEffect(() => {
    setFinished(false);
    init(courseId, course, mode);
  }, [courseId, course, mode, init]);

  const restart = () => {
    init(courseId, course, mode);
    setFinished(false);
  };

  const handleNext = () => {
    if (next()) return;
    setFinished(true);
  };

  if (total === 0) {
    const copy = EMPTY_COPY[mode];
    return (
      <div className="mx-auto max-w-2xl p-10 text-center">
        <Link to={`/study/${courseId}`} className="text-sm text-text-2 hover:text-text">
          ← Back
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-text">{copy.title}</h1>
        <p className="mt-2 text-text-2">{copy.text}</p>
        <Link
          to={`/study/${courseId}`}
          className="mt-4 inline-block rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Back to Course
        </Link>
      </div>
    );
  }

  if (finished) {
    const attempted = score.got + score.missed;
    const pct = attempted > 0 ? Math.round((score.got / attempted) * 100) : 100;
    return (
      <div className="mx-auto max-w-2xl p-10 text-center">
        <div className="flex justify-center text-success">
          <Icon name="check-circle" size={40} />
        </div>
        <h1 className="mt-3 text-xl font-semibold text-text">Session Complete!</h1>
        <div className="mt-3 flex justify-center gap-4 text-sm">
          <span className="text-success">{score.got} Correct</span>
          <span className="text-error">{score.missed} Missed</span>
          {attempted > 0 && <span className="text-text-2">{pct}% Accuracy</span>}
        </div>
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={restart}
            className="rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Study Again
          </button>
          <Link
            to={`/study/${courseId}`}
            className="rounded border border-border px-4 py-2 text-sm text-text-2 hover:text-text"
          >
            Back to Course
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link to={`/study/${courseId}`} className="text-sm text-text-2 hover:text-text">
          ← Back
        </Link>
        <span className="rounded-full bg-accent-light px-2.5 py-0.5 text-xs font-medium text-accent">
          {MODE_LABELS[mode]}
        </span>
        <div className="flex gap-3 text-sm">
          <span className="text-success">✓ {score.got}</span>
          <span className="text-error">✗ {score.missed}</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="h-1.5 w-full rounded-full bg-border">
          <div
            className="h-1.5 rounded-full bg-accent transition-all"
            style={{ width: `${((index + 1) / items.length) * 100}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-text-3">
          {index + 1} / {items.length}
        </div>
      </div>

      {current && (
        <ItemRenderer
          key={current.id}
          item={current}
          revealMode={mode === 'definitions'}
          onAnswered={record}
          // Grading a flashcard also advances it, as the vanilla app did —
          // otherwise the card just flips back and looks like nothing happened.
          onGot={() => {
            record(true);
            handleNext();
          }}
          onMissed={() => {
            record(false);
            handleNext();
          }}
          onNext={handleNext}
        />
      )}

      <div className="mt-4 flex justify-between">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={prev}
          className="rounded border border-border px-4 py-1.5 text-sm text-text-2 hover:text-text disabled:opacity-40"
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="rounded border border-border px-4 py-1.5 text-sm text-text-2 hover:text-text"
        >
          {hasNext ? 'Next →' : 'Finish'}
        </button>
      </div>
    </div>
  );
}
