import { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progress';
import { buildSessionItems, type CardKind, type StudyMode } from '@/lib/buildSessionItems';
import { examRule } from '@/lib/exam';
import { sortedSections } from '@/lib/sortedSections';

type Cards = 'due' | 'weakest' | 'missed' | 'everything';
type Kind = 'all' | CardKind;

const CARDS: { value: Cards; label: string }[] = [
  { value: 'due', label: 'Due now' },
  { value: 'weakest', label: 'Weakest first' },
  { value: 'missed', label: 'Missed last time' },
  { value: 'everything', label: 'Everything' },
];

const KINDS: { value: Kind; label: string }[] = [
  { value: 'all', label: 'All kinds' },
  { value: 'questions', label: 'Questions' },
  { value: 'flashcards', label: 'Flashcards' },
  { value: 'terms', label: 'Terms' },
];

/**
 * The session a choice opens. Everything is the format-based modes (a
 * whole-lecture shuffle, or just one kind); the others are the memory-based
 * modes, narrowed to a kind with `?kind=`.
 */
function sessionFor(cards: Cards, kind: Kind): { mode: StudyMode; kind?: CardKind } {
  if (cards === 'everything') {
    return { mode: { all: 'mixed', questions: 'quiz', flashcards: 'flashcards', terms: 'definitions' }[kind] as StudyMode };
  }
  return { mode: cards === 'due' ? 'review' : cards, kind: kind === 'all' ? undefined : kind };
}

/**
 * "/study/:id/practice?section=<id>" — drill a lecture outside the plan.
 *
 * It replaces six format-named modes on the course page (Quiz, Flashcards,
 * Terms, Mixed, Weakest first, Review missed) and the separate Review row.
 * They were one question asked six ways: which cards, of which kind, from
 * where. Here each is a choice of its own, with how many cards it would give.
 */
export function PracticeRoute() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const course = useCoursesStore((s) => (id ? s.courses[id] : undefined));
  const progress = useProgressStore((s) => (id ? s.getProgress(id) : EMPTY_PROGRESS));
  // Judged as of opening the page; rendering must not read the clock.
  const [now] = useState(Date.now);
  const sections = useMemo(() => (course ? sortedSections(course) : []), [course]);

  const asked = params.get('section');
  const [section, setSection] = useState(() => (asked && sections.some((s) => s.id === asked) ? asked : ''));
  // Null until chosen: the default depends on what is due, so it is worked out below.
  const [pickedCards, setPickedCards] = useState<Cards | null>(null);
  const [pickedKind, setPickedKind] = useState<Kind>('all');

  // How many cards each combination would give, by the call the session makes.
  const counts = useMemo(() => {
    const out = {} as Record<Cards, Record<Kind, number>>;
    if (!course || !id) return out;
    const exam = examRule(course, progress, now);
    const missedIds = useProgressStore.getState().missedIds(id);
    for (const { value: cards } of CARDS) {
      out[cards] = {} as Record<Kind, number>;
      for (const { value: kind } of KINDS) {
        const s = sessionFor(cards, kind);
        out[cards][kind] = buildSessionItems(course, s.mode, {
          progress,
          now,
          exam,
          // Unlimited minutes is how the app counts everything due.
          minutes: Infinity,
          sectionId: section || undefined,
          kind: s.kind,
          missedIds,
        }).filter((i) => i.type === 'mcq' || i.type === 'flashcard' || i.type === 'recall').length;
      }
    }
    return out;
  }, [course, id, progress, now, section]);

  if (!id) return <Navigate to="/" replace />;
  if (!course) {
    return (
      <div className="py-6 text-center text-text-2">
        Lecture not found.{' '}
        <Link to="/" className="text-accent hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  // A choice that has run out of cards (another choice changed under it)
  // gives way. Cards first: the one picked, else Due now, else Weakest first,
  // else whatever has cards. Then the kind falls back to All kinds.
  const cards: Cards =
    (pickedCards ? [pickedCards] : []).concat(['due', 'weakest', 'everything', 'missed']).find((c) => counts[c][pickedKind] > 0) ??
    'weakest';
  const kind: Kind = counts[cards][pickedKind] > 0 ? pickedKind : 'all';
  const n = counts[cards][kind];

  const go = sessionFor(cards, kind);
  const query = new URLSearchParams();
  if (section) query.set('section', section);
  if (go.kind) query.set('kind', go.kind);
  const qs = query.toString();
  const to = `/session/${id}/${go.mode}${qs ? `?${qs}` : ''}`;

  return (
    <div>
      <Link to={`/study/${id}`} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
        ← {course.metadata.title}
      </Link>
      <h1 className="mt-4 font-display text-display font-semibold text-text">Practice</h1>
      <p className="mt-2 max-w-prose text-small text-text-2">
        Drill this lecture outside the plan: before a class quiz, or a section that feels shaky. Today still decides
        what comes back when; a card that is not fading yet gains little from more practice.
      </p>

      <div className="mt-6 space-y-5 border-y border-border py-5">
        <Choices
          label="Cards"
          choices={CARDS.map((c) => ({ ...c, count: counts[c.value][kind] }))}
          value={cards}
          onPick={(v) => setPickedCards(v)}
        />
        <Choices
          label="Kind"
          choices={KINDS.map((k) => ({ ...k, count: counts[cards][k.value] }))}
          value={kind}
          onPick={(v) => setPickedKind(v)}
        />
        <div className="flex flex-col gap-y-1 sm:flex-row sm:items-baseline sm:gap-x-3">
          <span className="mark shrink-0 text-text-3 sm:w-16">From</span>
          <label className="min-w-0 sm:max-w-sm sm:flex-1">
            <span className="sr-only">Section</span>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="field tap-safe w-full truncate text-small text-text-2"
            >
              <option value="">The whole lecture</option>
              {sections.map((s, i) => (
                <option key={s.id} value={s.id}>
                  {i + 1}. {s.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6">
        {n > 0 ? (
          <Link to={to} className="press press-ink tap-safe">
            Start
          </Link>
        ) : (
          <p className="text-small text-text-3">Nothing to practise here yet.</p>
        )}
      </div>
    </div>
  );
}

/**
 * A row of choices set like the library's Classes and Tags: the label in small
 * caps, the choice picked underscored rather than filled, a middle dot between.
 * A choice with no cards is quiet and cannot be picked. On a phone the label
 * sits above its choices, as the View and Lecture rows on the course page do.
 */
function Choices<T extends string>({
  label,
  choices,
  value,
  onPick,
}: {
  label: string;
  choices: { value: T; label: string; count: number }[];
  value: T;
  onPick: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-y-1 sm:flex-row sm:items-baseline sm:gap-x-3">
      <span className="mark shrink-0 text-text-3 sm:w-16">{label}</span>
      <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
        {choices.map((c, i) => {
          const active = c.value === value;
          const empty = c.count === 0;
          return (
            <span key={c.value} className="flex items-baseline">
              <button
                type="button"
                disabled={empty}
                aria-pressed={active}
                onClick={() => onPick(c.value)}
                className={`group tap-safe px-0.5 text-small transition-colors ${
                  empty ? 'cursor-default text-text-3' : active ? 'text-accent' : 'text-text-2 hover:text-text'
                }`}
              >
                {/* The label carries the underline, so the count beside it stays plain. */}
                <span
                  className={
                    empty
                      ? ''
                      : active
                        ? 'underline decoration-accent decoration-2 underline-offset-4'
                        : 'group-hover:underline group-hover:underline-offset-4'
                  }
                >
                  {c.label}
                </span>
                <span className="ml-1.5 text-xs tabular-nums text-text-3">{c.count}</span>
              </button>
              {i < choices.length - 1 && <span className="ml-1 text-text-3">·</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}
