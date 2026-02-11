"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Image as ImageIcon, FileText, Settings, GitBranch } from "lucide-react";
import { useTimelineStore } from "@/store/timelineStore";
import { useTask } from "@/lib/queries/useTask";
import type { GenerateClipResult, TaskResponse } from "@/lib/api";
import PromptPanel from "@/components/editor/PromptPanel";
import AssetsGrid, { type EditorClip } from "@/components/editor/AssetsGrid";
import PreviewPanel from "@/components/editor/PreviewPanel";
import TimelinePanel from "@/components/editor/TimelinePanel";
import { toast } from "@/components/ui/toast";
import IconButton from "@/components/ui/icon-button";
import Spinner from "@/components/ui/spinner";

const GitGraph = dynamic(() => import("@/components/GitGraph"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[240px] flex items-center justify-center">
      <Spinner size={20} />
    </div>
  ),
});

type EditorTab = "script" | "assets" | "history";

export default function EditorShell({ projectId }: { projectId: number }) {
  const [activeTab, setActiveTab] = useState<EditorTab>("script");
  const [prompt, setPrompt] = useState("");
  const [clips, setClips] = useState<EditorClip[]>([]);
  const [currentClipUrl, setCurrentClipUrl] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [sideCollapsed, setSideCollapsed] = useState(false);

  const { setProjectId, loadFromBackend, saveToBackend } = useTimelineStore();

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

    const result = task.result;
    if (!result) return;
    if (result.status === "failed") {
      toast({ title: "Generation failed", description: result.error || "Task failed.", variant: "destructive" });
      return;
    }
    if (!Array.isArray(result.clips)) return;

    const nextClips: EditorClip[] = result.clips
      .filter((c) => typeof c?.video_url === "string" && c.video_url.length > 0)
      .map((c, idx) => ({
        id: `${taskId}-${idx}`,
        videoUrl: c.video_url as string,
        thumbnailUrl: typeof c.image_url === "string" ? c.image_url : undefined,
      }));

    setClips(nextClips);
    if (nextClips.length > 0) setCurrentClipUrl(nextClips[0].videoUrl);
    setActiveTab("assets");
    toast({ title: "Generation complete", description: `Clips: ${nextClips.length}`, variant: "success" });
  }, [task, taskId]);

  useEffect(() => {
    if (!taskId) return;
    if (!task) return;
    if (String(task.status) !== "FAILURE") return;
    toast({ title: "Generation failed", description: "Task failed. Please try again.", variant: "destructive" });
  }, [task, taskId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveToBackend({ silent: false });
        return;
      }
      if (mod && e.key === "1") setActiveTab("script");
      if (mod && e.key === "2") setActiveTab("assets");
      if (mod && e.key === "3") setActiveTab("history");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveToBackend]);

  const sideWidth = useMemo(() => {
    if (sideCollapsed) return "w-0";
    if (activeTab === "history") return "w-[600px]";
    return "w-80";
  }, [activeTab, sideCollapsed]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <div className="w-16 flex flex-col items-center py-4 bg-card border-r border-border">
        <div className="mb-8 font-bold text-xl text-primary">V</div>

        <IconButton
          aria-label="Script tab"
          className={activeTab === "script" ? "bg-secondary" : ""}
          onClick={() => setActiveTab("script")}
        >
          <FileText size={20} />
        </IconButton>
        <div className="h-2" />
        <IconButton
          aria-label="Assets tab"
          className={activeTab === "assets" ? "bg-secondary" : ""}
          onClick={() => setActiveTab("assets")}
        >
          <ImageIcon size={20} />
        </IconButton>
        <div className="h-2" />
        <IconButton
          aria-label="History tab"
          className={activeTab === "history" ? "bg-secondary" : ""}
          onClick={() => setActiveTab("history")}
        >
          <GitBranch size={20} />
        </IconButton>

        <div className="mt-auto flex flex-col items-center gap-2">
          <IconButton aria-label="Toggle panel" onClick={() => setSideCollapsed((v) => !v)}>
            <Settings size={20} />
          </IconButton>
        </div>
      </div>

      <div className={`${sideWidth} bg-background border-r border-border flex flex-col transition-all duration-300 overflow-hidden`}>
        {!sideCollapsed ? (
          <>
            <div className="p-4 border-b border-border">
              <div className="font-semibold text-lg capitalize">{activeTab}</div>
              <div className="mt-1 text-xs text-muted-foreground">Cmd/Ctrl+1/2/3 switch tabs, Cmd/Ctrl+S save</div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === "script" ? (
                <PromptPanel
                  prompt={prompt}
                  onPromptChange={setPrompt}
                  onTaskStarted={setTaskId}
                  task={task}
                  busy={generationBusy}
                />
              ) : null}

              {activeTab === "assets" ? (
                <AssetsGrid clips={clips} selectedVideoUrl={currentClipUrl} onSelect={setCurrentClipUrl} />
              ) : null}

              {activeTab === "history" ? <GitGraph projectId={projectId} /> : null}
            </div>
          </>
        ) : null}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <PreviewPanel videoUrl={currentClipUrl} />
        <TimelinePanel />
      </div>
    </div>
  );
}
