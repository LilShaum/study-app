import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useCoursesStore } from '@/store/courses';
import { EMPTY_PROGRESS, useProgressStore, type ItemResult } from '@/store/progress';
import { sortedSections } from '@/lib/sortedSections';
import { testPool } from '@/lib/practiceTest';
import { classOf, lectureName, lecturesOf } from '@/lib/classExams';
import { onlyStudies, studiesIn } from '@/lib/studies';
import { choiceLink, examSoon } from '@/lib/practice';
import {
  kindOfItem,
  kindsIn,
  ORDERS,
  PRACTICE_KINDS,
  sectionsFor,
  WHICH,
  whichOf,
  type Order,
  type PracticeChoice,
  type PracticeKind,
  type Which,
} from '@/lib/practiceChoice';
import { buildSessionItems, type SessionItem } from '@/lib/buildSessionItems';
import { examRule } from '@/lib/exam';
import { isDueFor } from '@/lib/memory';
import { roman } from '@/lib/roman';
import type { Course } from '@/schema/course';

const ALL_WHICH: Which[] = WHICH.map((w) => w.value);

/** What the page remembers per lecture and per class. */
interface Saved {
  kinds: PracticeKind[];
  which: Which[];
  order: Order;
  /** A class's order, and whether an exam was close when it was picked: mixing is the exam-week default. */
  nearExam?: boolean;
  where?: PracticeChoice['where'];
  study?: string | null;
}

const savedKey = (scope: string) => `arborous:practice-built:${scope}`;

function loadSaved(scope: string): Saved | null {
  try {
    const raw = localStorage.getItem(savedKey(scope));
    const v = raw ? (JSON.parse(raw) as Partial<Saved>) : null;
    if (!v || typeof v !== 'object') return null;
    const kinds = (Array.isArray(v.kinds) ? v.kinds : []).filter((k): k is PracticeKind => PRACTICE_KINDS.some((p) => p.value === k));
    const which = (Array.isArray(v.which) ? v.which : []).filter((w): w is Which => ALL_WHICH.includes(w as Which));
    const order = ORDERS.some((o) => o.value === v.order) ? (v.order as Order) : 'mixed';
    return {
      kinds,
      which,
      order,
      nearExam: !!v.nearExam,
      where: v.where && typeof v.where === 'object' ? v.where : undefined,
      study: typeof v.study === 'string' ? v.study : null,
    };
  } catch {
    return null;
  }
}

/** One lecture's cards for a choice, by the call the session makes. */
function itemsFor(
  courseId: string,
  course: Course,
  choice: PracticeChoice,
  progress: Record<string, ItemResult>,
  missedIds: ReadonlySet<string>,
  now: number,
): SessionItem[] {
  const sectionIds = sectionsFor(choice, courseId);
  if (sectionIds && !sectionIds.size) return [];
  const onlyIds = onlyStudies(course, choice.study ?? null);
  if (onlyIds?.size === 0) return [];
  return buildSessionItems(course, 'practice', {
    progress,
    now,
    exam: examRule(course, progress, now),
    missedIds,
    onlyIds,
    practice: { kinds: new Set(choice.kinds), which: new Set(choice.which), order: 'inorder', sectionIds },
  });
}

/**
 * "/study/:id/practice?section=<id>" and "/class/:code/practice": study what
 * you choose, the way you choose, each answer marked as it is given
 * (docs/proposals/practice.md).
 *
 * Ready-made sittings on top, one tap each; below, the sitting built by
 * hand: which kinds of card, which cards (due, mistakes, new, already
 * strong), from which sections of which lectures, in what order. Kinds,
 * cards and sections are ticks, since they combine (the owner, 2026-11-03:
 * "boxes to tick … tick off specifically which sections to do or not");
 * the order is one of three. Start sits at the bottom of the screen with
 * the number of cards it gives, so every tick shows its effect.
 *
 * The practice test is the other door: the exam rehearsal.
 */
export function PracticeRoute() {
  const { id, code } = useParams<{ id?: string; code?: string }>();
  // A fresh page for each lecture and class, so one's choices never carry to the other.
  return <PracticePage key={id ? `lecture:${id}` : `class:${code ?? ''}`} />;
}

function PracticePage() {
  const { id, code } = useParams<{ id?: string; code?: string }>();
  const [params] = useSearchParams();
  const courses = useCoursesStore((s) => s.courses);
  const byCourse = useProgressStore((s) => s.byCourse);
  // Judged as of opening the page; rendering must not read the clock.
  const [now] = useState(Date.now);

  const course = id ? courses[id] : undefined;
  const lectures = useMemo<[string, Course][]>(
    () => (id ? (course ? [[id, course]] : []) : code ? lecturesOf(courses, code) : []),
    [id, code, course, courses],
  );
  const scope = id ? `lecture:${id}` : `class:${code ?? ''}`;
  const present = useMemo(() => kindsIn(lectures.map(([, c]) => c)), [lectures]);
  const studies = useMemo(
    () => lectures.flatMap(([courseId, c]) => studiesIn(c).map((s) => ({ ...s, courseId, lecture: lectureName(c.metadata.title, code) }))),
    [lectures, code],
  );
  const soon = useMemo(() => (id ? null : examSoon(lectures, now)), [id, lectures, now]);

  const [saved] = useState(() => loadSaved(scope));
  // Written answers are slow and asked for on purpose: ticked only by the student.
  const [kinds, setKinds] = useState<PracticeKind[]>(() => {
    const kept = saved?.kinds.filter((k) => present.includes(k)) ?? [];
    return kept.length ? kept : present.filter((k) => k !== 'written').length ? present.filter((k) => k !== 'written') : present;
  });
  const [which, setWhich] = useState<Which[]>(() => (saved?.which.length ? saved.which : ALL_WHICH));
  // A class mixes its lectures in the last week before an exam unless the
  // student picked otherwise in the same situation (lib/practice lecturesFor).
  const [order, setOrder] = useState<Order>(() =>
    saved && (id || saved.nearExam === !!soon) ? saved.order : soon ? 'mixed' : id ? 'mixed' : 'inorder',
  );
  const asked = params.get('section');
  const [where, setWhere] = useState<PracticeChoice['where']>(() => {
    if (id && asked && course?.sections.some((s) => s.id === asked)) return { [id]: [asked] };
    return saved?.where;
  });
  const [study, setStudy] = useState<string | null>(saved?.study ?? null);

  useEffect(() => {
    try {
      localStorage.setItem(savedKey(scope), JSON.stringify({ kinds, which, order, nearExam: !!soon, where, study } satisfies Saved));
    } catch {
      // Storage blocked: the page still works, it just starts fresh next time.
    }
  }, [scope, kinds, which, order, soon, where, study]);

  const choice: PracticeChoice = { kinds, which, order, ...(where ? { where } : {}), ...(study ? { study } : {}) };

  // Per lecture: the sitting as chosen, and the same with each row's own
  // choice opened up, so every tick can say how many cards it holds.
  const counts = useMemo(() => {
    return lectures.map(([lid, c]) => {
      const progress = byCourse[lid] ?? EMPTY_PROGRESS;
      const missed = useProgressStore.getState().missedIds(lid);
      const exam = examRule(c, progress, now);
      const due = (itemId: string) => isDueFor(progress[itemId], now, exam.forItem(itemId) ?? null);
      const chosen = itemsFor(lid, c, choice, progress, missed, now);
      const anyKind = itemsFor(lid, c, { ...choice, kinds: PRACTICE_KINDS.map((k) => k.value) }, progress, missed, now);
      const anyWhich = itemsFor(lid, c, { ...choice, which: ALL_WHICH }, progress, missed, now);
      const anyWhere = itemsFor(lid, c, { ...choice, where: undefined }, progress, missed, now);
      const byKind = new Map<PracticeKind, number>();
      for (const i of anyKind) {
        const k = kindOfItem(i);
        if (k) byKind.set(k, (byKind.get(k) ?? 0) + 1);
      }
      const byWhich = new Map<Which, number>();
      for (const i of anyWhich) for (const w of whichOf(i, progress, missed, due)) byWhich.set(w, (byWhich.get(w) ?? 0) + 1);
      const bySection = new Map<string, number>();
      for (const i of anyWhere) bySection.set(i._sectionId, (bySection.get(i._sectionId) ?? 0) + 1);
      return { lid, n: chosen.length, byKind, byWhich, bySection };
    });
    // The choice's parts are what it depends on; `choice` itself is new each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectures, byCourse, now, kinds, which, where, study]);

  const test = useMemo(() => {
    const scopes = lectures.map(([courseId, c]) => ({ courseId, course: c, covers: 'all' as const }));
    return { count: testPool(scopes).length, to: id ? `/study/${id}/test` : `/class/${encodeURIComponent(code ?? '')}/test` };
  }, [lectures, id, code]);

  if (!id && !code) return <Navigate to="/" replace />;
  if (!lectures.length) {
    return (
      <div className="py-6 text-center text-text-2">
        {id ? 'Lecture not found.' : `No lectures in ${code}.`}{' '}
        <Link to="/" className="text-accent hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  const sum = (f: (c: (typeof counts)[number]) => number) => counts.reduce((a, c) => a + f(c), 0);
  const n = sum((c) => c.n);
  const reached = counts.filter((c) => c.n > 0);
  const first = reached[0];
  const mixing = !id && order === 'mixed' && reached.length > 1;
  const to = first ? choiceLink(first.lid, choice, id ? undefined : code, mixing) : '';
  const firstTitle = first ? lectureName(courses[first.lid]?.metadata.title ?? '', code) : '';

  const classCode = course ? classOf(course) : code;
  const classSize = classCode ? lecturesOf(courses, classCode).length : 0;
  const nothingStudied = lectures.every(([lid]) => Object.keys(byCourse[lid] ?? {}).length === 0);

  /** A ready-made sitting: these ticks over the whole lecture or class. */
  const ready = (label: string, preset: Pick<PracticeChoice, 'kinds' | 'which' | 'order'>) => {
    const c: PracticeChoice = { ...preset };
    const per = lectures.map(([lid, l]) => ({
      lid,
      n: itemsFor(lid, l, c, byCourse[lid] ?? EMPTY_PROGRESS, useProgressStore.getState().missedIds(lid), now).length,
    }));
    const firstWith = per.find((p) => p.n > 0);
    const total = per.reduce((a, p) => a + p.n, 0);
    return { label, total, to: firstWith ? choiceLink(firstWith.lid, c, id ? undefined : code, !id && c.order === 'mixed' && per.filter((p) => p.n > 0).length > 1) : '' };
  };
  const everyKind = present.filter((k) => k !== 'written');
  const presets = [
    ready('Due now', { kinds: everyKind.length ? everyKind : present, which: ['due'], order: 'weakest' }),
    ready('Mistakes', { kinds: present, which: ['missed'], order: 'mixed' }),
    ...(present.includes('flashcards') ? [ready('Flashcards', { kinds: ['flashcards'], which: ['due', 'missed', 'new'], order: 'weakest' })] : []),
    ...(present.includes('problems') ? [ready('Problems', { kinds: ['problems'], which: ALL_WHICH, order: 'mixed' })] : []),
  ].filter((p) => p.total > 0);

  const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  // Where, as ticks: a lecture's sections, or a class's lectures and their sections.
  const sectionsOf = (lid: string) => sortedSections(courses[lid] ?? lectures.find(([l]) => l === lid)![1]);
  const isOn = (lid: string, sid: string) => {
    const w = where?.[lid];
    return !where ? true : w === 'all' ? true : !!w?.includes(sid);
  };
  const lectureOn = (lid: string) => !where || where[lid] === 'all' || (Array.isArray(where[lid]) && where[lid].length > 0);
  const setSection = (lid: string, sid: string) => {
    const base: Record<string, string[] | 'all'> = where ?? Object.fromEntries(lectures.map(([l]) => [l, 'all' as const]));
    const all = sectionsOf(lid).map((s) => s.id);
    const now = base[lid] === 'all' ? all : (base[lid] ?? []);
    const next = now.includes(sid) ? now.filter((x) => x !== sid) : [...now, sid];
    const out = { ...base, [lid]: next.length === all.length ? ('all' as const) : next };
    setWhere(Object.values(out).every((v) => v === 'all') && Object.keys(out).length === lectures.length ? undefined : out);
  };
  const setLecture = (lid: string) => {
    const base: Record<string, string[] | 'all'> = where ?? Object.fromEntries(lectures.map(([l]) => [l, 'all' as const]));
    const out = { ...base, [lid]: lectureOn(lid) ? [] : ('all' as const) };
    setWhere(Object.values(out).every((v) => v === 'all') ? undefined : out);
  };
  const sectionsChosen = lectures.reduce((a, [lid]) => a + sectionsOf(lid).filter((s) => isOn(lid, s.id)).length, 0);
  const sectionsTotal = lectures.reduce((a, [lid]) => a + sectionsOf(lid).length, 0);
  const lecturesChosen = lectures.filter(([lid]) => lectureOn(lid)).length;
  const whereLine = id
    ? sectionsChosen === sectionsTotal
      ? `All ${sectionsTotal} sections`
      : `${sectionsChosen} of ${sectionsTotal} sections`
    : lecturesChosen === lectures.length && sectionsChosen === sectionsTotal
      ? `All ${lectures.length} lectures`
      : `${lecturesChosen} of ${lectures.length} lectures, ${sectionsChosen} of ${sectionsTotal} sections`;

  const orderUse = ORDERS.find((o) => o.value === order)?.use;

  return (
    <div className="pb-24">
      {id ? (
        <Link to={`/study/${id}`} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
          ← {course!.metadata.title}
        </Link>
      ) : (
        <Link to={`/class/${encodeURIComponent(code!)}`} className="tap-safe inline-flex items-center text-sm text-text-2 hover:text-text">
          ← {code}
        </Link>
      )}
      <h1 className="mt-4 font-display text-display font-semibold text-text">Practice</h1>
      {!id && (
        <p className="mark mt-1 text-text-3">
          {code} · {lectures.length} lecture{lectures.length === 1 ? '' : 's'}
        </p>
      )}
      <p className="mt-2 max-w-prose text-small text-text-2">
        Study what you choose, the way you choose: each answer is marked as you give it. Today still decides what comes back
        when.
      </p>
      {nothingStudied && (
        <p className="mt-3 max-w-prose text-small text-text-2">
          Nothing here has been studied yet.{' '}
          <Link to={id ? `/session/${id}/learn` : `/class/${encodeURIComponent(code!)}`} className="text-accent underline-offset-4 hover:underline">
            {id ? 'Learn' : 'Today'}
          </Link>{' '}
          teaches it a few terms at a time; Practice is for after, or for material you have met already.
        </p>
      )}
      {id && classCode && classSize > 1 && (
        <p className="mt-3 text-small text-text-2">
          Or practise every lecture in {classCode}:{' '}
          <Link to={`/class/${encodeURIComponent(classCode)}/practice`} className="text-accent underline-offset-4 hover:underline">
            the whole class
          </Link>
          .
        </p>
      )}

      {presets.length > 0 && (
        <section className="mt-6">
          <h2 className="mark mb-1 text-text-3">Ready-made</h2>
          <ul className="border-t border-border">
            {presets.map((p) => (
              <li key={p.label} className="border-b border-border">
                <Link to={p.to} className="group tap-safe flex items-baseline gap-3 py-3">
                  <span className="font-display text-body text-text group-hover:text-accent">{p.label}</span>
                  <span className="leaders hidden sm:block" aria-hidden="true" />
                  <span className="mark ml-auto shrink-0 tabular-nums text-text-3">{p.total}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mark mb-1 text-text-3">Choose it yourself</h2>
        <div className="space-y-5 border-y border-border py-5">
          <Ticks
            label="Kinds"
            options={PRACTICE_KINDS.filter((k) => present.includes(k.value)).map((k) => ({
              ...k,
              count: counts.reduce((a, c) => a + (c.byKind.get(k.value) ?? 0), 0),
            }))}
            value={kinds}
            onToggle={(v) => setKinds((ks) => toggle(ks, v))}
          />
          <Ticks
            label="Cards"
            options={WHICH.map((w) => ({ ...w, count: counts.reduce((a, c) => a + (c.byWhich.get(w.value) ?? 0), 0) }))}
            value={which}
            onToggle={(v) => setWhich((ws) => toggle(ws, v))}
          />
          <div className="flex flex-col gap-y-1 sm:flex-row sm:items-baseline sm:gap-x-3">
            <span className="mark shrink-0 text-text-3 sm:w-20">Order</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
                {ORDERS.map((o, i) => {
                  const active = o.value === order;
                  return (
                    <span key={o.value} className="flex items-baseline">
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setOrder(o.value)}
                        className={`tap-safe px-0.5 text-small transition-colors ${active ? 'text-accent' : 'text-text-2 hover:text-text'}`}
                      >
                        <span className={active ? 'underline decoration-accent decoration-2 underline-offset-4' : ''}>{o.label}</span>
                      </button>
                      {i < ORDERS.length - 1 && <span className="ml-1 text-text-3">·</span>}
                    </span>
                  );
                })}
              </div>
              <p className="mt-1 text-small text-text-3">
                {orderUse}
                {!id && order !== 'mixed' && ' One lecture after another.'}
                {!id && order === 'mixed' && ' Every lecture in one sitting, so their ideas have to be told apart.'}
                {!id && soon && order === 'mixed' && saved?.order !== 'mixed' &&
                  ` Mixed because ${soon.name} is ${soon.days === 0 ? 'today' : soon.days === 1 ? 'tomorrow' : `in ${soon.days} days`}.`}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-y-1 sm:flex-row sm:items-baseline sm:gap-x-3">
            <span className="mark shrink-0 text-text-3 sm:w-20">From</span>
            <details className="min-w-0 flex-1">
              <summary className="tap-safe cursor-pointer text-small text-text-2 hover:text-text">{whereLine}</summary>
              <div className="mt-2 space-y-3">
                <div className="flex gap-4 text-small">
                  <button type="button" onClick={() => setWhere(undefined)} className="tap-safe text-text-3 underline-offset-4 hover:text-text hover:underline">
                    Tick all
                  </button>
                  <button
                    type="button"
                    onClick={() => setWhere(Object.fromEntries(lectures.map(([l]) => [l, [] as string[]])))}
                    className="tap-safe text-text-3 underline-offset-4 hover:text-text hover:underline"
                  >
                    Untick all
                  </button>
                </div>
                {lectures.map(([lid, c], li) => (
                  <fieldset key={lid}>
                    {!id && (
                      <legend className="w-full">
                        <label className="tap-safe flex cursor-pointer items-center gap-2 py-1 text-small font-semibold text-text">
                          <input type="checkbox" checked={lectureOn(lid)} onChange={() => setLecture(lid)} className="accent-accent" />
                          {roman(li + 1)}. {lectureName(c.metadata.title, code)}
                        </label>
                      </legend>
                    )}
                    <div className={id ? '' : 'pl-5'}>
                      {sectionsOf(lid).map((s, si) => {
                        const k = counts.find((x) => x.lid === lid)?.bySection.get(s.id) ?? 0;
                        return (
                          <label key={s.id} className="tap-safe flex cursor-pointer items-baseline gap-2 py-1 text-small text-text">
                            <input type="checkbox" checked={isOn(lid, s.id)} onChange={() => setSection(lid, s.id)} className="accent-accent" />
                            <span className="min-w-0 flex-1">
                              {si + 1}. {s.title}
                            </span>
                            <span className="shrink-0 text-xs tabular-nums text-text-3">{k}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
            </details>
          </div>
          {studies.length > 0 && (
            <div className="flex flex-col gap-y-1 sm:flex-row sm:items-baseline sm:gap-x-3">
              <span className="mark shrink-0 text-text-3 sm:w-20">Studies</span>
              <label className="min-w-0 sm:max-w-sm sm:flex-1">
                <span className="sr-only">Only the cards on studies</span>
                <select value={study ?? ''} onChange={(e) => setStudy(e.target.value || null)} className="field tap-safe w-full truncate text-small text-text-2">
                  <option value="">Every card</option>
                  <option value="all">Only the cards on studies</option>
                  {studies.map((s) => (
                    <option key={`${s.courseId}|${s.key}`} value={s.key}>
                      Only {s.label}
                      {id ? '' : ` · ${s.lecture}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
      </section>

      <section className="mt-10 border-t border-border pt-5">
        <h2 className="mark text-text-3">Practice test</h2>
        <p className="mt-2 max-w-prose text-small text-text-2">
          A rehearsal for the exam: the questions that ask you to use what you know, answers held to the end, then your score and
          every question you missed.{' '}
          <span className="tabular-nums text-text-3">
            {test.count} question{test.count === 1 ? '' : 's'}.
          </span>
        </p>
        {test.count > 0 && (
          <Link to={test.to} className="press tap-safe mt-3">
            Take a practice test
          </Link>
        )}
      </section>

      {/* Start in thumb reach, with what it gives: every tick shows its effect here. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-strong bg-bg/95 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-5 sm:px-6">
          {n > 0 ? (
            <Link to={to} className="press press-ink tap-safe shrink-0">
              Start
            </Link>
          ) : (
            <span className="press tap-safe shrink-0 cursor-default opacity-40" aria-disabled="true">
              Start
            </span>
          )}
          <span className="min-w-0 text-small text-text-2">
            {!kinds.length || !which.length
              ? 'Tick at least one kind and one set of cards.'
              : n === 0
                ? 'No card matches these ticks.'
                : `${n} card${n === 1 ? '' : 's'}${reached.length > 1 ? (mixing ? `, from ${reached.length} lectures mixed` : `, starting in ${firstTitle}`) : ''}.`}
          </span>
        </div>
      </div>
    </div>
  );
}

/** A row of ticks: each a box, its label and how many cards it holds. */
function Ticks<T extends string>({
  label,
  options,
  value,
  onToggle,
}: {
  label: string;
  options: { value: T; label: string; count: number }[];
  value: T[];
  onToggle: (v: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-y-1 sm:flex-row sm:items-baseline sm:gap-x-3">
      <legend className="mark float-left shrink-0 text-text-3 sm:w-20">{label}</legend>
      <div className="clear-left grid grid-cols-2 gap-x-4 sm:clear-none sm:grid-cols-3">
        {options.map((o) => (
          <label key={o.value} className="tap-safe flex cursor-pointer items-baseline gap-2 py-1 text-small text-text">
            <input type="checkbox" checked={value.includes(o.value)} onChange={() => onToggle(o.value)} className="accent-accent" />
            <span>{o.label}</span>
            <span className="text-xs tabular-nums text-text-3">{o.count}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
