import { mkdirSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import type { Course } from '@/schema/course';
import type { CardKind, SessionItem, StudyMode } from '@/lib/buildSessionItems';
import { recallId, scoredEntries } from '@/lib/scored';
import { examTime, setPersonalScale } from '@/lib/memory';
import { nextSectionToLearn } from '@/lib/nextToLearn';
import { sessionFor, type Cards, type Kind } from '@/lib/practice';
import { useProgressStore } from '@/store/progress';
import { usePlanStore } from '@/store/plan';
import { useStudyLogStore } from '@/store/studyLog';
import { useSessionStore } from '@/store/session';
import { useLearnStore } from '@/store/learn';
import { makeCourse, type CourseShape, type SectionShape } from './course';
import { rng } from './random';
import { chanceRight, FIRST_TIME, MEMORY, SECONDS, type MemoryModel } from './student';

/**
 * A class's Practice before a test: the lectures one after another (the
 * default), or mixed in one sitting (lib/mixLectures, store/session initMixed).
 *
 *   npx vitest run --config vitest.sim.config.ts sim/class-practice.sim.ts
 *   SIM_SEEDS=10  more seeds (default 5)
 *
 * Five synthetic lectures sized like the owner's cognitive neuroscience
 * class (counts only: 35 to 230 cards a lecture). One lecture every three
 * days, each learned through Learn the day it comes, a little Review of
 * every lecture each day after; then, on the three evenings before the test,
 * the class's Practice for a set time instead. Both ways ask the same cards,
 * built by the same calls (each lecture's list as its own session builds
 * it); only the order differs. Everything up to the practice days is run
 * once per student and seed and shared by every variant.
 *
 * What it can and cannot see. The simulated student's memory of each card
 * is independent of every other card and depends only on when it was last
 * answered. Interleaving's proposed gain, telling apart similar ideas from
 * different lectures, does not exist in this student. So the order of a
 * sitting can only matter through (a) which cards a sitting cut short
 * reaches, and (b) minutes of difference in when each card was answered. A
 * difference here is about coverage, never about discrimination.
 *
 * Randomness is per card (common random numbers): a card answered at the
 * same recall gets the same outcome in both arms, so the comparison is not
 * swamped by which cards happened to be got right.
 *
 * Writes sim/results/class-practice.md.
 */

const DAY = 864e5;
const MIN = 6e4;
/** A Monday, 7pm. */
const START = new Date(2026, 9, 5, 19).getTime();
const CODE = 'SIM 101';

/** Per lecture: sections and totals of each kind (one real class, counts only). */
const CLASS: { name: string; sections: number; definition: number; mcq: number; flashcard: number; example: number; graphic: number }[] = [
  { name: 'A', sections: 11, definition: 22, mcq: 55, flashcard: 43, example: 10, graphic: 0 },
  { name: 'B', sections: 11, definition: 29, mcq: 48, flashcard: 23, example: 5, graphic: 1 },
  { name: 'C', sections: 4, definition: 0, mcq: 20, flashcard: 15, example: 0, graphic: 0 },
  { name: 'D', sections: 9, definition: 79, mcq: 93, flashcard: 49, example: 7, graphic: 2 },
  { name: 'E', sections: 12, definition: 38, mcq: 75, flashcard: 49, example: 7, graphic: 0 },
];
/** Release order: not the library's (alphabetical) order, as in a real term. */
const RELEASE = ['E', 'B', 'D', 'A', 'C'];
const RELEASE_EVERY = 3;
const TEST_DAY = 16;
const PRACTICE_DAYS = [13, 14, 15];
/** Minutes of Review a day before the practice days, shared by the lectures released so far. */
const BASE_REVIEW_MIN = 20;

function lectureShape(l: (typeof CLASS)[number]): CourseShape {
  const split = (total: number, j: number) => Math.floor(total / l.sections) + (j < total % l.sections ? 1 : 0);
  const sections: SectionShape[] = Array.from({ length: l.sections }, (_, j) => ({
    definition: split(l.definition, j),
    mcq: split(l.mcq, j),
    flashcard: split(l.flashcard, j),
    example: split(l.example, j),
    graphic: split(l.graphic, j),
  }));
  return { name: `class-${l.name}`, source: 'Counts of one real lecture.', sections, termsPerItem: 2.8, untagged: 0.04, abbreviated: 0.16, answerIsTerm: 0.15 };
}

/** A uniform number from a string key: the same every time for the same key and seed. */
function uniform(seed: number, key: string): number {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return rng(h >>> 0)();
}

const COURSES: [string, Course][] = CLASS.map((l, k) => {
  const c = makeCourse(lectureShape(l), 100 + k);
  return [`lec-${l.name}`, { ...c, metadata: { ...c.metadata, title: `${CODE}: ${l.name}`, course_code: CODE } }];
});
const TEST_ISO = (() => {
  const d = new Date(START + TEST_DAY * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();
for (const [, c] of COURSES) c.metadata.exam_date = TEST_ISO;
const BY_ID = new Map(COURSES);
/** The library's order: by title. */
const ORDER = [...COURSES].sort(([, a], [, b]) => a.metadata.title.localeCompare(b.metadata.title)).map(([id]) => id);

interface Truth {
  s: number;
  last: number;
  firstMiss: boolean;
  /** The last answer was a miss. */
  missed: boolean;
  n: number;
}

/** Everything a run carries from one day to the next. */
interface World {
  now: number;
  truth: Map<string, Truth>;
  primed: Map<string, number>;
  progress: ReturnType<typeof useProgressStore.getState>['byCourse'];
  log: ReturnType<typeof useStudyLogStore.getState>['byCourse'];
}

const keyOf = (courseId: string, id: string) => `${courseId}|${id}`;
const store = useSessionStore.getState;

/** The simulated student, sitting in front of whatever the session store holds. */
function student(memory: MemoryModel, seed: number, w: World) {
  const answer = (courseId: string, item: SessionItem) => {
    const key = keyOf(courseId, item.id);
    const T = w.truth.get(key);
    const R = T ? memory.recall((w.now - T.last) / DAY, T.s) : null;
    let p: number;
    if (R != null) p = chanceRight(item, R);
    else if (item.type === 'recall' || (item.type === 'flashcard' && w.primed.has(key))) {
      const at = w.primed.get(key);
      p = at != null ? FIRST_TIME.primedRecall * Math.exp(-(w.now - at) / (FIRST_TIME.primedFadeMinutes * MIN)) : FIRST_TIME.coldRecall;
      if (item.type === 'flashcard') p = Math.max(p, FIRST_TIME.flashcard);
    } else p = item.type === 'mcq' ? FIRST_TIME.mcq : FIRST_TIME.flashcard;
    const n = T?.n ?? 0;
    const got = uniform(seed, `${key}#${n}`) < p;
    const ease = 0.5 + uniform(seed, `${key}#ease`);
    w.truth.set(key, {
      s: got ? (T && !T.firstMiss ? memory.grow(T.s, R ?? 0, ease) : memory.first(ease)) : memory.lapse(T?.s ?? null, ease),
      last: w.now,
      firstMiss: !got && (T == null || T.firstMiss),
      missed: !got,
      n: n + 1,
    });
    // The app records it: in the card's own lecture (store/session.ts, lectureOf).
    store().record(got);
  };
  /** Walk the session until it ends or the time does. */
  const sit = (capMs: number, used: { ms: number }): 'done' | 'out' => {
    for (;;) {
      if (used.ms >= capMs) return 'out';
      const item = store().current();
      if (!item) return 'done';
      const owner = item._courseId ?? store().courseId!;
      const ms = SECONDS[item.type] * 1000;
      w.now += ms;
      used.ms += ms;
      if (item.type === 'definition') w.primed.set(keyOf(owner, recallId(item.id)), w.now);
      if (item.type === 'preview') w.primed.set(keyOf(owner, item.target.id), w.now);
      if (item.type === 'mcq' || item.type === 'flashcard' || item.type === 'recall') answer(owner, item);
      if (!store().next()) return 'done';
    }
  };
  return { sit };
}

function begin(w: World) {
  useProgressStore.setState({ byCourse: w.progress });
  useStudyLogStore.setState({ byCourse: w.log, logCard: () => {} });
  usePlanStore.setState({ byCourse: {} });
  useLearnStore.setState({ questionsFirst: false });
  setPersonalScale(1);
  Date.now = () => w.now;
}
function end(w: World) {
  w.progress = useProgressStore.getState().byCourse;
  w.log = useStudyLogStore.getState().byCourse;
}
const copy = (w: World): World => ({ ...w, truth: new Map(w.truth), primed: new Map(w.primed) });

/** The days before the practice days, the same for every variant. */
function before(memory: MemoryModel, seed: number): World {
  const w: World = { now: START, truth: new Map(), primed: new Map(), progress: {}, log: {} };
  begin(w);
  Math.random = rng(seed * 7919 + 3);
  const { sit } = student(memory, seed, w);
  for (let day = 0; day < PRACTICE_DAYS[0]; day++) {
    w.now = START + day * DAY;
    const out = RELEASE.slice(0, Math.floor(day / RELEASE_EVERY) + 1).map((n) => `lec-${n}`);
    for (const id of out) {
      store().setPendingKind(null);
      store().setPendingStudy(null);
      store().init(id, BY_ID.get(id)!, 'review');
      if (store().items.length) sit((BASE_REVIEW_MIN / out.length) * MIN, { ms: 0 });
    }
    if (day % RELEASE_EVERY === 0 && RELEASE[day / RELEASE_EVERY]) {
      const id = `lec-${RELEASE[day / RELEASE_EVERY]}`;
      const course = BY_ID.get(id)!;
      for (let k = 0; k < 40; k++) {
        const next = nextSectionToLearn(course, useProgressStore.getState().getProgress(id));
        if (!next) break;
        store().init(id, course, 'learn', next.section.id);
        if (!store().items.length) break;
        const known = w.truth.size;
        sit(Infinity, { ms: 0 });
        // Only a held-back second look is left: it waits for another day.
        if (w.truth.size === known) break;
      }
    }
  }
  end(w);
  return w;
}

type Arm = 'one-by-one' | 'mixed';

interface Result {
  score: number;
  /** The lecture with the lowest expected score. */
  weakest: number;
  /** How many lectures the practice days reached at all. */
  reached: number;
  minutes: number;
  /** Cards whose last answer was a miss, and the mean hours from that answer to the test. */
  misses: number;
  missHours: number;
}

function practise(start: World, memory: MemoryModel, seed: number, arm: Arm, cards: Cards, kind: Kind, budgetMin: number): Result {
  const w = copy(start);
  begin(w);
  const { sit } = student(memory, seed, w);
  const go = sessionFor(cards, kind);
  const mode = go.mode as StudyMode;
  const reached = new Set<string>();
  let ms = 0;
  for (const day of PRACTICE_DAYS) {
    w.now = START + day * DAY;
    // The same shuffles in both arms: each lecture's list is built in the
    // same order from the same draws.
    Math.random = rng(seed * 104729 + day);
    store().setPendingKind((go.kind as CardKind | undefined) ?? null);
    store().setPendingStudy(null);
    const used = { ms: 0 };
    const cap = budgetMin * MIN;
    const counted = new Map([...w.truth].map(([k, t]) => [k, t.n]));
    if (arm === 'one-by-one') {
      // Each lecture's session, then the next lecture with cards (CardSession,
      // nextPracticeFor). Built up front, as the mixed sitting's are.
      const lists = ORDER.map((id) => {
        store().init(id, BY_ID.get(id)!, mode);
        return { courseId: id, items: store().items };
      });
      for (const { courseId, items } of lists) {
        if (used.ms >= cap) break;
        if (!items.length) continue;
        useSessionStore.setState({ courseId, items, index: 0, answeredIndices: new Set(), results: new Map() });
        sit(cap, used);
      }
    } else {
      // The app's own mixed sitting (store/session initMixed, lib/mixLectures).
      store().initMixed(ORDER[0], ORDER.map((id) => [id, BY_ID.get(id)!] as [string, Course]), mode);
      sit(cap, used);
    }
    ms += used.ms;
    for (const [key, t] of w.truth) if (counted.get(key) !== t.n) reached.add(key.split('|')[0]);
  }
  end(w);

  const examAt = examTime(TEST_ISO)!;
  let total = 0;
  let n = 0;
  const perLecture: number[] = [];
  for (const [id, c] of COURSES) {
    const entries = c.sections.flatMap((s) => scoredEntries(s.items));
    const sum = entries.reduce((a, e) => {
      const T = w.truth.get(keyOf(id, e.id));
      const R = T ? memory.recall((examAt - T.last) / DAY, T.s) : 0;
      return a + (e.item.type === 'mcq' ? R + (1 - R) * 0.25 : R);
    }, 0);
    total += sum;
    n += entries.length;
    perLecture.push(sum / (entries.length || 1));
  }
  const missed = [...w.truth.values()].filter((t) => t.missed);
  const missHours = missed.reduce((a, t) => a + (examAt - t.last) / 3_600_000, 0) / (missed.length || 1);
  return { score: total / n, weakest: Math.min(...perLecture), reached: reached.size, minutes: Math.round(ms / MIN), misses: missed.length, missHours };
}

it('class practice: one lecture after another, or mixed', () => {
  Storage.prototype.setItem = () => {};
  const seeds = Number(process.env.SIM_SEEDS ?? 5);
  const realNow = Date.now;
  const realRandom = Math.random;
  const started = realNow();
  const pct = (x: number) => (x * 100).toFixed(1);
  const lines = [
    '| Student | Cards | Minutes a day | One by one: score / weakest lecture / lectures reached | Mixed: score / weakest / reached | Mixed − one by one, score (points) | … weakest lecture | Missed at the last answer: cards, hours to the test (one by one → mixed) |',
    '|---|---|---|---|---|---|---|---|',
  ];
  // SIM_CHOICES=weakest:all,due:all and SIM_BUDGETS=600 run part of the table.
  const CHOICES = (process.env.SIM_CHOICES ?? 'due:all,weakest:all,everything:all,everything:questions')
    .split(',')
    .map((c) => c.split(':') as [Cards, Kind]);
  const BUDGETS = (process.env.SIM_BUDGETS ?? '15,30,60,600').split(',').map(Number);
  try {
    for (const name of (process.env.SIM_MEMORY ?? 'fsrs,harsh,slow').split(',')) {
      const memory = MEMORY[name];
      const bases = Array.from({ length: seeds }, (_, s) => before(memory, s + 1));
      for (const [cards, kind] of CHOICES) {
        for (const budget of BUDGETS) {
          const runs = (arm: Arm) => bases.map((b, s) => practise(b, memory, s + 1, arm, cards, kind, budget));
          const one = runs('one-by-one');
          const mixed = runs('mixed');
          const mean = (rs: Result[], f: (r: Result) => number) => rs.reduce((a, r) => a + f(r), 0) / rs.length;
          const diff = (f: (r: Result) => number) => {
            const d = mixed.map((r, i) => f(r) - f(one[i]));
            const m = d.reduce((a, b) => a + b, 0) / d.length;
            const sd = Math.sqrt(d.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, d.length - 1));
            return `${m >= 0 ? '+' : ''}${(m * 100).toFixed(2)} ± ${(sd * 100).toFixed(2)}`;
          };
          const cell = (rs: Result[]) => `${pct(mean(rs, (r) => r.score))} / ${pct(mean(rs, (r) => r.weakest))} / ${mean(rs, (r) => r.reached).toFixed(1)}`;
          lines.push(
            `| ${name} | ${cards}${kind === 'all' ? '' : ` ${kind}`} | ${budget >= 600 ? `to the end (${Math.round(mean(one, (r) => r.minutes) / PRACTICE_DAYS.length)})` : budget} | ${cell(one)} | ${cell(mixed)} | ${diff((r) => r.score)} | ${diff((r) => r.weakest)} | ${Math.round(mean(one, (r) => r.misses))}, ${mean(one, (r) => r.missHours).toFixed(1)} h → ${Math.round(mean(mixed, (r) => r.misses))}, ${mean(mixed, (r) => r.missHours).toFixed(1)} h |`,
          );
        }
      }
    }
  } finally {
    Date.now = realNow;
    Math.random = realRandom;
  }
  mkdirSync('sim/results', { recursive: true });
  const header = `# Class Practice: one lecture after another, or mixed · ${seeds} seed(s) · ${Math.round((realNow() - started) / 1000)}s`;
  writeFileSync('sim/results/class-practice.md', `${header}\n\n${lines.join('\n')}\n`);
}, 3_600_000);
