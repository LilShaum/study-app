import * as RadixToast from '@radix-ui/react-toast';
import { useToastStore, type ToastItem } from '@/store/toast';

/**
 * A slip laid on the page, so the left edge carries the verdict as a
 * printed rule rather than the whole box being tinted. The type colour goes
 * on that rule and stays off the message, which has to stay readable.
 */
const TYPE_CLASSES: Record<ToastItem['type'], string> = {
  success: 'border-l-success',
  error: 'border-l-error',
  info: 'border-l-text-3',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <RadixToast.Provider swipeDirection="right">
      {toasts.map((t) => (
        <RadixToast.Root
          key={t.id}
          duration={t.duration}
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
          className={`flex items-center justify-between gap-3 rounded-sm border border-border-light border-l-2 bg-surface px-4 py-3 text-text shadow-md ${TYPE_CLASSES[t.type]}`}
        >
          <RadixToast.Description className="text-sm">{t.message}</RadixToast.Description>
          {t.onAction && t.actionLabel && (
            <RadixToast.Action altText={t.actionLabel} asChild>
              <button
                type="button"
                className="press press-quiet shrink-0"
                onClick={() => {
                  t.onAction?.();
                  dismiss(t.id);
                }}
              >
                {t.actionLabel}
              </button>
            </RadixToast.Action>
          )}
        </RadixToast.Root>
      ))}
      <RadixToast.Viewport className="app-toast-viewport fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
    </RadixToast.Provider>
  );
}
