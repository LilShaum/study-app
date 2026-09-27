import type { SupabaseClient } from '@supabase/supabase-js';
import type { Course } from '@/schema/course';
import { parseCourse } from '@/schema/parseCourse';
import { useCoursesStore } from '@/store/courses';
import { useProgressStore } from '@/store/progress';
import { usePlanStore } from '@/store/plan';
import { useResumeStore } from '@/store/resume';
import { useStudyLogStore } from '@/store/studyLog';
import { useFallenStore } from '@/store/fallen';
import { applyingSync, useSyncMetaStore } from '@/store/syncMeta';
import { mergeSnapshots, type Snapshot } from './syncMerge';
import { BASE_PATH } from './basePath';

/**
 * Share links and sync, through the project's Supabase backend.
 *
 * Both values are public by design: the key only lets a browser do what the
 * database's row-level security allows (see docs/supabase.sql) — read one
 * shared course by its id, and read or write your own saved state once
 * signed in.
 *
 * The client library is loaded the first time it is needed, so the app's
 * first paint does not carry it for students who never sign in.
 */
const SUPABASE_URL = 'https://uepxpnqgrwvqruzexxsg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_08tGkIo7-Hr87W5668KEQg_O3JJYZ7m';

let client: Promise<SupabaseClient> | null = null;

export function cloud(): Promise<SupabaseClient> {
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_KEY, {
      // Not under the arborous: prefix, so a backup never carries a sign-in.
      auth: { storageKey: 'sb-arborous-auth', persistSession: true, autoRefreshToken: true },
    }),
  );
  return client;
}

/** Whether this device has a saved sign-in, without loading the client library. */
export function hasSavedSignIn(): boolean {
  try {
    return localStorage.getItem('sb-arborous-auth') != null;
  } catch {
    return false;
  }
}

/** A message a student can act on, from whatever the backend or the network threw. */
export function cloudError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (/invalid login credentials/i.test(msg)) return 'That email and password don’t match an account.';
  if (/already registered|already been registered/i.test(msg)) return 'There is already an account with that email. Sign in instead.';
  if (/password should be at least/i.test(msg)) return 'The password needs at least 6 characters.';
  if (/failed to fetch|network|load failed/i.test(msg)) return 'Couldn’t reach the server. Check your connection and try again.';
  return msg;
}

/* ---------------- sharing ---------------- */

/** Uploads a course and returns the link that opens it. Needs a sign-in. */
export async function shareCourse(course: Course): Promise<string> {
  const sb = await cloud();
  const { data, error } = await sb.from('shared_courses').insert({ course }).select('id').single();
  if (error) throw error;
  return `${window.location.origin}${BASE_PATH}#/shared/${data.id}`;
}

/** The course behind a share link, validated like an uploaded file. */
export async function fetchSharedCourse(id: string): Promise<Course> {
  const sb = await cloud();
  const { data, error } = await sb.rpc('get_shared_course', { share_id: id });
  if (error) throw error;
  if (!data) throw new Error('This link doesn’t point to a course. It may have been unshared.');
  const parsed = parseCourse(data);
  if (!parsed.ok) throw new Error('The shared course couldn’t be read.');
  return parsed.course;
}

/* ---------------- sync ---------------- */

const PER_COURSE = {
  plan: usePlanStore,
  resume: useResumeStore,
  studyLog: useStudyLogStore,
  fallen: useFallenStore,
} as const;

function localSnapshot(): Snapshot {
  const meta = useSyncMetaStore.getState();
  return {
    courses: useCoursesStore.getState().courses,
    editedAt: meta.editedAt,
    deletedAt: meta.deletedAt,
    progress: useProgressStore.getState().byCourse,
    perCourse: Object.fromEntries(
      Object.entries(PER_COURSE).map(([key, store]) => [key, (store.getState() as { byCourse: Record<string, unknown> }).byCourse]),
    ),
  };
}

function applySnapshot(s: Snapshot): void {
  applyingSync(() => {
    useCoursesStore.setState({ courses: s.courses });
    useSyncMetaStore.setState({ editedAt: s.editedAt, deletedAt: s.deletedAt });
    useProgressStore.setState({ byCourse: s.progress });
    for (const [key, store] of Object.entries(PER_COURSE)) {
      (store as unknown as { setState: (p: object) => void }).setState({ byCourse: s.perCourse[key] ?? {} });
    }
  });
}

/** A cheap fingerprint of a snapshot, to tell whether anything changed since the last upload. */
export function fingerprint(s: Snapshot): number {
  const text = JSON.stringify(s);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return h;
}

let running: Promise<void> | null = null;

/**
 * Merges this device with the saved copy and saves the result back, so both
 * end up the same. Does nothing when signed out. One at a time.
 */
export function syncNow(): Promise<void> {
  running ??= (async () => {
    const sb = await cloud();
    const { data: session } = await sb.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return;
    const meta = useSyncMetaStore.getState();

    // The whole saved copy is a megabyte or two, and the free plan's
    // bandwidth is metered: ask first whether it changed since this device
    // last saw it, and download only then.
    const head = await sb.from('user_state').select('updated_at').eq('user_id', userId).maybeSingle();
    if (head.error) throw head.error;
    const remoteAt = (head.data?.updated_at as string | undefined) ?? null;

    let merged = localSnapshot();
    if (remoteAt && remoteAt !== meta.remoteSeenAt) {
      const { data, error } = await sb.from('user_state').select('data').eq('user_id', userId).single();
      if (error) throw error;
      merged = mergeSnapshots(merged, data.data as Snapshot);
      applySnapshot(merged);
    }

    // And upload only what changed since this device last did.
    const hash = fingerprint(merged);
    if (remoteAt && remoteAt === meta.remoteSeenAt && hash === meta.pushedHash) {
      useSyncMetaStore.getState().setLastSync(Date.now(), remoteAt, hash);
      return;
    }
    const updatedAt = new Date().toISOString();
    const { data: saved, error: saveError } = await sb
      .from('user_state')
      .upsert({ user_id: userId, data: merged, updated_at: updatedAt })
      .select('updated_at')
      .single();
    if (saveError) throw saveError;
    useSyncMetaStore.getState().setLastSync(Date.now(), (saved?.updated_at as string | undefined) ?? updatedAt, hash);
  })().finally(() => {
    running = null;
  });
  return running;
}
