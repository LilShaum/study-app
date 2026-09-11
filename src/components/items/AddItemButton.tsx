import { useState } from 'react';
import type { ItemType, StudyItem } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { toast } from '@/store/toast';
import { createBlankItem } from '@/lib/createBlankItem';
import { generateId } from '@/lib/generateId';
import { Icon } from '@/components/Icon';
import { EditItemForm } from './EditItemForm';

const TYPES: { value: ItemType; label: string }[] = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'flashcard', label: 'Flashcard' },
  { value: 'definition', label: 'Definition' },
  { value: 'example', label: 'Worked Example' },
  { value: 'graphic', label: 'Diagram' },
];

interface AddItemButtonProps {
  courseId: string;
  sectionId: string;
}

/** A quiet "+ Add item" affordance at the end of a section's feed — type picker, then the edit form. */
export function AddItemButton({ courseId, sectionId }: AddItemButtonProps) {
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState<StudyItem | null>(null);
  const insertItem = useCoursesStore((s) => s.insertItem);

  if (draft) {
    return (
      <EditItemForm
        item={draft}
        onSave={(item) => {
          insertItem(courseId, sectionId, item);
          setDraft(null);
          toast('Item added.', { type: 'success' });
        }}
        onCancel={() => setDraft(null)}
      />
    );
  }

  if (picking) {
    return (
      <div className="flex flex-wrap gap-2 rounded-lg border border-dashed border-border p-3">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => {
              setDraft(createBlankItem(t.value, generateId(t.value)));
              setPicking(false);
            }}
            className="rounded border border-border bg-surface px-3 py-1.5 text-sm text-text-2 hover:border-accent-border hover:text-text"
          >
            {t.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPicking(false)}
          className="px-3 py-1.5 text-sm text-text-3 hover:text-text-2"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPicking(true)}
      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-sm text-text-3 hover:border-accent-border hover:text-text-2"
    >
      <Icon name="plus" size={14} />
      Add item
    </button>
  );
}
