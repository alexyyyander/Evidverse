import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-none border border-white/10 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 transition-colors duration-300 focus:border-white/40 focus:bg-zinc-900/50 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export default Input;
