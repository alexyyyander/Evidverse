import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import Spinner from "@/components/ui/spinner";

type IconButtonVariant = "ghost" | "secondary" | "destructive";

const variantClasses: Record<IconButtonVariant, string> = {
  ghost: "bg-transparent hover:bg-secondary text-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
};

export default function IconButton({
  className,
  variant = "ghost",
  loading,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: IconButtonVariant; loading?: boolean }) {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center justify-center rounded-md h-8 w-8 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {loading ? <Spinner size={16} className="text-current" /> : props.children}
    </button>
  );
}

