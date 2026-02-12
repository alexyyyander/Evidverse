import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export default function PageContainer({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", className)} {...props}>
      {children}
    </div>
  );
}
