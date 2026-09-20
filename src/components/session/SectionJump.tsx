import { useMemo } from 'react';
import type { SessionItem, StudyMode } from '@/lib/buildSessionItems';
import { sessionSections } from '@/lib/sessionSections';

/**
 * Modes whose item list is still grouped by section.
 *
 * Mixed and Review Missed shuffle, and Weakest First reorders by accuracy, so
 * in those a section's items are scattered through the list and "jump to
 * section 5" would land you somewhere with no section-shaped run after it.
 * The control simply doesn't appear there.
 */
const GROUPED_MODES: StudyMode[] = ['learn', 'quiz', 'flashcards', 'definitions', 'browse'];

interface SectionJumpProps {
  items: SessionItem[];
  mode: StudyMode;
  activeSectionId: string | null;
  onJump: (sectionId: string) => void;
}

/**
 * Where you are in a long session, and a way to move.
 *
 * A 151-card Learn run covers eleven sections; without this the only way to
 * reach the fifth was to press → a hundred times or leave the session
 * entirely. The session store has had `jumpToSection` since the rebuild —
 * nothing had ever called it.
 *
 * A native <select> rather than a custom popover: it is one element, it is
 * keyboard-accessible for free, and on a phone it opens the OS picker, which
 * is a better list of eleven things than anything worth hand-rolling.
 */
export function SectionJump({ items, mode, activeSectionId, onJump }: SectionJumpProps) {
  const sections = useMemo(() => sessionSections(items), [items]);

  if (!GROUPED_MODES.includes(mode) || sections.length < 2) return null;

  const position = sections.findIndex((s) => s.id === activeSectionId);

  return (
    <div className="mb-4 flex items-center gap-2 text-xs text-text-3">
      <span className="shrink-0">
        Section {position >= 0 ? position + 1 : 1} of {sections.length}
      </span>
      <label className="min-w-0 flex-1">
        <span className="sr-only">Jump to section</span>
        <select
          value={activeSectionId ?? ''}
          onChange={(e) => onJump(e.target.value)}
          className="tap-safe w-full truncate rounded border border-border bg-surface px-2 py-1 text-xs text-text-2 focus:border-accent"
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} ({s.count})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
