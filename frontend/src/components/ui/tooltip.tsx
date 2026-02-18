"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type TooltipContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function useTooltip() {
  const context = React.useContext(TooltipContext);
  if (!context) {
    throw new Error("useTooltip must be used within a Tooltip");
  }
  return context;
}

const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const Tooltip = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block group">{children}</div>
    </TooltipContext.Provider>
  );
};

const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, asChild, ...props }, ref) => {
  const { setOpen } = useTooltip();

  const handleMouseEnter = (e: React.MouseEvent) => {
    // @ts-ignore
    children.props?.onMouseEnter?.(e);
    setOpen(true);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    // @ts-ignore
    children.props?.onMouseLeave?.(e);
    setOpen(false);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      ...props,
      // @ts-ignore
      ref,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    });
  }

  return (
    <button
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className={cn(className)}
      {...props}
    >
      {children}
    </button>
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { open } = useTooltip();

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        "bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap",
        className
      )}
      {...props}
    />
  );
});
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
