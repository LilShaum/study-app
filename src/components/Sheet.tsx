import { useRef, useState, type FormEvent, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';
import { Icon } from './Icon';
import { useDialog } from '@/lib/useDialog';

interface SheetProps {
  /** Read out for the dialog, and set as its heading unless `title` says otherwise. */
  label: string;
  title?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** A form sheet submits; its actions are buttons inside it. */
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  /** How wide it may grow on a larger screen. */
  width?: 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

const WIDTH = { md: 'sm:max-w-md', lg: 'sm:max-w-lg', xl: 'sm:max-w-xl', '2xl': 'sm:max-w-2xl', '4xl': 'sm:max-w-4xl' };

/** How far down a drag must carry the sheet, in pixels, before letting go closes it. */
const DROP_PX = 90;

/**
 * Something opened over the page: on a phone a sheet drawn up from the
 * bottom, on a larger screen a leaf laid over the page's middle
 * (docs/proposals/design-update.md, "Sheets from the bottom").
 *
 * On a phone the bottom is where the thumb is, the page stays in view above,
 * and a box in the middle of a small screen sat out of reach with its Close
 * in the far corner. Drawn as a page drawn up over the page: a rule along its
 * top edge and a short printer's mark to take hold of, not a rounded card.
 * Dragging the top down puts it away; Close and Escape do too, so the gesture
 * is never the only way.
 */
export function Sheet({ label, title, onClose, children, onSubmit, width = 'lg' }: SheetProps) {
  useDialog(onClose);
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);

  const grab = {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse') return;
      start.current = e.clientY;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (start.current === null) return;
      setDrag(Math.max(0, e.clientY - start.current));
    },
    onPointerUp: () => {
      if (start.current === null) return;
      start.current = null;
      if (drag > DROP_PX) onClose();
      else setDrag(0);
    },
    onPointerCancel: () => {
      start.current = null;
      setDrag(0);
    },
  };

  const body = (
    <>
      {/* The top edge: what a thumb takes hold of to put the sheet away. */}
      <div {...grab} className="touch-none select-none sm:touch-auto">
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
          <span className="h-px w-10 bg-text-3" />
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
          <h2 className="font-semibold text-text">{title ?? label}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="tap-safe -m-2 p-2 text-text-3 hover:text-text">
            <Icon name="x" size={18} />
          </button>
        </div>
      </div>
      {children}
    </>
  );

  const panel = `sheet-panel paper-grain w-full overflow-y-auto border-t-2 border-border-strong bg-surface pb-[env(safe-area-inset-bottom)]
    max-h-[92dvh] sm:my-8 sm:max-h-none sm:rounded-sm sm:border sm:pb-0 sm:shadow-md ${WIDTH[width]}`;
  const style = drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined;

  return (
    <div
      className="sheet-scrim fixed inset-0 z-50 flex items-end bg-black/40 sm:items-start sm:justify-center sm:overflow-y-auto sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={(e) => {
        // A tap on the page above the sheet puts it away, as on any phone;
        // not a form's, where a stray tap would throw away what was typed.
        if (e.target === e.currentTarget && !onSubmit) onClose();
      }}
    >
      {onSubmit ? (
        <form onSubmit={onSubmit} className={panel} style={style}>
          {body}
        </form>
      ) : (
        <div className={panel} style={style}>
          {body}
        </div>
      )}
    </div>
  );
}
