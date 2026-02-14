"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useTimelineStore } from "@/store/timelineStore";
import { useEditorStore } from "@/store/editorStore";
import type { EditorClip } from "@/components/editor/AssetsGrid";
import EditorHeaderBar from "@/components/editor/EditorHeaderBar";
import PreviewPanel from "@/components/editor/PreviewPanel";
import TimelinePanel from "@/components/editor/TimelinePanel";
import LeftSidebar from "@/components/editor/LeftSidebar";
import RightSidebar from "@/components/editor/RightSidebar";
import { ResizablePanel } from "@/components/layout/ResizablePanel";
import IconButton from "@/components/ui/icon-button";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { isApiError } from "@/lib/api/errors";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18nContext";

export default function EditorShell({ projectId }: { projectId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const { t } = useI18n();
  const { setProjectId } = useTimelineStore();
  const { layout, updateLayout, loadProject, saveProject, data, selection, selectTimelineItem, undo, redo } = useEditorStore();
  const branchName = (search?.get("branch") || "main").trim() || "main";

  useEffect(() => {
    setProjectId(projectId);
    let cancelled = false;
    (async () => {
      try {
        await loadProject(projectId, { branchName });
      } catch (e) {
        if (cancelled) return;
        if (isApiError(e)) {
          console.log('[EditorShell] Caught error:', e.status);
          if (e.status === 401 || e.status === 403) {
            toast({
              title: t("editor.notEditable.title"),
              description: t("editor.notEditable.desc"),
              variant: "destructive",
            });
            router.replace(`/project/${projectId}`);
            return;
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, setProjectId, loadProject, router, t, branchName]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const shift = e.shiftKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveProject(projectId, { silent: false, branchName });
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
  }, [saveProject, projectId, undo, redo, branchName]);

  const assetsProps = useMemo(() => {
    const allItems = Object.values(data.timelineItems).sort((a, b) => a.startTime - b.startTime);
    const filteredItems = (() => {
      if (selection.selectedBeatId) {
        return allItems.filter((i) => i.linkedBeatId === selection.selectedBeatId);
      }
      if (selection.selectedCharacterId) {
        return allItems.filter((i) => {
          if (!i.linkedBeatId) return false;
          const beat = data.beats[i.linkedBeatId];
          if (!beat) return false;
          return beat.characterIds.includes(selection.selectedCharacterId as any);
        });
      }
      return allItems;
    })();

    const clips: EditorClip[] = filteredItems
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
  }, [data, selection.selectedTimelineItemId, selection.selectedBeatId, selection.selectedCharacterId, selectTimelineItem]);

  const currentClipUrl = assetsProps.selectedVideoUrl;
  const previewLabel = useMemo(() => {
    if (!selection.selectedTimelineItemId) return null;
    const item = data.timelineItems[selection.selectedTimelineItemId];
    if (!item) return null;
    const beat = item.linkedBeatId ? data.beats[item.linkedBeatId] : null;
    if (!beat) return null;
    return beat.narration || `Beat ${beat.order + 1}`;
  }, [data, selection.selectedTimelineItemId]);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {layout.leftPanelCollapsed ? (
        <div className="w-10 border-r border-border bg-background flex items-start justify-center py-2">
          <IconButton aria-label="Expand left panel" onClick={() => updateLayout({ leftPanelCollapsed: false })}>
            <ChevronRight size={18} />
          </IconButton>
        </div>
      ) : (
        <ResizablePanel
          direction="horizontal"
          side="start"
          size={layout.leftPanelWidth}
          minSize={240}
          onResize={(w) => updateLayout({ leftPanelWidth: w })}
          className="z-20 border-r border-border"
        >
          <div className="h-full relative">
            <div className="absolute top-2 right-2 z-30">
              <IconButton aria-label="Collapse left panel" onClick={() => updateLayout({ leftPanelCollapsed: true })}>
                <ChevronLeft size={18} />
              </IconButton>
            </div>
            <LeftSidebar projectId={projectId} branchName={branchName} assetsProps={assetsProps} />
          </div>
        </ResizablePanel>
      )}

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <EditorHeaderBar projectId={projectId} />
        <div className="flex-1 overflow-hidden relative">
          <PreviewPanel videoUrl={currentClipUrl} label={previewLabel} />
        </div>

        {layout.bottomPanelCollapsed ? (
          <div className="h-10 border-t border-border bg-background flex items-center justify-center">
            <IconButton aria-label="Expand timeline" onClick={() => updateLayout({ bottomPanelCollapsed: false })}>
              <ChevronUp size={18} />
            </IconButton>
          </div>
        ) : (
          <ResizablePanel
            direction="vertical"
            side="end"
            size={layout.bottomPanelHeight}
            onResize={(h) => updateLayout({ bottomPanelHeight: h })}
            className="z-20 border-t border-border"
          >
            <div className="h-full relative">
              <div className="absolute top-2 right-2 z-30">
                <IconButton aria-label="Collapse timeline" onClick={() => updateLayout({ bottomPanelCollapsed: true })}>
                  <ChevronDown size={18} />
                </IconButton>
              </div>
              <TimelinePanel />
            </div>
          </ResizablePanel>
        )}
      </div>

      {layout.rightPanelCollapsed ? (
        <div className="w-10 border-l border-border bg-background flex items-start justify-center py-2">
          <IconButton aria-label="Expand right panel" onClick={() => updateLayout({ rightPanelCollapsed: false })}>
            <ChevronLeft size={18} />
          </IconButton>
        </div>
      ) : (
        <ResizablePanel
          direction="horizontal"
          side="end"
          size={layout.rightPanelWidth}
          minSize={240}
          onResize={(w) => updateLayout({ rightPanelWidth: w })}
          className="z-20 border-l border-border"
        >
          <div className="h-full relative">
            <div className="absolute top-2 right-2 z-30">
              <IconButton aria-label="Collapse right panel" onClick={() => updateLayout({ rightPanelCollapsed: true })}>
                <ChevronRight size={18} />
              </IconButton>
            </div>
            <RightSidebar />
          </div>
        </ResizablePanel>
      )}
    </div>
  );
}
