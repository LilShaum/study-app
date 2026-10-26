import type { Course } from '@/schema/course';
import { saveFile } from './backup';

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
export function exportCourse(id: string, course: Course): Promise<boolean> {
  // The share sheet on a phone (Save to Files, AirDrop, another app): a plain
  // download from a home-screen app on an iPhone went nowhere (the owner,
  // 2026-10-26). A download on a computer. Same path as a backup.
  return saveFile(`${id}.study.json`, JSON.stringify(course, null, 2));
}
