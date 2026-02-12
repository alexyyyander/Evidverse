"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { FileText, GitBranch, Image as ImageIcon, Layers, PanelBottomClose, PanelLeftClose, PanelRightClose, Users } from "lucide-react";
import { useTask } from "@/lib/queries/useTask";
import type { GenerateClipResult, TaskResponse } from "@/lib/api";
import PreviewPanel from "@/components/editor/PreviewPanel";
import TimelinePanel from "@/components/editor/TimelinePanel";
import { toast } from "@/components/ui/toast";
import IconButton from "@/components/ui/icon-button";
import Spinner from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditorStore } from "@/store/editorStore";
import ScriptPanel from "@/components/editor/ScriptPanel";
import CharactersPanel from "@/components/editor/CharactersPanel";
import AssetsPanel from "@/components/editor/AssetsPanel";
import InspectorPanel from "@/components/editor/InspectorPanel";
import QueuePanel from "@/components/editor/QueuePanel";

const GitGraph = dynamic(() => import("@/components/GitGraph"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[240px] flex items-center justify-center">
      <Spinner size={20} />
    </div>
  ),
});

type LeftTab = "script" | "characters" | "assets" | "history";
type RightTab = "inspector" | "queue";

export default function EditorShell({ projectId }: { projectId: number }) {
  const {
    workspace,
    setProjectId,
    loadFromBackend,
    saveToBackend,
    ingestGenerationResult,
    setLayout,
    setLeftTab,
    setRightTab,
  } = useEditorStore();

  const playheadTime = useEditorStore((s) => s.playheadTime);
  const { layout, selection, story, assets } = workspace;

  const [taskId, setTaskId] = useState<string | null>(null);

  const taskQuery = useTask<GenerateClipResult>(taskId);
  const task = (taskQuery.data || null) as TaskResponse<GenerateClipResult> | null;
  const generationBusy = Boolean(
    taskId &&
      (taskQuery.isLoading ||
        taskQuery.isFetching ||
        (task && (String(task.status) === "PENDING" || String(task.status) === "STARTED")))
  );

  useEffect(() => {
    setProjectId(projectId);
    loadFromBackend();
  }, [projectId, setProjectId, loadFromBackend]);

  useEffect(() => {
    if (!taskId) return;
    if (!task) return;
    if (String(task.status) !== "SUCCESS") return;
    ingestGenerationResult(taskId, task);
  }, [ingestGenerationResult, task, taskId]);

  useEffect(() => {
    if (!taskId) return;
    if (!task) return;
    if (String(task.status) !== "FAILURE") return;
    toast({ title: "Generation failed", description: "Task failed. Please try again.", variant: "destructive" });
  }, [task, taskId]);

  const selectedVideoUrl = useMemo(() => {
    const selectedTimelineItemId = selection.selectedTimelineItemId || null;
    const selectedBeatId = selection.selectedBeatId || null;
    let clipId: string | null = null;
    if (selectedTimelineItemId) {
      clipId = workspace.timeline.itemsById[selectedTimelineItemId]?.clipId || null;
    }
    if (!clipId && selectedBeatId) {
      const beat = story.beatsById[selectedBeatId];
      clipId = (beat?.clipId as any) || null;
    }
    if (!clipId) return null;
    const clip = workspace.clips.find((c) => c.id === clipId);
    if (!clip) return null;
    const asset = assets.find((a) => a.id === clip.assetId && a.type === "video");
    return asset?.url || null;
  }, [assets, selection.selectedBeatId, selection.selectedTimelineItemId, story.beatsById, workspace.clips, workspace.timeline.itemsById]);

  const previewSeekSeconds = useMemo(() => {
    const ti = selection.selectedTimelineItemId || null;
    if (!ti) return 0;
    for (const row of workspace.timeline.editorData as any) {
      const actions = Array.isArray(row?.actions) ? row.actions : [];
      const action = actions.find((a: any) => String(a?.id ?? "") === ti);
      if (!action) continue;
      const start = Number(action.start ?? 0);
      return Math.max(0, playheadTime - start);
    }
    return 0;
  }, [playheadTime, selection.selectedTimelineItemId, workspace.timeline.editorData]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveToBackend({ silent: false });
        return;
      }
      if (mod && e.key === "1") setLeftTab("script");
      if (mod && e.key === "2") setLeftTab("assets");
      if (mod && e.key === "3") setLeftTab("history");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveToBackend, setLeftTab]);

  const dragRef = useRef<{
    kind: "left" | "right" | "bottom";
    startX: number;
    startY: number;
    startLeft: number;
    startRight: number;
    startBottom: number;
  } | null>(null);

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  const onDragMove = useCallback(
    (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.kind === "left") {
        const next = clamp(drag.startLeft + (e.clientX - drag.startX), 260, 640);
        setLayout({ leftWidth: next });
      }
      if (drag.kind === "right") {
        const next = clamp(drag.startRight - (e.clientX - drag.startX), 280, 720);
        setLayout({ rightWidth: next });
      }
      if (drag.kind === "bottom") {
        const next = clamp(drag.startBottom - (e.clientY - drag.startY), 200, 520);
        setLayout({ bottomHeight: next });
      }
    },
    [setLayout]
  );

  const stopDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", stopDrag);
  }, [onDragMove]);

  const startDrag = useCallback(
    (kind: "left" | "right" | "bottom") =>
      (e: React.MouseEvent) => {
        e.preventDefault();
        dragRef.current = {
          kind,
          startX: e.clientX,
          startY: e.clientY,
          startLeft: layout.leftWidth,
          startRight: layout.rightWidth,
          startBottom: layout.bottomHeight,
        };
        window.addEventListener("mousemove", onDragMove);
        window.addEventListener("mouseup", stopDrag);
      },
    [layout.bottomHeight, layout.leftWidth, layout.rightWidth, onDragMove, stopDrag]
  );

  useEffect(() => {
    return () => stopDrag();
  }, [stopDrag]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <div
        className="flex flex-col bg-background border-r border-border min-w-0"
        style={{ width: layout.leftCollapsed ? 0 : layout.leftWidth }}
      >
        {layout.leftCollapsed ? null : (
          <>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/60">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="font-semibold tracking-tight">Editor</div>
                <div className="text-xs text-muted-foreground truncate">Cmd/Ctrl+S 保存，Cmd/Ctrl+1/2/3 切换</div>
              </div>
              <IconButton aria-label="Collapse left panel" onClick={() => setLayout({ leftCollapsed: true })}>
                <PanelLeftClose size={16} />
              </IconButton>
            </div>

            <div className="px-3 py-2 border-b border-border">
              <Tabs value={layout.leftTab} onValueChange={(v) => setLeftTab(v as LeftTab)}>
                <TabsList className="w-full justify-between">
                  <TabsTrigger value="script" className="flex-1 justify-center">
                    <FileText size={16} />
                  </TabsTrigger>
                  <TabsTrigger value="characters" className="flex-1 justify-center">
                    <Users size={16} />
                  </TabsTrigger>
                  <TabsTrigger value="assets" className="flex-1 justify-center">
                    <ImageIcon size={16} />
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex-1 justify-center">
                    <GitBranch size={16} />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {layout.leftTab === "script" ? (
                <ScriptPanel onTaskStarted={setTaskId} task={task} busy={generationBusy} />
              ) : null}

              {layout.leftTab === "characters" ? (
                <CharactersPanel />
              ) : null}

              {layout.leftTab === "assets" ? (
                <AssetsPanel />
              ) : null}

              {layout.leftTab === "history" ? <GitGraph projectId={projectId} /> : null}
            </div>
          </>
        )}
      </div>

      {layout.leftCollapsed ? (
        <div className="w-10 border-r border-border bg-background flex items-center justify-center">
          <IconButton aria-label="Expand left panel" onClick={() => setLayout({ leftCollapsed: false })}>
            <Layers size={16} />
          </IconButton>
        </div>
      ) : (
        <div className="w-1 bg-border cursor-col-resize" onMouseDown={startDrag("left")} />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <PreviewPanel videoUrl={selectedVideoUrl} seekSeconds={previewSeekSeconds} />
          </div>

          {layout.rightCollapsed ? (
            <div className="w-10 border-l border-border bg-background flex items-center justify-center">
              <IconButton aria-label="Expand right panel" onClick={() => setLayout({ rightCollapsed: false })}>
                <Layers size={16} />
              </IconButton>
            </div>
          ) : (
            <>
              <div className="w-1 bg-border cursor-col-resize" onMouseDown={startDrag("right")} />
              <div className="flex flex-col bg-background border-l border-border" style={{ width: layout.rightWidth }}>
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background/60">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="font-semibold tracking-tight">Panel</div>
                  </div>
                  <IconButton aria-label="Collapse right panel" onClick={() => setLayout({ rightCollapsed: true })}>
                    <PanelRightClose size={16} />
                  </IconButton>
                </div>
                <div className="px-3 py-2 border-b border-border">
                  <Tabs value={layout.rightTab} onValueChange={(v) => setRightTab(v as RightTab)}>
                    <TabsList className="w-full justify-between">
                      <TabsTrigger value="inspector" className="flex-1 justify-center">
                        Inspector
                      </TabsTrigger>
                      <TabsTrigger value="queue" className="flex-1 justify-center">
                        Queue
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {layout.rightTab === "inspector" ? (
                    <InspectorPanel />
                  ) : null}
                  {layout.rightTab === "queue" ? (
                    <QueuePanel taskId={taskId} task={task} busy={generationBusy} />
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>

        {layout.bottomCollapsed ? (
          <div className="h-10 border-t border-border bg-background flex items-center justify-between px-3">
            <div className="text-sm font-medium">Timeline</div>
            <IconButton aria-label="Expand timeline" onClick={() => setLayout({ bottomCollapsed: false })}>
              <PanelBottomClose size={16} className="rotate-180" />
            </IconButton>
          </div>
        ) : (
          <>
            <div className="h-1 bg-border cursor-row-resize" onMouseDown={startDrag("bottom")} />
            <div className="flex flex-col border-t border-border" style={{ height: layout.bottomHeight }}>
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background/60">
                <div className="text-sm font-semibold">Timeline</div>
                <IconButton aria-label="Collapse timeline" onClick={() => setLayout({ bottomCollapsed: true })}>
                  <PanelBottomClose size={16} />
                </IconButton>
              </div>
              <div className="flex-1 min-h-0">
                <TimelinePanel />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
