"use client";

import { useEffect, useRef } from "react";

export default function PreviewPanel({ videoUrl, seekSeconds }: { videoUrl: string | null; seekSeconds?: number }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!videoUrl) return;
    if (typeof seekSeconds !== "number" || Number.isNaN(seekSeconds)) return;
    const t = Math.max(0, seekSeconds);
    try {
      ref.current.currentTime = t;
    } catch {
      return;
    }
  }, [seekSeconds, videoUrl]);

  return (
    <div className="flex-1 bg-black flex items-center justify-center relative">
      {videoUrl ? (
        <video ref={ref} src={videoUrl} controls className="max-h-full max-w-full" autoPlay />
      ) : (
        <div className="text-muted-foreground">Select a clip to preview</div>
      )}
    </div>
  );
}
