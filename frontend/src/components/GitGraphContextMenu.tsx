"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18nContext";

export default function GitGraphContextMenu({
  open,
  x,
  y,
  commitId,
  onClose,
  onAddToTimeline,
  onFork,
  onMoveBoundary,
  forkDisabled,
  forkDisabledReason,
  forkDisabledReasonType,
  moveBoundaryDisabled,
  moveBoundaryDisabledReason,
  moveBoundaryDisabledReasonType,
  forkHintText,
  moveBoundaryHintText,
  onGoLogin,
}: {
  open: boolean;
  x: number;
  y: number;
  commitId: string | null;
  onClose: () => void;
  onAddToTimeline: () => void;
  onFork: () => void;
  onMoveBoundary?: () => void;
  forkDisabled?: boolean;
  forkDisabledReason?: string;
  forkDisabledReasonType?: "auth" | "permission";
  moveBoundaryDisabled?: boolean;
  moveBoundaryDisabledReason?: string;
  moveBoundaryDisabledReasonType?: "auth" | "permission";
  forkHintText?: string;
  moveBoundaryHintText?: string;
  onGoLogin?: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement | null>(null);
  const requiresLogin =
    (forkDisabled && forkDisabledReasonType === "auth") ||
    (moveBoundaryDisabled && moveBoundaryDisabledReasonType === "auth");
  const forkHint = forkDisabled && forkDisabledReason ? forkDisabledReason : forkHintText || "";
  const moveBoundaryHint =
    moveBoundaryDisabled && moveBoundaryDisabledReason
      ? moveBoundaryDisabledReason
      : moveBoundaryHintText || "";

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
      aria-label={t("graph.menu.actions")}
    >
      <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border">
        {t("graph.menu.commitPrefix")}: {commitId?.slice(0, 7)}
      </div>
      <button
        type="button"
        onClick={onAddToTimeline}
        className={cn(
          "mt-1 w-full rounded-md px-3 py-2 text-sm text-left",
          "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        {t("graph.menu.addToTimeline")}
      </button>
      <button
        type="button"
        onClick={onFork}
        disabled={forkDisabled}
        title={forkHint}
        className={cn(
          "w-full rounded-md px-3 py-2 text-sm text-left",
          "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        {t("graph.menu.forkFromCommit")}
      </button>
      <p className="px-3 pb-2 text-[11px] leading-snug text-muted-foreground">
        {forkHint}
      </p>
      {onMoveBoundary ? (
        <>
          <button
            type="button"
            onClick={onMoveBoundary}
            disabled={moveBoundaryDisabled}
            title={moveBoundaryHint}
            className={cn(
              "w-full rounded-md px-3 py-2 text-sm text-left",
              "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {t("graph.menu.moveBoundary")}
          </button>
          <p className="px-3 pb-2 text-[11px] leading-snug text-muted-foreground">
            {moveBoundaryHint}
          </p>
        </>
      ) : null}
      {requiresLogin && onGoLogin ? (
        <button
          type="button"
          onClick={onGoLogin}
          className={cn(
            "mb-1 w-full rounded-md px-3 py-2 text-sm text-left",
            "bg-secondary/70 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          {t("graph.menu.goLogin")}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onClose}
        className={cn(
          "w-full rounded-md px-3 py-2 text-sm text-left text-muted-foreground",
          "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        {t("common.cancel")}
      </button>
    </div>
  );
}
