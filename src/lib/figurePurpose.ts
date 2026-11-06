import type { GraphicItem } from '@/schema/course';

/**
 * What a figure is for, said plainly. A diagram is read, never scored, so a
 * student cannot otherwise tell the pathway they will be asked about from the
 * picture that was there to make an idea concrete. The generator decides this
 * in its first pass (docs/proposals/narration.md).
 */
export function purposeLabel(purpose: GraphicItem['purpose']): string | null {
  if (purpose === 'know') return 'to know';
  if (purpose === 'picture') return 'just to picture it';
  return null;
}
