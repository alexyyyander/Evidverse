import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";
import Spinner from "@/components/ui/spinner";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "outline" | "link";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-white text-black hover:bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-transparent",
  secondary: "bg-zinc-900 text-zinc-100 hover:bg-zinc-800 border border-white/10 hover:border-white/20",
  ghost: "hover:bg-white/5 hover:text-white text-zinc-400",
  destructive: "bg-red-950/30 text-red-400 border border-red-900/50 hover:bg-red-900/50 hover:border-red-500/50",
  outline: "border border-white/10 bg-transparent text-zinc-300 hover:bg-white hover:text-black hover:border-white transition-all duration-300",
  link: "text-zinc-400 underline-offset-4 hover:underline hover:text-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs tracking-wide",
  md: "h-10 px-6 py-2 text-xs uppercase tracking-widest",
  lg: "h-12 px-8 text-sm uppercase tracking-widest",
  icon: "h-9 w-9",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? <Spinner size={14} className="text-current" /> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
