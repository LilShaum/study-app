import { useState } from 'react';
import type { StudyItem } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { toast } from '@/store/toast';
import { Icon } from '@/components/Icon';
import { ItemRenderer } from './ItemRenderer';
import { EditItemForm } from './EditItemForm';

interface EditableItemProps {
  courseId: string;
  sectionId: string;
  item: StudyItem;
}

/**
 * Wraps a card with edit/delete controls that stay invisible until the card
 * is hovered or focused — no settings clutter sitting on the page at rest.
 */
export function EditableItem({ courseId, sectionId, item }: EditableItemProps) {
  const [editing, setEditing] = useState(false);
  const updateItem = useCoursesStore((s) => s.updateItem);
  const deleteItem = useCoursesStore((s) => s.deleteItem);
  const insertItem = useCoursesStore((s) => s.insertItem);

  if (editing) {
    return (
      <EditItemForm
        item={item}
        onSave={(updated) => {
          updateItem(courseId, sectionId, item.id, updated);
          setEditing(false);
          toast('Item updated.', { type: 'success' });
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const handleDelete = () => {
    const removed = deleteItem(courseId, sectionId, item.id);
    toast('Item deleted.', {
      type: 'info',
      actionLabel: removed ? 'Undo' : undefined,
      onAction: removed ? () => insertItem(courseId, sectionId, removed) : undefined,
    });
  };

  return (
    <div className="group relative">
      <ItemRenderer item={item} />
      {/* Hover-reveal on pointer devices; always visible (but muted) on touch,
          where there is no hover and the controls would be unreachable. */}
      <div className="pointer-events-none absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-70">
        <button
          type="button"
          aria-label="Edit item"
          title="Edit"
          onClick={() => setEditing(true)}
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded border border-border bg-surface text-text-2 hover:text-text"
        >
          <Icon name="edit" size={14} />
        </button>
        <button
          type="button"
          aria-label="Delete item"
          title="Delete"
          onClick={handleDelete}
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded border border-border bg-surface text-error hover:bg-error-bg"
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
    </div>
  );
}
