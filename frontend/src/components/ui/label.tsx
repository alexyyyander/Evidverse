"use client"

import * as React from "react"
import { cn } from "@/lib/cn"

// Since we can't install @radix-ui/react-label, we'll simulate it with a standard label element
// keeping the API compatible if we switch later.

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
))
Label.displayName = "Label"

export { Label }
export default Label
