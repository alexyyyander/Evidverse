"use client";

import { create } from "zustand";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";

type ToastVariant = "default" | "success" | "destructive";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastStore = {
  toasts: ToastItem[];
  toast: (t: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
  clear: () => void;
};

const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  toast: (t) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const next: ToastItem = { id, ...t };
    set((s) => ({ toasts: [next, ...s.toasts].slice(0, 5) }));
    window.setTimeout(() => get().dismiss(id), 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

export function toast(t: Omit<ToastItem, "id">) {
  useToastStore.getState().toast(t);
}

export function dismissToast(id: string) {
  useToastStore.getState().dismiss(id);
}

export function clearToasts() {
  useToastStore.getState().clear();
}

export function useToast() {
  return useToastStore((s) => ({ toast: s.toast, dismiss: s.dismiss, clear: s.clear }));
}

const variantClasses: Record<ToastVariant, string> = {
  default: "border-border bg-popover text-popover-foreground",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-50",
  destructive: "border-destructive/30 bg-destructive/15 text-destructive-foreground",
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore((s) => ({ toasts: s.toasts, dismiss: s.dismiss }));

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[360px] max-w-[calc(100vw-2rem)] space-y-2">
      {toasts.map((t) => (
        <div key={t.id} className={cn("rounded-lg border shadow-soft px-4 py-3", variantClasses[t.variant])}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{t.title}</div>
              {t.description ? <div className="mt-1 text-xs opacity-80">{t.description}</div> : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              className="rounded-md p-1 opacity-80 hover:opacity-100 hover:bg-white/10"
              onClick={() => dismiss(t.id)}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
