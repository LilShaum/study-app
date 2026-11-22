import type { Course } from '@/schema/course';
import { toast } from '@/store/toast';

/** The AI's notes to the student (metadata.notes_for_student), blanks dropped. */
export function notesFromAI(course: Course): string[] {
  const raw = course.metadata.notes_for_student;
  return Array.isArray(raw) ? raw.map((n) => String(n).trim()).filter(Boolean) : [];
}

/** Shown once after a lecture is imported; nothing when the file has none. */
export function toastNotesFromAI(course: Course): void {
  const notes = notesFromAI(course);
  if (!notes.length) return;
  toast(`Notes from the AI\n${notes.map((n) => `• ${n}`).join('\n')}`, { type: 'info', duration: 30000 });
}
