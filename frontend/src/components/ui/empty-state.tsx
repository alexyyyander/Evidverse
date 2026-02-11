import { ReactNode } from "react";
import { cn } from "@/lib/cn";

export default function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("text-center py-20 rounded-lg border border-border border-dashed bg-card/40", className)}>
      <div className="text-xl font-medium text-foreground">{title}</div>
      {description ? <div className="mt-2 text-sm text-muted-foreground">{description}</div> : null}
      {action ? <div className="mt-6 flex items-center justify-center">{action}</div> : null}
    </div>
  );
}

