import type { Course } from '@/schema/course';

/**
 * Downloads a course as a `.study.json` file.
 *
 * This matters more than it did in the vanilla app: now that courses can be
 * edited and added to in-app, localStorage is the only copy of that work, and
 * it's one cache-clear away from gone. Export is the way back out.
 *
 * Serializes the stored object as-is — parseCourse deliberately keeps the
 * caller's original object rather than Zod's parsed copy, so unknown/future
 * fields survive an import → edit → export round-trip.
 */
export function exportCourse(id: string, course: Course): void {
  const json = JSON.stringify(course, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${id}.study.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}
