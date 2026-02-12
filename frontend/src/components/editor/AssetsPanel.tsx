"use client";

import { useCallback, useMemo } from "react";
import AssetsGrid, { type EditorClip } from "@/components/editor/AssetsGrid";
import { useEditorStore } from "@/store/editorStore";

export default function AssetsPanel() {
  const { workspace, selectBeat } = useEditorStore();
  const { assets, clips, selection } = workspace;

  const filteredClips = useMemo((): EditorClip[] => {
    const selectedBeatId = selection.selectedBeatId || null;
    const selectedCharacterId = selection.selectedCharacterId || null;

    return clips.flatMap((clip) => {
      const videoAsset = assets.find((a) => a.id === clip.assetId && a.type === "video");
      if (!videoAsset?.url) return [];
      if (selectedBeatId && videoAsset.beatId && videoAsset.beatId !== selectedBeatId) return [];
      if (selectedCharacterId && Array.isArray(videoAsset.characterIds) && !videoAsset.characterIds.includes(selectedCharacterId)) {
        return [];
      }
      const thumbnail = assets.find((a) => a.type === "image" && a.beatId && a.beatId === videoAsset.beatId)?.url;
      return [{ id: clip.id, videoUrl: videoAsset.url, thumbnailUrl: thumbnail }];
    });
  }, [assets, clips, selection.selectedBeatId, selection.selectedCharacterId]);

  const selectedVideoUrl = useMemo(() => {
    const selectedTimelineItemId = selection.selectedTimelineItemId || null;
    const selectedBeatId = selection.selectedBeatId || null;
    let clipId: string | null = null;
    if (selectedTimelineItemId) {
      clipId = workspace.timeline.itemsById[selectedTimelineItemId]?.clipId || null;
    }
    if (!clipId && selectedBeatId) {
      const beat = workspace.story.beatsById[selectedBeatId];
      clipId = (beat?.clipId as any) || null;
    }
    if (!clipId) return null;
    const clip = workspace.clips.find((c) => c.id === clipId);
    if (!clip) return null;
    const asset = assets.find((a) => a.id === clip.assetId && a.type === "video");
    return asset?.url || null;
  }, [assets, selection.selectedBeatId, selection.selectedTimelineItemId, workspace.clips, workspace.story.beatsById, workspace.timeline.itemsById]);

  const handleSelect = useCallback(
    (videoUrl: string) => {
      const asset = assets.find((a) => a.type === "video" && a.url === videoUrl);
      const beatId = asset?.beatId || null;
      if (beatId) selectBeat(beatId);
    },
    [assets, selectBeat]
  );

  return <AssetsGrid clips={filteredClips} selectedVideoUrl={selectedVideoUrl} onSelect={handleSelect} />;
}
