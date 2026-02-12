"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import IconButton from "@/components/ui/icon-button";
import { Repeat, StepBack, StepForward } from "lucide-react";
import { cn } from "@/lib/cn";

export default function PreviewPanel({ videoUrl, label }: { videoUrl: string | null; label?: string | null }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [loop, setLoop] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.loop = loop;
  }, [loop]);

  const safeLabel = useMemo(() => (typeof label === "string" && label.trim().length > 0 ? label.trim() : null), [label]);

  return (
    <div className="flex-1 bg-black flex items-center justify-center relative">
      {videoUrl ? (
        <>
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {safeLabel ? (
                <div className="px-2 py-1 rounded-md bg-black/60 text-xs text-white truncate">{safeLabel}</div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <IconButton
                aria-label="Toggle loop"
                variant="secondary"
                className={cn(loop ? "ring-2 ring-ring" : "")}
                onClick={() => setLoop((v) => !v)}
              >
                <Repeat size={16} />
              </IconButton>
              <IconButton
                aria-label="Step back"
                variant="secondary"
                onClick={() => {
                  const el = videoRef.current;
                  if (!el) return;
                  el.currentTime = Math.max(0, el.currentTime - 0.1);
                }}
              >
                <StepBack size={16} />
              </IconButton>
              <IconButton
                aria-label="Step forward"
                variant="secondary"
                onClick={() => {
                  const el = videoRef.current;
                  if (!el) return;
                  el.currentTime = Math.min(el.duration || el.currentTime + 0.1, el.currentTime + 0.1);
                }}
              >
                <StepForward size={16} />
              </IconButton>
            </div>
          </div>
          <video ref={videoRef} src={videoUrl} controls className="max-h-full max-w-full" autoPlay />
        </>
      ) : (
        <div className="text-muted-foreground">Select a clip to preview</div>
      )}
    </div>
  );
}
