import type { Course } from '@/schema/course';

/**
 * Derives a course's storage id, exactly matching the vanilla app's
 * Store.save() algorithm — required so ids stay stable across the
 * legacy → Zustand migration.
 */
export function slugifyCourseId(course: Pick<Course, 'metadata'>): string {
  const raw = course.metadata.course_code || course.metadata.title || 'course';
  return raw
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .replace(/_+/g, '_');
}
