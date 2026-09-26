import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from '@/lib/safeStorage';

/**
 * What studying actually looks like on this device: how long cards take,
 * and how answers go after a gap.
 *
 * The app plans sittings with guessed seconds per card, and the simulator
 * rests on guessed forgetting (sim/FINDINGS.md). This is where the guesses
 * get replaced: card times feed Today's sizing directly (`pace`), and the
 * answer log is what the simulator's student is calibrated against — above
 * all, how fast a missed card is forgotten, the one number the audit found
 * everything else waits on.
 *
 * Local only, capped, and never exported with a course.
 */

export interface CardTime {
  /** Card type as the session shows it: definition, recall, mcq, … */
  type: string;
  seconds: number;
}

export interface AnswerEvent {
  at: number;
  type: string;
  got: boolean;
  /** Hours since this card was last answered, or null the first time. */
  sinceHours: number | null;
  /** Whether that last answer was a miss. */
  afterMiss: boolean;
  /** Recall the app's model expected at this moment, or null the first time. */
  predicted: number | null;
}

interface CourseLog {
  times: CardTime[];
  answers: AnswerEvent[];
  /** Seconds studied, by local date (YYYY-MM-DD). */
  days: Record<string, number>;
}

const MAX_TIMES = 1500;
const MAX_ANSWERS = 3000;
/** A card left open longer than this was not being studied. */
const MAX_CARD_SECONDS = 180;

const EMPTY: CourseLog = { times: [], answers: [], days: {} };

export const dayKey = (at: number) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface StudyLogState {
  byCourse: Record<string, CourseLog>;
  logCard: (courseId: string, type: string, seconds: number, at: number) => void;
  logAnswer: (courseId: string, event: AnswerEvent) => void;
  clear: (courseId?: string) => void;
}

export const useStudyLogStore = create<StudyLogState>()(
  persist(
    (set) => ({
      byCourse: {},
      logCard: (courseId, type, seconds, at) => {
        if (!(seconds > 0)) return;
        const s = Math.min(MAX_CARD_SECONDS, seconds);
        set((state) => {
          const log = state.byCourse[courseId] ?? EMPTY;
          const day = dayKey(at);
          return {
            byCourse: {
              ...state.byCourse,
              [courseId]: {
                ...log,
                times: [...log.times, { type, seconds: Math.round(s) }].slice(-MAX_TIMES),
                days: { ...log.days, [day]: (log.days[day] ?? 0) + s },
              },
            },
          };
        });
      },
      logAnswer: (courseId, event) =>
        set((state) => {
          const log = state.byCourse[courseId] ?? EMPTY;
          return {
            byCourse: { ...state.byCourse, [courseId]: { ...log, answers: [...log.answers, event].slice(-MAX_ANSWERS) } },
          };
        }),
      clear: (courseId) =>
        set((state) => {
          if (!courseId) return { byCourse: {} };
          const rest = { ...state.byCourse };
          delete rest[courseId];
          return { byCourse: rest };
        }),
    }),
    { name: 'arborous:study-log', storage: safeJSONStorage },
  ),
);

/** Enough of one card type to trust its median. */
const MIN_SAMPLES = 15;

/**
 * Median seconds per card type across every course on this device, for the
 * types with enough samples; the rest keep the built-in guesses.
 */
export function measuredPace(byCourse: Record<string, CourseLog>): Record<string, number> {
  const byType = new Map<string, number[]>();
  for (const log of Object.values(byCourse)) {
    for (const t of log.times.slice(-400)) {
      const list = byType.get(t.type) ?? [];
      list.push(t.seconds);
      byType.set(t.type, list);
    }
  }
  const out: Record<string, number> = {};
  for (const [type, list] of byType) {
    if (list.length < MIN_SAMPLES) continue;
    const sorted = [...list].sort((a, b) => a - b);
    out[type] = sorted[Math.floor(sorted.length / 2)];
  }
  return out;
}
