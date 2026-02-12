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
  return (
    <DropdownContext.Provider value={ctx}>
      <div className="relative">{children}</div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ children }: { children: ReactElement }) {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error("DropdownMenuTrigger must be used within DropdownMenu");
  return cloneElement(children, {
    onClick: (e: any) => {
      children.props?.onClick?.(e);
      ctx.setOpen(!ctx.open);
    },
    onKeyDown: (e: any) => {
      children.props?.onKeyDown?.(e);
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        ctx.setOpen(!ctx.open);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        ctx.setOpen(true);
      }
      if (e.key === "Escape") {
        ctx.setOpen(false);
      }
    },
    "aria-haspopup": "menu",
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

  useEffect(() => {
    if (!ctx.open) return;
    window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>('[role="menuitem"]'));
      items[0]?.focus();
    }, 0);
  }, [ctx.open]);

  if (!ctx.open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-2 min-w-[180px] rounded-md border border-border bg-popover text-popover-foreground shadow-soft p-1",
        align === "end" ? "right-0" : "left-0",
        className
      )}
      role="menu"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          ctx.setOpen(false);
          return;
        }

        const el = ref.current;
        if (!el) return;
        const items = Array.from(el.querySelectorAll<HTMLElement>('[role="menuitem"]'));
        if (items.length === 0) return;
        const currentIndex = Math.max(0, items.findIndex((n) => n === document.activeElement));

        if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = items[(currentIndex + 1) % items.length];
          next?.focus();
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          const next = items[(currentIndex - 1 + items.length) % items.length];
          next?.focus();
        }
        if (e.key === "Home") {
          e.preventDefault();
          items[0]?.focus();
        }
        if (e.key === "End") {
          e.preventDefault();
          items[items.length - 1]?.focus();
        }
      }}
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
      role="menuitem"
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
