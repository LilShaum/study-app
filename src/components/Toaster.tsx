import * as RadixToast from '@radix-ui/react-toast';
import { useToastStore, type ToastItem } from '@/store/toast';

const TYPE_CLASSES: Record<ToastItem['type'], string> = {
  success: 'border-success text-success',
  error: 'border-error text-error',
  info: 'border-border text-text',
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
          className={`flex items-center justify-between gap-3 rounded-lg border bg-surface px-4 py-3 shadow-md ${TYPE_CLASSES[t.type]}`}
        >
          <RadixToast.Description className="text-sm">{t.message}</RadixToast.Description>
          {t.onAction && t.actionLabel && (
            <RadixToast.Action altText={t.actionLabel} asChild>
              <button
                type="button"
                className="shrink-0 text-sm font-medium text-accent underline-offset-2 hover:underline"
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
      <RadixToast.Viewport className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
    </RadixToast.Provider>
  );
}
