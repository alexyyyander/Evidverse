import { cn } from "@/lib/cn";

export default function ErrorState({
  title = "Something went wrong",
  description,
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm", className)}>
      <div className="font-medium text-destructive-foreground">{title}</div>
      {description ? <div className="mt-1 text-destructive-foreground/80">{description}</div> : null}
    </div>
  );
}

