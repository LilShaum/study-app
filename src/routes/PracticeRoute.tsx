import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { Sheet } from '@/components/Sheet';
import { plural } from '@/lib/plural';
import { ThumbBar } from '@/components/ThumbBar';
import { useMediaQuery, WIDE } from '@/lib/useMediaQuery';

/** A group of ticks longer than this folds on a phone. */
const LONG = 6;

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
      // Checked as a link's is (lib/practiceChoice decodeChoice): a lecture
      // mapped to anything but 'all' or a list of ids would break the page.
      where:
        v.where && typeof v.where === 'object'
          ? Object.fromEntries(
              Object.entries(v.where).flatMap(([lid, w]): [string, string[] | 'all'][] =>
                w === 'all' ? [[lid, 'all']] : Array.isArray(w) ? [[lid, w.filter((x): x is string => typeof x === 'string')]] : [],
              ),
            )
          : undefined,
      study: typeof v.study === 'string' ? v.study : null,
    };
  } catch {
    return null;
  }
}

/** One lecture's cards for a choice, by the call the session makes. */
/** New cards a ready-made Flashcards sitting takes, after the ones already met: Anki's default a day, here a sitting. */
const FLASHCARDS_NEW = 10;

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
    practice: { kinds: new Set(choice.kinds), which: new Set(choice.which), order: 'inorder', sectionIds, newCap: choice.newCap },
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
  const wide = useMediaQuery(WIDE);
  const [fromOpen, setFromOpen] = useState(false);

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
  const ready = (label: string, use: string, preset: Pick<PracticeChoice, 'kinds' | 'which' | 'order' | 'newCap'>) => {
    const c: PracticeChoice = { ...preset };
    const per = lectures.map(([lid, l]) => ({
      lid,
      n: itemsFor(lid, l, c, byCourse[lid] ?? EMPTY_PROGRESS, useProgressStore.getState().missedIds(lid), now).length,
    }));
    const firstWith = per.find((p) => p.n > 0);
    const total = per.reduce((a, p) => a + p.n, 0);
    return { label, use, total, to: firstWith ? choiceLink(firstWith.lid, c, id ? undefined : code, !id && c.order === 'mixed' && per.filter((p) => p.n > 0).length > 1) : '' };
  };
  const everyKind = present.filter((k) => k !== 'written');
  const presets = [
    ready('To review', 'What is fading, faintest first.', { kinds: everyKind.length ? everyKind : present, which: ['due'], order: 'weakest' }),
    ready('Mistakes', 'Every one you have missed, mixed.', { kinds: present, which: ['missed'], order: 'mixed' }),
    // Anki's way: what is fading first, then up to ten new (docs/proposals/practice.md).
    ...(present.includes('flashcards') ? [ready('Flashcards', `The ones fading, then up to ${FLASHCARDS_NEW} new.`, { kinds: ['flashcards'], which: ['due', 'missed', 'new'], order: 'weakest', newCap: FLASHCARDS_NEW })] : []),
    ...(present.includes('problems') ? [ready('Problems', 'Every problem, mixed.', { kinds: ['problems'], which: ALL_WHICH, order: 'mixed' })] : []),
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
  const status =
    !kinds.length || !which.length
      ? 'Tick at least one kind and one set of cards.'
      : n === 0
        ? 'No card matches these ticks.'
        : `${n} card${n === 1 ? '' : 's'}: ${PRACTICE_KINDS.filter((k) => kinds.includes(k.value)).map((k) => k.label.toLowerCase()).join(', ')}, ${(ORDERS.find((o) => o.value === order)?.label ?? '').toLowerCase()}${reached.length > 1 ? (mixing ? `, from ${reached.length} lectures mixed` : `, starting in ${firstTitle}`) : ''}.`;
  const startButton =
    n > 0 ? (
      <Link to={to} className="press press-ink tap-safe shrink-0 px-6 py-3">
        Start
      </Link>
    ) : (
      <span className="press tap-safe shrink-0 cursor-default px-6 py-3 opacity-40" aria-disabled="true">
        Start
      </span>
    );

  const kindOptions = PRACTICE_KINDS.filter((k) => present.includes(k.value)).map((k) => ({
    ...k,
    count: counts.reduce((a, c) => a + (c.byKind.get(k.value) ?? 0), 0),
  }));
  const whichOptions = WHICH.map((w) => ({ ...w, count: counts.reduce((a, c) => a + (c.byWhich.get(w.value) ?? 0), 0) }));

  const head = (
    <>
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
        Each answer is marked as you give it.
      </p>
      {nothingStudied && (
        <p className="mt-3 max-w-prose text-small text-text-2">
          Nothing studied yet. Start with{' '}
          <Link to={id ? `/session/${id}/learn` : `/class/${encodeURIComponent(code!)}`} className="text-accent underline-offset-4 hover:underline">
            {id ? 'Learn' : 'Today'}
          </Link>
          .
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
    </>
  );

  const readyList = presets.length > 0 && (
    <section className="mt-6">
      <h2 className="mark mb-1 text-text-3">Ready-made</h2>
      <ul className="border-t border-border">
        {presets.map((p) => (
          <li key={p.label} className="border-b border-border">
            {/* Rows you tap, saying what each is: a word and a number alone
                did not look like something to start (docs/proposals/phone-round.md). */}
            <Link to={p.to} className="group tap-safe flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-3">
                  <span className="font-display text-body font-semibold text-text group-hover:text-accent">{p.label}</span>
                  <span className="mark tabular-nums text-text-3">{plural(p.total, 'card')}</span>
                </span>
                <span className="mt-0.5 block text-small text-text-3">{p.use}</span>
              </span>
              <span aria-hidden="true" className="shrink-0 font-display text-[1.75rem] leading-none text-text-2 group-hover:text-accent">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );

  const kindsTicks = (
    <Ticks label="Kinds" options={kindOptions} value={kinds} onToggle={(v) => setKinds((ks) => toggle(ks, v))} stacked={wide} />
  );
  const whichTicks = (
    <Ticks label="Cards" options={whichOptions} value={which} onToggle={(v) => setWhich((ws) => toggle(ws, v))} stacked={wide} />
  );

  const orderRow = (
    <div className={`flex flex-col gap-y-1 ${wide ? '' : 'sm:flex-row sm:items-baseline sm:gap-x-3'}`}>
      <span className={`mark shrink-0 text-text-3 ${wide ? '' : 'sm:w-20'}`}>Order</span>
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
  );

  // The sections as ticks. Where there is room they lie open in columns.
  const fromBody = (
    <div className="space-y-3">
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
      <div className={wide ? 'columns-2 gap-x-8 [&>fieldset]:mb-3 [&>fieldset]:break-inside-avoid' : 'space-y-3'}>
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
            <div className={id ? (wide ? 'columns-2 gap-x-8' : '') : 'pl-5'}>
              {sectionsOf(lid).map((s, si) => {
                const k = counts.find((x) => x.lid === lid)?.bySection.get(s.id) ?? 0;
                return (
                  <label key={s.id} className="tap-safe flex cursor-pointer items-baseline gap-2 break-inside-avoid py-1 text-small text-text">
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
    </div>
  );
  const fromRow = (
    <div className={`flex flex-col gap-y-1 ${wide ? '' : 'sm:flex-row sm:items-baseline sm:gap-x-3'}`}>
      <span className={`mark shrink-0 text-text-3 ${wide ? '' : 'sm:w-20'}`}>From</span>
      {wide ? (
        <div className="min-w-0 flex-1">
          <p className="text-small text-text-2">{whereLine}</p>
          <div className="mt-2">{fromBody}</div>
        </div>
      ) : sectionsTotal > LONG ? (
        // A long list of sections folds behind one line that opens as a sheet.
        <button type="button" onClick={() => setFromOpen(true)} className="tap-safe min-w-0 flex-1 text-left text-small text-text-2 hover:text-text">
          <span className="underline decoration-border-strong underline-offset-4">{whereLine}</span> ▸
        </button>
      ) : (
        <details className="min-w-0 flex-1">
          <summary className="tap-safe cursor-pointer text-small text-text-2 hover:text-text">{whereLine}</summary>
          <div className="mt-2">{fromBody}</div>
        </details>
      )}
    </div>
  );

  const studiesRow = studies.length > 0 && (
    <div className={`flex flex-col gap-y-1 ${wide ? '' : 'sm:flex-row sm:items-baseline sm:gap-x-3'}`}>
      <span className={`mark shrink-0 text-text-3 ${wide ? '' : 'sm:w-20'}`}>Studies</span>
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
  );

  const testBlock = (
    <section className="mt-10 border-t border-border pt-5">
      <h2 className="mark text-text-3">Practice test</h2>
      <p className="mt-2 max-w-prose text-small text-text-2">
        Answers held to the end, then your score.{' '}
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
  );

  if (wide) {
    // What is picked, summed on the left page with Start under it.
    const picked = lectures.flatMap(([lid, c], li) =>
      sectionsOf(lid)
        .filter((s) => isOn(lid, s.id))
        .map((s, si) => ({ key: `${lid}/${s.id}`, label: `${si + 1}. ${s.title}`, lecture: id ? '' : `${roman(li + 1)}. ${lectureName(c.metadata.title, code)}` })),
    );
    const line = (k: string, v: ReactNode) => (
      <li className="flex items-baseline gap-4 border-b border-border py-2 text-small">
        <span className="mark w-16 shrink-0 text-text-3">{k}</span>
        <span className="min-w-0 flex-1 text-text">{v}</span>
      </li>
    );
    const studyName = study === 'all' ? 'Only the cards on studies' : study ? studies.find((s) => s.key === study)?.label : null;
    return (
      <div>
        <div className="flex gap-10">
          <aside
            aria-label="What you have picked"
            className="sticky top-6 flex max-h-[calc(100vh-3rem)] w-[22rem] shrink-0 flex-col self-start pt-1"
          >
            <h2 className="mark mb-1 shrink-0 text-text-3">Your sitting</h2>
            <ul className="shrink-0 border-t border-border">
              {line('Gives', <span className="font-display text-heading tabular-nums">{n}</span>)}
              {line('Kinds', kinds.length ? kindOptions.filter((k) => kinds.includes(k.value)).map((k) => k.label).join(', ') : 'None')}
              {line('Cards', which.length ? whichOptions.filter((w) => which.includes(w.value)).map((w) => w.label).join(', ') : 'None')}
              {line('Order', ORDERS.find((o) => o.value === order)?.label)}
              {studyName && line('Studies', studyName)}
            </ul>
            <h3 className="mark mb-1 mt-4 shrink-0 text-text-3">{whereLine}</h3>
            <ul className="min-h-0 flex-1 overflow-y-auto border-t border-border [scrollbar-width:thin]">
              {picked.map((p) => (
                <li key={p.key} className="border-b border-border py-1.5 text-small text-text-2">
                  {p.lecture && <span className="block text-xs text-text-3">{p.lecture}</span>}
                  {p.label}
                </li>
              ))}
              {!picked.length && <li className="border-b border-border py-1.5 text-small text-text-3">Nothing ticked.</li>}
            </ul>
            <div className="shrink-0 border-t border-border-strong pt-4">
              <div className="flex items-center gap-4">
                {startButton}
                <span className="min-w-0 text-small text-text-2">{status}</span>
              </div>
            </div>
          </aside>
          <div className="min-w-0 flex-1 border-l border-border pl-10">
            {head}
            {readyList}
            <section className="mt-8">
              <h2 className="mark mb-1 text-text-3">Choose it yourself</h2>
              <div className="space-y-6 border-y border-border py-5">
                <div className="grid grid-cols-2 gap-x-10">
                  {kindsTicks}
                  {whichTicks}
                </div>
                {orderRow}
                {fromRow}
                {studiesRow}
              </div>
            </section>
            {testBlock}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {head}
      {readyList}
      <section className="mt-8">
        <h2 className="mark mb-1 text-text-3">Choose it yourself</h2>
        <div className="space-y-5 border-y border-border py-5">
          {kindsTicks}
          {whichTicks}
          {orderRow}
          {fromRow}
          {studiesRow}
        </div>
      </section>
      {testBlock}

      {fromOpen && (
        <Sheet label="Choose the sections" title={whereLine} onClose={() => setFromOpen(false)}>
          <div className="px-5 py-4">{fromBody}</div>
        </Sheet>
      )}

      {/* Start in thumb reach, with what it gives: every tick shows its effect here. */}
      <ThumbBar>
        {/* What the ticks add up to on the left, Start under the thumb on the right. */}
        <div className="flex items-center gap-4">
          <span className="min-w-0 flex-1 text-small text-text-2">{status}</span>
          {startButton}
        </div>
      </ThumbBar>
    </div>
  );
}

/** A row of ticks: each a box, its label and how many cards it holds. */
function Ticks<T extends string>({
  label,
  options,
  value,
  onToggle,
  stacked,
}: {
  label: string;
  options: { value: T; label: string; count: number }[];
  value: T[];
  onToggle: (v: T) => void;
  /** Label above, one tick to a line: for a column of the wide page. */
  stacked?: boolean;
}) {
  return (
    <fieldset className={`flex flex-col gap-y-1 ${stacked ? '' : 'sm:flex-row sm:items-baseline sm:gap-x-3'}`}>
      <legend className={`mark float-left shrink-0 text-text-3 ${stacked ? '' : 'sm:w-20'}`}>{label}</legend>
      <div className={`clear-left ${stacked ? '' : 'grid grid-cols-2 gap-x-4 sm:clear-none sm:grid-cols-3'}`}>
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
