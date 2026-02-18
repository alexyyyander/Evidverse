import { cn } from "@/lib/cn";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

type ErrorStateVariant = "default" | "destructive" | "warning" | "success";

export default function ErrorState({
  title = "Something went wrong",
  description,
  variant = "destructive",
  className,
}: {
  title?: string;
  description?: string;
  variant?: ErrorStateVariant;
  className?: string;
}) {
  const Icon =
    variant === "destructive" ? AlertCircle :
    variant === "warning" ? AlertTriangle :
    variant === "success" ? CheckCircle2 :
    Info;

  const variantStyles =
    variant === "destructive" ? "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive" :
    variant === "warning" ? "border-yellow-500/50 text-yellow-600 dark:border-yellow-500 [&>svg]:text-yellow-600" :
    variant === "success" ? "border-green-500/50 text-green-600 dark:border-green-500 [&>svg]:text-green-600" :
    "bg-background text-foreground";

  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
        variantStyles,
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <h5 className="mb-1 font-medium leading-none tracking-tight">{title}</h5>
      {description ? <div className="text-sm opacity-90">{description}</div> : null}
    </div>
  );
}
