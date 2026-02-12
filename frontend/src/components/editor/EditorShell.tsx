"use client";

import { useEffect, useMemo } from "react";
import { useTimelineStore } from "@/store/timelineStore";
import { useEditorStore } from "@/store/editorStore";
import type { EditorClip } from "@/components/editor/AssetsGrid";
import PreviewPanel from "@/components/editor/PreviewPanel";
import TimelinePanel from "@/components/editor/TimelinePanel";
import LeftSidebar from "@/components/editor/LeftSidebar";
import RightSidebar from "@/components/editor/RightSidebar";
import { ResizablePanel } from "@/components/layout/ResizablePanel";

export default function EditorShell({ projectId }: { projectId: number }) {
  const { setProjectId } = useTimelineStore();
  const { layout, updateLayout, loadProject, saveProject, data, selection, selectTimelineItem, undo, redo } = useEditorStore();

  useEffect(() => {
    setProjectId(projectId);
    loadProject(projectId);
  }, [projectId, setProjectId, loadProject]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const shift = e.shiftKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveProject(projectId, { silent: false });
        return;
      }
      if (mod && !shift && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if ((mod && shift && e.key.toLowerCase() === "z") || (mod && e.key.toLowerCase() === "y")) {
        e.preventDefault();
        redo();
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveProject, projectId, undo, redo]);

  const assetsProps = useMemo(() => {
    const items = Object.values(data.timelineItems).sort((a, b) => a.startTime - b.startTime);
    const clips: EditorClip[] = items
      .map((item) => {
        const clip = data.clips[item.clipId];
        if (!clip) return null;
        const asset = data.assets[clip.assetId];
        if (!asset || asset.type !== "video") return null;
        const beatId = item.linkedBeatId || null;
        const thumbnail = beatId
          ? Object.values(data.assets).find((a) => a.type === "image" && a.relatedBeatId === beatId)?.url
          : undefined;
        return { id: item.id, videoUrl: asset.url, thumbnailUrl: thumbnail };
      })
      .filter(Boolean) as EditorClip[];

    const selectedVideoUrl = (() => {
      if (selection.selectedTimelineItemId) {
        const item = data.timelineItems[selection.selectedTimelineItemId];
        const clip = item ? data.clips[item.clipId] : null;
        const asset = clip ? data.assets[clip.assetId] : null;
        return asset && asset.type === "video" ? asset.url : null;
      }
      return clips[0]?.videoUrl || null;
    })();

    return {
      clips,
      selectedVideoUrl,
      onSelect: (videoUrl: string) => {
        const clipItem = clips.find((c) => c.videoUrl === videoUrl) || null;
        if (clipItem) selectTimelineItem(clipItem.id, "script");
      },
    };
  }, [data, selection.selectedTimelineItemId, selectTimelineItem]);

  const currentClipUrl = assetsProps.selectedVideoUrl;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <ResizablePanel
        direction="horizontal"
        side="start"
        size={layout.leftPanelWidth}
        onResize={(w) => updateLayout({ leftPanelWidth: w })}
        collapsed={layout.leftPanelCollapsed}
        className="z-20 border-r border-border"
      >
        <LeftSidebar projectId={projectId} assetsProps={assetsProps} />
      </ResizablePanel>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <div className="flex-1 overflow-hidden relative">
          <PreviewPanel videoUrl={currentClipUrl} />
        </div>

        <ResizablePanel
          direction="vertical"
          side="end"
          size={layout.bottomPanelHeight}
          onResize={(h) => updateLayout({ bottomPanelHeight: h })}
          collapsed={layout.bottomPanelCollapsed}
          className="z-20 border-t border-border"
        >
          <TimelinePanel />
        </ResizablePanel>
      </div>

      <ResizablePanel
        direction="horizontal"
        side="end"
        size={layout.rightPanelWidth}
        onResize={(w) => updateLayout({ rightPanelWidth: w })}
        collapsed={layout.rightPanelCollapsed}
        className="z-20 border-l border-border"
      >
        <RightSidebar />
      </ResizablePanel>
    </div>
  );
}
