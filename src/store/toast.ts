import { create } from 'zustand';

export interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  duration: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState {
  toasts: ToastItem[];
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Fire-and-forget toast, callable from anywhere (stores, event handlers). */
export function toast(
  message: string,
  opts: Partial<Omit<ToastItem, 'id' | 'message'>> = {},
): void {
  const item: ToastItem = {
    id: nextId++,
    message,
    type: opts.type ?? 'info',
    duration: opts.duration ?? 6000,
    actionLabel: opts.actionLabel,
    onAction: opts.onAction,
  };
  useToastStore.setState((s) => ({ toasts: [...s.toasts, item] }));
}
