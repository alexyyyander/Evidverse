import { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { PackageOpen } from "lucide-react";

export default function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center animate-in fade-in-50 zoom-in-95",
        "bg-card/40 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-6 relative group overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {icon ? (
          icon
        ) : (
          <PackageOpen className="h-10 w-10 text-muted-foreground/50 transition-transform group-hover:scale-110 group-hover:text-primary/50" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-foreground tracking-tight">{title}</h3>
      {description ? (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm text-balance">{description}</p>
      ) : null}
      {action ? <div className="mt-6 flex items-center justify-center">{action}</div> : null}
    </div>
  );
}
