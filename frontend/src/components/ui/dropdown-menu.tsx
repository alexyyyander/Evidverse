"use client";

import {
  ReactElement,
  ReactNode,
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";

type DropdownContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DropdownContext = createContext<DropdownContextValue | null>(null);

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ctx = useMemo(() => ({ open, setOpen }), [open]);
  return <DropdownContext.Provider value={ctx}>{children}</DropdownContext.Provider>;
}

export function DropdownMenuTrigger({ children }: { children: ReactElement }) {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error("DropdownMenuTrigger must be used within DropdownMenu");
  return cloneElement(children, {
    onClick: (e: any) => {
      children.props?.onClick?.(e);
      ctx.setOpen(!ctx.open);
    },
    "aria-expanded": ctx.open,
  });
}

export function DropdownMenuContent({
  className,
  children,
  align = "end",
}: {
  className?: string;
  children: ReactNode;
  align?: "start" | "end";
}) {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error("DropdownMenuContent must be used within DropdownMenu");
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ctx.open) return;
    const onClick = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) ctx.setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [ctx]);

  if (!ctx.open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-2 min-w-[180px] rounded-md border border-border bg-popover text-popover-foreground shadow-soft p-1",
        align === "end" ? "right-0" : "left-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  className,
  children,
  onSelect,
}: {
  className?: string;
  children: ReactNode;
  onSelect?: () => void;
}) {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error("DropdownMenuItem must be used within DropdownMenu");
  return (
    <button
      type="button"
      className={cn(
        "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-secondary hover:text-secondary-foreground transition-colors",
        className
      )}
      onClick={() => {
        onSelect?.();
        ctx.setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

