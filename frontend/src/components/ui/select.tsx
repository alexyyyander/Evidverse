"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Check, ChevronDown } from "lucide-react";

type SelectContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelect() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error("useSelect must be used within a Select");
  }
  return context;
}

const Select = ({
  children,
  value,
  onValueChange,
  defaultValue,
}: {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
}) => {
  const [open, setOpen] = React.useState(false);
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);

  const currentValue = value !== undefined ? value : uncontrolledValue;
  const handleValueChange = (val: string) => {
    onValueChange?.(val);
    if (value === undefined) {
      setUncontrolledValue(val);
    }
  };

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        onValueChange: handleValueChange,
        open,
        setOpen,
      }}
    >
      <div className="relative inline-block w-full text-left">{children}</div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { open, setOpen } = useSelect();

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-none border border-white/10 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-200 ring-offset-background placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-300 hover:bg-zinc-900/50 hover:border-white/20",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50 transition-transform duration-300" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }
>(({ className, placeholder, children, ...props }, ref) => {
  const { value } = useSelect();
  return (
    <span ref={ref} className={cn("block truncate", className)} {...props}>
      {children || (value ? value : <span className="text-zinc-500">{placeholder}</span>)}
    </span>
  );
});
SelectValue.displayName = "SelectValue";

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { open, setOpen } = useSelect();
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
        "absolute z-50 min-w-[8rem] overflow-hidden rounded-none border border-white/10 bg-zinc-950 text-zinc-200 shadow-xl animate-in fade-in-0 zoom-in-95",
        "top-full mt-1 w-full",
        className
      )}
      {...props}
    >
      <div className="p-1">{children}</div>
    </div>
  );
});
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string; disabled?: boolean }
>(({ className, children, value, disabled, ...props }, ref) => {
  const { value: selectedValue, onValueChange, setOpen } = useSelect();
  const isSelected = selectedValue === value;

  return (
    <div
      ref={ref}
      aria-disabled={disabled ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-none py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-zinc-900 focus:text-white data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-zinc-900 hover:text-white",
        disabled ? "pointer-events-none opacity-50" : "",
        className
      )}
      onClick={() => {
        if (disabled) return;
        onValueChange?.(value);
        setOpen(false);
      }}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <Check className="h-4 w-4" />}
      </span>
      <span className="truncate">{children}</span>
    </div>
  );
});
SelectItem.displayName = "SelectItem";

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
