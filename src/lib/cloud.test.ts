import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Course } from '@/schema/course';

/*
 * A fake of the little of Supabase that sync uses: one user, one row. Enough
 * to check what sync sends and when, which the real backend cannot be asked
 * from a test.
 */
const row: { data?: unknown; updated_at?: string } = {};
const calls = { downloads: 0, uploads: 0 };
let clock = 0;

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'me@x.com' } } } }) },
    from: () => ({
      select: (cols: string) => ({
        eq: () => ({
          maybeSingle: async () => ({ data: row.updated_at ? { updated_at: row.updated_at } : null, error: null }),
          single: async () => {
            if (cols === 'data') calls.downloads++;
            return { data: { data: row.data }, error: null };
          },
        }),
      }),
      upsert: (value: { data: unknown }) => ({
        select: () => ({
          single: async () => {
            calls.uploads++;
            Object.assign(row, { data: JSON.parse(JSON.stringify(value.data)), updated_at: `t${++clock}` });
            return { data: { updated_at: row.updated_at }, error: null };
          },
        }),
      }),
    }),
  }),
}));

const course = (title: string) => ({ schema_version: '1.0', metadata: { title }, sections: [] }) as unknown as Course;

describe('syncNow', () => {
  beforeEach(async () => {
    localStorage.clear();
    for (const k of Object.keys(row)) delete (row as Record<string, unknown>)[k];
    calls.downloads = 0;
    calls.uploads = 0;
    const { useCoursesStore } = await import('@/store/courses');
    const { useSyncMetaStore } = await import('@/store/syncMeta');
    useCoursesStore.setState({ courses: {} });
    useSyncMetaStore.setState({ editedAt: {}, deletedAt: {}, lastSyncAt: null, remoteSeenAt: null, pushedHash: null });
  });

  it('uploads the first time, then sends nothing while nothing changes', async () => {
    const { syncNow } = await import('./cloud');
    const { useCoursesStore } = await import('@/store/courses');
    useCoursesStore.setState({ courses: { a: course('A') } });
    await syncNow();
    expect(calls.uploads).toBe(1);
    await syncNow();
    expect(calls.uploads).toBe(1);
    expect(calls.downloads).toBe(0);
  });

  it("downloads and merges another device's changes, and keeps this device's", async () => {
    const { syncNow } = await import('./cloud');
    const { useCoursesStore } = await import('@/store/courses');
    const { useSyncMetaStore } = await import('@/store/syncMeta');
    useCoursesStore.setState({ courses: { a: course('A') } });
    await syncNow();

    // Another device adds a course and saves.
    const other = JSON.parse(JSON.stringify(row.data));
    other.courses.b = course('B');
    other.editedAt.b = Date.now();
    Object.assign(row, { data: other, updated_at: `t${++clock}` });

    await syncNow();
    expect(calls.downloads).toBe(1);
    expect(Object.keys(useCoursesStore.getState().courses).sort()).toEqual(['a', 'b']);
    // A course arriving by sync is not a local edit.
    expect(useSyncMetaStore.getState().editedAt.b).toBe(other.editedAt.b);
  });

  it('stamps local edits and deletions so the other device can tell them apart', async () => {
    const { useCoursesStore } = await import('@/store/courses');
    const { useSyncMetaStore } = await import('@/store/syncMeta');
    useCoursesStore.getState().updateCourse('c', course('C'));
    expect(useSyncMetaStore.getState().editedAt.c).toBeGreaterThan(0);
    useCoursesStore.getState().removeCourse('c');
    expect(useSyncMetaStore.getState().deletedAt.c).toBeGreaterThan(0);
  });
});
