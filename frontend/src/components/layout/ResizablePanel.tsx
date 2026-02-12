import React, { useRef } from "react";
import { cn } from "@/lib/cn";

interface ResizablePanelProps {
  size: number;
  minSize?: number;
  maxSize?: number;
  direction: "horizontal" | "vertical";
  side: "start" | "end";
  className?: string;
  children: React.ReactNode;
  onResize: (size: number) => void;
  collapsed?: boolean;
}

export function ResizablePanel({
  size,
  minSize = 100,
  maxSize = 800,
  direction,
  side,
  className,
  children,
  onResize,
  collapsed = false,
}: ResizablePanelProps) {
  const isDragging = useRef(false);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    const startX = e.clientX;
    const startY = e.clientY;
    const startSize = size;

    const onMouseMove = (moveEvent: MouseEvent) => {
      let delta = 0;
      if (direction === "horizontal") {
        delta = moveEvent.clientX - startX;
        if (side === "end") delta = -delta;
      } else {
        delta = moveEvent.clientY - startY;
        if (side === "end") delta = -delta;
      }

      let newSize = startSize + delta;
      newSize = Math.max(minSize, Math.min(maxSize, newSize));
      onResize(newSize);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  };

  const handleClass = cn(
    "absolute z-10 flex items-center justify-center bg-border hover:bg-primary/50 transition-colors",
    direction === "horizontal" ? "w-1 h-full cursor-col-resize top-0" : "h-1 w-full cursor-row-resize left-0",
    direction === "horizontal" && side === "start" ? "right-0 translate-x-1/2" : "",
    direction === "horizontal" && side === "end" ? "left-0 -translate-x-1/2" : "",
    direction === "vertical" && side === "start" ? "bottom-0 translate-y-1/2" : "",
    direction === "vertical" && side === "end" ? "top-0 -translate-y-1/2" : ""
  );

  if (collapsed) {
    return <div className={cn(className, "hidden")} />;
  }

  return (
    <div
      className={cn("relative flex-shrink-0", className)}
      style={{
        width: direction === "horizontal" ? size : "100%",
        height: direction === "vertical" ? size : "100%",
      }}
    >
      {children}
      <div className={handleClass} onMouseDown={startResize} />
    </div>
  );
}
