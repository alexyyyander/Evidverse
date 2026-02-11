"use client";

import { ReactNode, useEffect } from "react";
import { cn } from "@/lib/cn";

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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/60"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn("relative w-full max-w-md rounded-lg border border-border bg-popover text-popover-foreground shadow-soft")}
      >
        {(title || description) && (
          <div className="p-6 pb-3">
            {title ? <div className="text-lg font-semibold text-foreground">{title}</div> : null}
            {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
          </div>
        )}
        <div className={cn("p-6", title || description ? "pt-0" : "")}>{children}</div>
        {footer ? <div className="p-6 pt-0">{footer}</div> : null}
      </div>
    </div>
  );
}

