"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export default function GitGraphContextMenu({
  open,
  x,
  y,
  commitId,
  onClose,
  onAddToTimeline,
  onFork,
}: {
  open: boolean;
  x: number;
  y: number;
  commitId: string | null;
  onClose: () => void;
  onAddToTimeline: () => void;
  onFork: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      onClose();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      style={{ top: y, left: x }}
      className="fixed z-[70] w-[220px] rounded-md border border-border bg-popover text-popover-foreground shadow-soft p-1"
      role="menu"
      aria-label="Commit actions"
    >
      <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border">
        Commit: {commitId?.slice(0, 7)}
      </div>
      <button
        type="button"
        onClick={onAddToTimeline}
        className={cn(
          "mt-1 w-full rounded-md px-3 py-2 text-sm text-left",
          "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        Add to Timeline
      </button>
      <button
        type="button"
        onClick={onFork}
        className={cn(
          "w-full rounded-md px-3 py-2 text-sm text-left",
          "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        Fork from this Commit
      </button>
      <button
        type="button"
        onClick={onClose}
        className={cn(
          "w-full rounded-md px-3 py-2 text-sm text-left text-muted-foreground",
          "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        Cancel
      </button>
    </div>
  );
}
