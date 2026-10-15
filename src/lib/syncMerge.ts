import type { Course } from '@/schema/course';
import type { ItemResult } from '@/store/progress';
import { MAX_ANSWERS, type AnswerEvent, type CourseLog } from '@/store/studyLog';

/**
 * Two devices' saved state, merged. Pure, so it can be tested without either.
 *
 * The rules, by what each piece is:
 * - Courses: per course, whichever side changed it last, where a deletion
 *   counts as a change. A course edited on the laptop and untouched on the
 *   phone comes from the laptop; one deleted after its last edit elsewhere
 *   stays deleted.
 * - Progress: per item, the record answered most recently. An answer is a
 *   fact about the student; the latest one is the truth about their memory.
 * - The study log: per course, answers from both devices (each is a moment,
 *   so the same one is kept once); studied time per day the larger of the
 *   two (exact when one device studied that day, short when both did, never
 *   counted twice by syncing again); card times this device's.
 * - The shared daily time: whichever device set it last.
 * - Everything else is per course and small: this device's copy where it has
 *   one, the other's where it does not.
 */
export interface Snapshot {
  courses: Record<string, Course>;
  editedAt: Record<string, number>;
  deletedAt: Record<string, number>;
  progress: Record<string, Record<string, ItemResult>>;
  /** Per-course records where this device's copy wins (plan, bookmarks, fallen leaves), and the study log, merged. */
  perCourse: Record<string, Record<string, unknown>>;
  /** One daily time for every lecture (store/plan `total`) and when it was set. Absent in copies saved before it synced. */
  planTotal?: { minutes: number | null; at: number };
}

export const EMPTY_SNAPSHOT: Snapshot = { courses: {}, editedAt: {}, deletedAt: {}, progress: {}, perCourse: {} };

const lastChange = (s: Snapshot, id: string) => Math.max(s.editedAt[id] ?? 0, s.deletedAt[id] ?? 0);
const isDeleted = (s: Snapshot, id: string) => !(id in s.courses) && (s.deletedAt[id] ?? 0) > 0;

function mergeProgress(a: Record<string, ItemResult> = {}, b: Record<string, ItemResult> = {}): Record<string, ItemResult> {
  const out: Record<string, ItemResult> = { ...b };
  for (const [id, r] of Object.entries(a)) {
    const other = out[id];
    if (!other || (r.lastSeen ?? 0) >= (other.lastSeen ?? 0)) out[id] = r;
  }
  return out;
}

const answerKey = (a: AnswerEvent) => `${a.at}:${a.type}:${a.got ? 1 : 0}`;

/** Two devices' logs of one course, merged (see the rules above). */
export function mergeLogs(local: CourseLog | undefined, remote: CourseLog | undefined): CourseLog | undefined {
  if (!local || !remote) return local ?? remote;
  const seen = new Set<string>();
  const answers = [...(local.answers ?? []), ...(remote.answers ?? [])]
    .filter((a) => {
      const k = answerKey(a);
      return !seen.has(k) && !!seen.add(k);
    })
    .sort((a, b) => a.at - b.at)
    .slice(-MAX_ANSWERS);
  const days: Record<string, number> = { ...(remote.days ?? {}) };
  for (const [day, s] of Object.entries(local.days ?? {})) days[day] = Math.max(days[day] ?? 0, s);
  return { times: local.times ?? [], answers, days };
}

export function mergeSnapshots(local: Snapshot, remote: Snapshot): Snapshot {
  const ids = new Set([
    ...Object.keys(local.courses),
    ...Object.keys(remote.courses),
    ...Object.keys(local.deletedAt),
    ...Object.keys(remote.deletedAt),
  ]);
  const out: Snapshot = { courses: {}, editedAt: {}, deletedAt: {}, progress: {}, perCourse: {} };

  for (const id of ids) {
    // Ties go to this device: it is the one the student is holding.
    const winner = lastChange(local, id) >= lastChange(remote, id) ? local : remote;
    const edited = Math.max(local.editedAt[id] ?? 0, remote.editedAt[id] ?? 0);
    const deleted = Math.max(local.deletedAt[id] ?? 0, remote.deletedAt[id] ?? 0);
    if (edited) out.editedAt[id] = edited;
    if (deleted) out.deletedAt[id] = deleted;
    if (isDeleted(winner, id)) continue;
    const course = winner.courses[id] ?? (winner === local ? remote : local).courses[id];
    if (!course) continue;
    out.courses[id] = course;
    const progress = mergeProgress(local.progress[id], remote.progress[id]);
    if (Object.keys(progress).length) out.progress[id] = progress;
  }

  for (const key of new Set([...Object.keys(local.perCourse), ...Object.keys(remote.perCourse)])) {
    const merged: Record<string, unknown> = { ...remote.perCourse[key], ...local.perCourse[key] };
    if (key === 'studyLog') {
      for (const id of Object.keys(merged))
        merged[id] = mergeLogs(local.perCourse[key]?.[id] as CourseLog | undefined, remote.perCourse[key]?.[id] as CourseLog | undefined);
    }
    // Nothing kept for a course that no longer exists.
    for (const id of Object.keys(merged)) if (!(id in out.courses)) delete merged[id];
    out.perCourse[key] = merged;
  }

  const total = [local.planTotal, remote.planTotal].filter((t): t is NonNullable<Snapshot['planTotal']> => !!t);
  // Ties go to this device, as for lectures.
  if (total.length) out.planTotal = total.reduce((a, b) => (b.at > a.at ? b : a));
  return out;
}
