"use client";

import { ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/cn";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue || "");
  const currentValue = value ?? uncontrolledValue;

  const setValue = useCallback((next: string) => {
    onValueChange?.(next);
    if (value === undefined) setUncontrolledValue(next);
  }, [onValueChange, value]);

  const ctx = useMemo(() => ({ value: currentValue, setValue }), [currentValue, setValue]);

  return <TabsContext.Provider value={ctx}>{children}</TabsContext.Provider>;
}

export function TabsList({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-md bg-secondary p-1", className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: ReactNode;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");
  const active = ctx.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx.setValue(value)}
      className={cn(
        "h-9 px-3 rounded-md text-sm font-medium transition-colors",
        active ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: ReactNode;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");
  if (ctx.value !== value) return null;
  return <div className={cn("mt-4", className)}>{children}</div>;
}
