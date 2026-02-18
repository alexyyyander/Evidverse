"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type PopoverContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopover() {
  const context = React.useContext(PopoverContext);
  if (!context) {
    throw new Error("usePopover must be used within a Popover");
  }
  return context;
}

const Popover = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-left">{children}</div>
    </PopoverContext.Provider>
  );
};

const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, asChild, ...props }, ref) => {
  const { open, setOpen } = usePopover();

  const handleClick = (e: React.MouseEvent) => {
    // @ts-ignore
    children.props?.onClick?.(e);
    setOpen(!open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      ...props,
      // @ts-ignore
      ref,
      onClick: handleClick,
      "data-state": open ? "open" : "closed",
    });
  }

  return (
    <button
      ref={ref}
      onClick={() => setOpen(!open)}
      className={cn(className)}
      data-state={open ? "open" : "closed"}
      {...props}
    >
      {children}
    </button>
  );
});
PopoverTrigger.displayName = "PopoverTrigger";

const PopoverContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { open, setOpen } = usePopover();
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useImperativeHandle(ref, () => contentRef.current!);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      setTimeout(() => window.addEventListener("click", handleClickOutside), 0);
    }
    return () => window.removeEventListener("click", handleClickOutside);
  }, [open, setOpen]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={contentRef}
      className={cn(
        "absolute z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        "top-full mt-2 left-0",
        className
      )}
      {...props}
    />
  );
});
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverContent };
