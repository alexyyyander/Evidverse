"use client";

import * as React from "react";
import { create } from "zustand";
import { cn } from "@/lib/cn";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

type ToastVariant = "default" | "success" | "destructive";

type ToastItem = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
};

type ToastStore = {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
};

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [
        { ...toast, id, variant: toast.variant || "default" },
        ...state.toasts,
      ].slice(0, 5),
    }));
    
    if (toast.duration !== Infinity) {
        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id),
            }));
        }, toast.duration || 5000);
    }
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));

// Hooks
export function useToast() {
  const { addToast, dismissToast, clearToasts, toasts } = useToastStore();
  return {
    toast: addToast,
    dismiss: dismissToast,
    clear: clearToasts,
    toasts,
  };
}

// Standalone functions for compatibility
export const toast = (props: Omit<ToastItem, "id">) => {
  useToastStore.getState().addToast(props);
};

export const dismissToast = (id: string) => {
  useToastStore.getState().dismissToast(id);
};

export const clearToasts = () => {
  useToastStore.getState().clearToasts();
};

const variantStyles: Record<ToastVariant, string> = {
  default: "border-border bg-background text-foreground",
  destructive:
    "destructive group border-destructive bg-destructive text-destructive-foreground",
  success: "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400",
};

export function Toaster() {
  const { toasts, dismissToast } = useToastStore();

  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <div
            key={id}
            className={cn(
              "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full mt-4",
              variantStyles[variant || "default"]
            )}
            {...props}
          >
            <div className="grid gap-1">
              {title && <div className="text-sm font-semibold">{title}</div>}
              {description && (
                <div className="text-sm opacity-90">{description}</div>
              )}
            </div>
            {action}
            <button
              onClick={() => dismissToast(id)}
              className={cn(
                "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100",
                variant === "destructive" && "text-red-300 hover:text-red-50 focus:ring-red-400 focus:ring-offset-red-600"
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
