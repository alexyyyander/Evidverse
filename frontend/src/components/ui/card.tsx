import * as React from "react"
import { cn } from "@/lib/cn"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "group relative overflow-hidden border border-white/10 bg-black/40 text-card-foreground transition-all duration-500 hover:border-white/20 hover:bg-black/60",
      // 超细边框感：利用 border-white/10 模拟
      // 直角设计：默认无圆角或极小圆角（由 globals.css 控制，这里不覆盖）
      className
    )}
    {...props}
  >
    {/* 独特的微光效果：Hover 时左上角有微弱光晕 */}
    <div className="pointer-events-none absolute -left-20 -top-20 h-40 w-40 bg-primary/10 blur-[50px] transition-all duration-700 group-hover:bg-primary/20" />
    
    {/* 独特的卡片装饰：右上角极简折角标记 */}
    <div className="absolute right-0 top-0 h-[1px] w-3 bg-white/20 transition-all duration-300 group-hover:w-6 group-hover:bg-primary/50" />
    <div className="absolute right-0 top-0 h-3 w-[1px] bg-white/20 transition-all duration-300 group-hover:h-6 group-hover:bg-primary/50" />

    <div className="relative z-10">
      {children}
    </div>
  </div>
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-xl font-light tracking-wide text-foreground/90", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-muted-foreground/60 uppercase tracking-widest", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0 text-sm font-light leading-relaxed text-muted-foreground", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
