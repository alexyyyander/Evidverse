"use client";

import { cn } from "@/lib/cn";

export type EditorClip = {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
};

export default function AssetsGrid({
  clips,
  selectedVideoUrl,
  onSelect,
}: {
  clips: EditorClip[];
  selectedVideoUrl: string | null;
  onSelect: (videoUrl: string) => void;
}) {
  if (clips.length === 0) {
    return <div className="text-sm text-muted-foreground">No clips yet. Generate a video to see assets here.</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {clips.map((clip) => {
        const selected = selectedVideoUrl === clip.videoUrl;
        return (
          <button
            key={clip.id}
            type="button"
            className={cn(
              "relative aspect-video rounded-md overflow-hidden border border-border bg-secondary hover:border-ring transition-colors",
              selected ? "ring-2 ring-ring" : ""
            )}
            onClick={() => onSelect(clip.videoUrl)}
          >
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
              Clip
            </div>
          </button>
        );
      })}
    </div>
  );
}

