import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { StudyItem } from '@/schema/course';
import { useCoursesStore } from '@/store/courses';
import { toast } from '@/store/toast';
import { Icon } from '@/components/Icon';
import { Sheet } from '@/components/Sheet';
import { ItemRenderer } from '@/components/items/ItemRenderer';
import { EditItemForm } from '@/components/items/EditItemForm';
import { useMediaQuery, WIDE } from '@/lib/useMediaQuery';

/** The form without its own box: inside a sheet the sheet is the page. */
const BARE = 'p-5 [&>form]:rounded-none [&>form]:border-0 [&>form]:bg-transparent [&>form]:p-0';

/**
 * One item in Browse, with its Edit and Delete.
 *
 * Where EditableItem swaps the card for a form in place, this keeps the card
 * in view: on a phone the form is a sheet drawn up over the page (a form of
 * eight fields squeezed into the page's column was cramped), on a computer it
 * sits beside the card it changes. Saving, deleting and Undo are the same.
 */
export function BrowseItem({ courseId, sectionId, item }: { courseId: string; sectionId: string; item: StudyItem }) {
  const [editing, setEditing] = useState(false);
  const wide = useMediaQuery(WIDE);
  const updateItem = useCoursesStore((s) => s.updateItem);
  const deleteItem = useCoursesStore((s) => s.deleteItem);
  const insertItem = useCoursesStore((s) => s.insertItem);

  const form = (
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

  const handleDelete = () => {
    const removed = deleteItem(courseId, sectionId, item.id);
    toast('Item deleted.', {
      type: 'info',
      actionLabel: removed ? 'Undo' : undefined,
      // Back at its place: appending would reorder the section silently.
      onAction: removed ? () => insertItem(courseId, sectionId, removed.item, removed.index) : undefined,
    });
  };

  const card = (
    <div className="group relative">
      {/* Set aside while studying: shown here with the way back. */}
      {item.set_aside && (
        <div className="mb-2 flex items-baseline justify-between gap-3 border-l-2 border-border-strong pl-3 text-small text-text-2">
          <span>Set aside{item.set_aside.reason === 'wrong' ? ' as wrong' : ', not on my exam'}: out of study.</span>
          <button
            type="button"
            className="tap-safe shrink-0 text-text-3 underline-offset-4 hover:text-text hover:underline"
            onClick={() => useCoursesStore.getState().setAside(courseId, sectionId, item.id, null)}
          >
            Put back
          </button>
        </div>
      )}
      <ItemRenderer item={item} courseId={courseId} />
      {/* Hover-reveal with a pointer; always there, muted, on touch. */}
      <div className="pointer-events-none absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-70">
        <button
          type="button"
          aria-label="Edit item"
          title="Edit"
          onClick={() => setEditing(true)}
          className="pointer-events-auto flex h-7 w-7 items-center justify-center text-text-3 hover:text-text"
        >
          <Icon name="edit" size={14} />
        </button>
        <button
          type="button"
          aria-label="Delete item"
          title="Delete"
          onClick={handleDelete}
          className="pointer-events-auto flex h-7 w-7 items-center justify-center text-text-3 hover:text-error"
        >
          <Icon name="trash" size={14} />
        </button>
      </div>
    </div>
  );

  if (!editing) return card;
  if (wide) {
    return (
      <div className="grid grid-cols-2 items-start gap-x-8">
        <div className="min-w-0 opacity-60">{card}</div>
        <div className="min-w-0 border-l border-border pl-8 [&>form]:rounded-none [&>form]:border-0 [&>form]:bg-transparent [&>form]:p-0">
          {form}
        </div>
      </div>
    );
  }
  return (
    <>
      {card}
      {/* Out to the body: an entry off screen is laid out apart (.browse-entry), which would
          make this sheet's fixed position relative to the entry instead of the screen. */}
      {createPortal(
        <Sheet label="Edit item" title="Edit item" onClose={() => setEditing(false)} width="2xl">
          <div className={BARE}>{form}</div>
        </Sheet>,
        document.body,
      )}
    </>
  );
}
