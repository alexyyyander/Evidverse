"use client";

import Image from "next/image";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18nContext";

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
  const { t } = useI18n();
  if (clips.length === 0) {
    return <div className="text-sm text-muted-foreground">{t("assets.empty")}</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {clips.map((clip, index) => {
        const selected = selectedVideoUrl === clip.videoUrl;
        return (
          <button
            key={clip.id}
            type="button"
            aria-label={t("assets.selectClip").replace("{index}", String(index + 1))}
            className={cn(
              "relative aspect-video rounded-md overflow-hidden border border-border bg-secondary hover:border-ring transition-colors",
              selected ? "ring-2 ring-ring" : ""
            )}
            onClick={() => onSelect(clip.videoUrl)}
          >
            {clip.thumbnailUrl ? (
              <Image
                src={clip.thumbnailUrl}
                alt={t("assets.clipThumbnailAlt").replace("{index}", String(index + 1))}
                fill
                sizes="(max-width: 768px) 50vw, 220px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">{t("assets.clip")}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
