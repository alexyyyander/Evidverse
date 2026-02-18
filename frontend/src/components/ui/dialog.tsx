"use client";

import { ReactNode, useEffect } from "react";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";
import { t as translate } from "@/lib/i18n";

function getRuntimeLang() {
  if (typeof window === "undefined") return "zh" as const;
  try {
    const raw = window.localStorage.getItem("lang");
    if (raw === "en" || raw === "zh" || raw === "ja") return raw;
  } catch {}
  return "zh" as const;
}

export default function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden"; // Prevent background scroll
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:items-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-all duration-100 animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      
      {/* Content */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed z-50 grid w-full max-w-lg gap-4 border border-white/10 bg-zinc-950 p-8 shadow-2xl shadow-black duration-200 sm:rounded-none md:w-full",
          "top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4"
        )}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-none opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-white disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{translate(getRuntimeLang(), "common.close")}</span>
        </button>

        {(title || description) && (
          <div className="flex flex-col space-y-2 text-center sm:text-left">
            {title && <h2 className="text-xl font-light tracking-wide leading-none text-foreground">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        )}
        
        <div className="py-2">{children}</div>
        
        {footer && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
