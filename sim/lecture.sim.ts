import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { CourseSchema, type Course } from '@/schema/course';
import type { SessionItem } from '@/lib/buildSessionItems';
import { recallId } from '@/lib/scored';
import { scoredEntries } from '@/lib/scored';
import { isDueFor } from '@/lib/memory';
import { examRule } from '@/lib/exam';
import { coversTokens, termTokens } from '@/lib/termMatch';
import { formatWalk } from '@/lib/sessionAudit';
import { answers, MIN_GAP, shownOf } from '@/lib/learnSteps';
import { useProgressStore, type ItemResult } from '@/store/progress';
import { usePlanStore } from '@/store/plan';
import { useStudyLogStore } from '@/store/studyLog';
import { useSessionStore } from '@/store/session';
import { useLearnStore } from '@/store/learn';
import { useCoursesStore } from '@/store/courses';
import { sectionsToLearn } from '@/lib/nextToLearn';
import { partMinutes } from '@/lib/today';
import { daysToExam } from '@/lib/libraryToday';
import { rng } from './random';
import { chanceRight, FIRST_TIME, MCQ_GUESS, MEMORY } from './student';

/**
 * Days of study on a REAL lecture, through the app's own doors, read sitting
 * by sitting. The suite (run.sim.ts) scores memory on synthetic courses with
 * random wording; this shows what a student is asked, in what order, on the
 * lecture they actually have: how much is review, whether "new" material is
 * new, how often one term comes up, how long until the last section.
 *
 *   SIM_LECTURE=/path/a.study.json[,/path/b.study.json] npx vitest run --config vitest.sim.config.ts sim/lecture.sim.ts
 *
 * The first lecture is studied; any others are loaded beside it, as in the
 * library, so terms shared between lectures count once (lib/linkedTerms).
 * Never commit a lecture: they are students' own material.
 *
 *   SIM_PLAN      steady (default), evening, keep-going, missed-days, quit-half,
 *                 learn-instead, late-start, no-date-late; several, comma-separated
 *   SIM_MINUTES   daily minutes (default 30; late-start 120)
 *   SIM_EXAM_IN   days from the first sitting to the exam (none by default)
 *   SIM_SCOPE     sections the exam covers: all (default) or half
 *   SIM_MEMORY    fsrs (default) or harsh: the simulated student's forgetting
 *   SIM_QF=1      Questions first on (store/learn.ts)
 *   SIM_SEED      seed (default 1)
 *   SIM_WALK=1    print every sitting card by card
 *
 * Writes sim/results/lecture.md.
 */

const DAY = 864e5;
const HOUR = 36e5;
/** A Monday, 7pm. */
const START = new Date(2026, 9, 5, 19).getTime();

/**
 * Seconds a card takes. The owner's own medians from their study log
 * (2026-10-12 backup, scripts/calibrate-log.mjs), slower than the suite's
 * guesses for typed terms (25 s against 15) and questions (41 against 35).
 * The study log is on here, as in the app, so Today plans with the measured
 * pace once a type has 15 cards.
 */
const SECONDS: Record<string, number> = {
  definition: 22,
  example: 41,
  graphic: 22,
  flashcard: 13,
  recall: 25,
  mcq: 41,
  preview: 5,
  slides: 5,
};

type Door = 'today' | 'keep' | 'learn' | 'continue';
interface Sit {
  day: number;
  hour: number;
  door: Door;
  /** Stop after this many cards (a sitting abandoned halfway). */
  quitAfter?: number;
  /**
   * Carry on until the day's minutes are used: back for the next part three
   * hours later when the app plans the day in parts, else Keep going at once
   * ('keep' always presses Keep going).
   */
  fill?: 'parts' | 'keep';
  note?: string;
}

/**
 * Pressing Today, then Today again from the course page while the day's
 * minutes are not used up: what a student who "does what it says" does.
 */
const daily = (days: number[], hour = 19): Sit[] => days.map((day) => ({ day, hour, door: 'today' as const }));

const PLANS: Record<string, { days: number; minutes?: number; sits: Sit[]; why: string }> = {
  steady: { days: 7, sits: daily([0, 1, 2, 3, 4, 5, 6]), why: 'Today once a day for a week' },
  evening: {
    days: 4,
    sits: [0, 1, 2, 3].flatMap((day) => [
      { day, hour: 19, door: 'today' as const },
      { day, hour: 23, door: 'today' as const, note: 'back later the same day' },
    ]),
    why: 'Today, then Today again four hours later (the catch-up)',
  },
  'keep-going': {
    days: 3,
    sits: [0, 1, 2].flatMap((day) => [
      { day, hour: 19, door: 'today' as const },
      { day, hour: 19, door: 'keep' as const, note: 'Keep going straight after' },
    ]),
    why: 'Today, then Keep going at once',
  },
  'missed-days': { days: 12, sits: daily([0, 1, 2, 3, 4, 9, 10, 11]), why: 'five days on, four off, back' },
  'quit-half': {
    days: 3,
    sits: [
      { day: 0, hour: 19, door: 'today' },
      { day: 1, hour: 19, door: 'today', quitAfter: 15, note: 'stops after 15 cards' },
      { day: 1, hour: 21, door: 'continue', note: 'Continue two hours later' },
      { day: 2, hour: 19, door: 'today' },
    ],
    why: 'a sitting left halfway, then resumed',
  },
  'learn-instead': {
    days: 3,
    sits: [
      { day: 0, hour: 19, door: 'today' },
      { day: 1, hour: 19, door: 'learn', note: 'taps Learn instead of Today' },
      { day: 2, hour: 19, door: 'today' },
    ],
    why: 'Learn tapped instead of Today on day 2',
  },
  'late-start': {
    days: 3,
    minutes: 120,
    sits: daily([0, 1, 2], 10),
    why: 'never studied, exam in three days, two hours a day, Today once a day (set SIM_EXAM_IN=3)',
  },
  'late-start-parts': {
    days: 3,
    minutes: 120,
    sits: [0, 1, 2].map((day) => ({ day, hour: 10, door: 'today' as const, fill: 'parts' as const })),
    why: 'as late-start, back for every part the app plans (or Keep going when it plans none)',
  },
  'late-start-keep': {
    days: 3,
    minutes: 120,
    sits: [0, 1, 2].map((day) => ({ day, hour: 10, door: 'today' as const, fill: 'keep' as const })),
    why: 'as late-start, pressing Keep going until the two hours are used',
  },
};

/** Every name a definition goes by, as token sets (as lib/learnSteps reads them). */
function namesOf(term: string, aka: string[] = []): Set<string>[] {
  const inner = [...term.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]);
  return [term, term.replace(/\([^)]*\)/g, ' '), ...inner, ...aka].map(termTokens).filter((t) => t.size > 0 && [...t].join('').length >= 2);
}

it('lecture', () => {
  const paths = (process.env.SIM_LECTURE ?? '').split(',').filter(Boolean);
  if (!paths.length) {
    console.log('Set SIM_LECTURE to a .study.json path (kept outside the repo).');
    return;
  }
  Storage.prototype.setItem = () => {};
  const courses: Record<string, Course> = {};
  paths.forEach((p, k) => {
    const raw = JSON.parse(readFileSync(p, 'utf8'));
    courses[k === 0 ? 'lecture' : `other${k}`] = CourseSchema.parse(raw);
  });
  const ID = 'lecture';
  const base = courses[ID];
  const plans = (process.env.SIM_PLAN ?? 'steady').split(',');
  const memory = MEMORY[process.env.SIM_MEMORY ?? 'fsrs'];
  const seed = Number(process.env.SIM_SEED ?? 1);
  const out: string[] = [`# ${base.metadata.title} · ${memory.name} · seed ${seed}`, ''];

  // Which term a card is about: a typed term's own, else the most specific
  // term of its section (then the lecture) that its words name.
  const defs = base.sections.flatMap((s) =>
    s.items.filter((i) => i.type === 'definition').map((d) => ({ id: d.id, section: s.id, term: d.type === 'definition' ? d.term : '', names: d.type === 'definition' ? namesOf(d.term, d.also_known_as) : [] })),
  );
  const termOf = (item: SessionItem): string | null => {
    if (item.type === 'recall' && !item.question) return item.target.term;
    const text =
      item.type === 'mcq' ? `${item.question} ${item.options[item.correct_index]}` : item.type === 'flashcard' ? `${item.front} ${item.back}` : item.type === 'recall' ? `${item.question} ${item.answer}` : '';
    if (!text) return null;
    const have = termTokens(text);
    const hits = (pool: typeof defs) =>
      pool
        .map((d) => ({ d, size: Math.max(0, ...d.names.filter((n) => coversTokens(have, n)).map((n) => n.size)) }))
        .filter((h) => h.size > 0)
        .sort((a, b) => b.size - a.size);
    const local = hits(defs.filter((d) => d.section === item._sectionId));
    const best = local[0] ?? hits(defs)[0];
    return best ? best.d.term : null;
  };
  const sectionIndex = new Map(base.sections.map((s, k) => [s.id, k + 1]));

  for (const planName of plans) {
    const plan = PLANS[planName];
    if (!plan) throw new Error(`Unknown SIM_PLAN ${planName}`);
    const minutes = Number(process.env.SIM_MINUTES ?? plan.minutes ?? 30);
    const examIn = process.env.SIM_EXAM_IN != null ? Number(process.env.SIM_EXAM_IN) : null;
    let course: Course;
    if (examIn != null) {
      const d = new Date(START + examIn * DAY);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const half = base.sections.slice(0, Math.ceil(base.sections.length / 2)).map((s) => s.id);
      course = {
        ...base,
        metadata: { ...base.metadata, exams: [], exam_date: iso, ...(process.env.SIM_SCOPE === 'half' ? { exam_sections: half } : {}) },
      };
    } else {
      course = { ...base, metadata: { ...base.metadata, exams: [], exam_date: undefined, exam_sections: undefined } };
    }
    useCoursesStore.setState({ courses: { ...courses, [ID]: course } });
    useProgressStore.setState({ byCourse: {} });
    useStudyLogStore.setState({ byCourse: {} });
    usePlanStore.setState({ byCourse: { [ID]: { minutes } }, total: null });
    useLearnStore.setState({ questionsFirst: !!process.env.SIM_QF });

    const r = rng(seed * 7919 + 17);
    const ease = new Map<string, number>();
    const easeOf = (id: string) => ease.get(id) ?? (ease.set(id, 0.5 + r()), ease.get(id)!);
    const truth = new Map<string, { s: number; last: number; firstMiss?: boolean }>();
    const primed = new Map<string, number>();
    let now = START;
    const realNow = Date.now;
    Date.now = () => now;
    let bookmark: string | null = null;

    out.push(`## ${planName}: ${plan.why}`, '', `${minutes} min/day${examIn != null ? `, exam in ${examIn} days (${process.env.SIM_SCOPE ?? 'all'} sections)` : ', no exam date'}${process.env.SIM_QF ? ', questions first' : ''}`, '');
    out.push('| sitting | min | cards | review | new | read | asked before, served as new | same card twice | answered by a card < 5 before (review / new) | most on one term | 2nd look | 1–2 card steps | misses | sections (cards) | due after |');
    out.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    const walks: string[] = [];

    try {
      const queue = [...plan.sits];
      const usedByDay = new Map<number, number>();
      while (queue.length) {
        const sit = queue.shift()!;
        now = Math.max(now, START + sit.day * DAY + (sit.hour - 19) * HOUR);
        const before: Record<string, ItemResult> = useProgressStore.getState().getProgress(ID);
        const st = useSessionStore.getState;
        if (sit.door === 'today') st().init(ID, course, 'today');
        else if (sit.door === 'keep') st().init(ID, course, 'today', undefined, undefined, true);
        else if (sit.door === 'continue') st().init(ID, course, 'today', undefined, bookmark ?? undefined);
        else {
          const next = sectionsToLearn(course, before, now)[0];
          st().init(ID, course, 'learn', next?.section.id);
        }
        const planned = st().items.reduce((n, i) => n + (SECONDS[i.type] ?? 20), 0) / 60;
        let n = 0;
        let spent = 0;
        let misses = 0;
        bookmark = null;
        while (st().items.length) {
          if (sit.quitAfter != null && n >= sit.quitAfter) {
            bookmark = st().current()!.id;
            break;
          }
          const item = st().current()!;
          const sec = SECONDS[item.type] ?? 20;
          now += sec * 1000;
          spent += sec;
          n++;
          if (item.type === 'definition') primed.set(recallId(item.id), now);
          if (item.type === 'mcq' || item.type === 'flashcard' || item.type === 'recall') {
            const T = truth.get(item.id);
            const R = T ? memory.recall((now - T.last) / DAY, T.s) : null;
            let p: number;
            if (R == null && item._step !== undefined && useLearnStore.getState().questionsFirst)
              p = item.type === 'mcq' ? FIRST_TIME.coldRecall + (1 - FIRST_TIME.coldRecall) * MCQ_GUESS : FIRST_TIME.coldRecall;
            else if (R != null) p = chanceRight(item, R);
            else if (item.type === 'recall') {
              const at = primed.get(item.id);
              p = at != null ? FIRST_TIME.primedRecall * Math.exp(-(now - at) / (FIRST_TIME.primedFadeMinutes * 6e4)) : FIRST_TIME.coldRecall;
              p = Math.max(p, FIRST_TIME.coldRecall);
            } else p = item.type === 'mcq' ? FIRST_TIME.mcq : FIRST_TIME.flashcard;
            const got = r() < p;
            if (!got) misses++;
            const e = easeOf(item.id);
            const fromFirstMiss = !!T?.firstMiss;
            truth.set(item.id, {
              s: got ? (T && !fromFirstMiss ? memory.grow(T.s, R ?? 0, e) : memory.first(e)) : memory.lapse(T?.s ?? null, e),
              last: now,
              firstMiss: !got && (T == null || !!T.firstMiss),
            });
            st().record(got);
          }
          if (!st().next()) {
            st().finish();
            break;
          }
        }
        const seen = st().items.slice(0, n);
        const review = seen.filter((i) => i._block === 'review');
        const fresh = seen.filter((i) => i._block !== 'review');
        const reading = seen.filter((i) => ['definition', 'explain', 'example', 'graphic', 'preview', 'slides'].includes(i.type));
        const asks: SessionItem[] = seen.filter((i) => i.type === 'mcq' || i.type === 'flashcard' || i.type === 'recall');
        const servedOld = fresh.filter((i) => asks.includes(i) && !i._again && (before[i.id]?.got ?? 0) + (before[i.id]?.missed ?? 0) > 0).length;
        const firstAsks = asks.filter((i) => !i._again);
        const twice = firstAsks.length - new Set(firstAsks.map((i) => i.id)).size;
        const perTerm = new Map<string, number>();
        for (const i of firstAsks) {
          const t = termOf(i);
          if (t) perTerm.set(t, (perTerm.get(t) ?? 0) + 1);
        }
        // A card asked fewer than MIN_GAP cards after one that answers it, with no
        // exemption for a step's pause: the student meets them one after the other.
        let closeReview = 0;
        let closeNew = 0;
        seen.forEach((b, j) => {
          const bs = shownOf(b);
          if (!bs || b.type === 'definition' || b._again) return;
          for (let i = Math.max(0, j - MIN_GAP); i < j; i++) {
            const a = seen[i];
            const as = shownOf(a);
            if (!as || a.id === b.id) continue;
            if (answers(as, b, bs.asked)) {
              if (b._block === 'review') closeReview++;
              else closeNew++;
              break;
            }
          }
        });
        const blocks = new Map<string, number>();
        for (const i of fresh) if (!i._again) blocks.set(i._block ?? '', (blocks.get(i._block ?? '') ?? 0) + 1);
        const tiny = [...blocks.values()].filter((c) => c <= 2).length;
        const top = [...perTerm].sort((a, b) => b[1] - a[1])[0];
        const bySection = new Map<number, number>();
        for (const i of seen) bySection.set(sectionIndex.get(i._sectionId) ?? 0, (bySection.get(sectionIndex.get(i._sectionId) ?? 0) ?? 0) + 1);
        const progress = useProgressStore.getState().getProgress(ID);
        const exam = examRule(course, progress, now);
        let due = 0;
        for (const s of course.sections) for (const { id } of scoredEntries(s.items)) if (isDueFor(progress[id], now, exam.forItem(id))) due++;
        const label = `d${sit.day} ${String(sit.hour).padStart(2, '0')}h ${sit.door}${sit.note ? ` (${sit.note})` : ''}`;
        out.push(
          `| ${label} | ${Math.round(spent / 60)}/${Math.round(planned)} | ${seen.length} | ${review.length} | ${fresh.length} | ${reading.length} | ${servedOld} | ${twice} | ${closeReview} / ${closeNew} | ${top ? `${top[1]} (${top[0].slice(0, 24)})` : '–'} | ${seen.filter((i) => i._second).length} | ${tiny} | ${misses} | ${[...bySection].sort((a, b) => a[0] - b[0]).map(([s, c]) => `${s}:${c}`).join(' ')} | ${due} |`,
        );
        if (process.env.SIM_WALK) walks.push(`### ${label}`, '```', formatWalk(seen), '```');
        usedByDay.set(sit.day, (usedByDay.get(sit.day) ?? 0) + spent / 60);
        if (sit.fill && seen.length && (usedByDay.get(sit.day) ?? 0) < minutes - 2) {
          const parts = sit.fill === 'parts' && course.metadata.exam_date && partMinutes(minutes, daysToExam(course.metadata.exam_date, now)) != null;
          queue.unshift(parts ? { ...sit, hour: sit.hour + 3, door: 'today', note: 'next part' } : { ...sit, door: 'keep', note: 'Keep going' });
        }
      }
      const progress = useProgressStore.getState().getProgress(ID);
      const reached = course.sections.filter((s) => scoredEntries(s.items).some(({ id }) => progress[id])).length;
      const total = course.sections.reduce((n, s) => n + scoredEntries(s.items).length, 0);
      out.push('', `Reached ${reached} of ${course.sections.length} sections; ${Object.keys(progress).filter((id) => !id.includes('|')).length} of ${total} cards answered at least once.`, '');
      out.push(...walks);
    } finally {
      Date.now = realNow;
    }
  }
  mkdirSync('sim/results', { recursive: true });
  writeFileSync('sim/results/lecture.md', out.join('\n'));
  console.log(out.join('\n'));
});
