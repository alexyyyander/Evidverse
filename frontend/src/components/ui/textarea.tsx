import { forwardRef, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-none border border-white/10 bg-zinc-950/30 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-700 transition-colors duration-300 focus:border-white/40 focus:bg-zinc-900/50 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

export default Textarea;
