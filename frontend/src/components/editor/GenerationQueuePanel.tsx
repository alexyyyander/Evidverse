"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import { useTask } from "@/lib/queries/useTask";
import { generationApi } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { useEditorStore } from "@/store/editorStore";
import type { TaskResponse } from "@/lib/api";
import { cn } from "@/lib/cn";

export default function GenerationQueuePanel() {
  const tasks = useEditorStore((s) => s.data.generationTasks || []);
  const updateGenerationTask = useEditorStore((s) => s.updateGenerationTask);
  const applyClipTaskResult = useEditorStore((s) => s.applyClipTaskResult);
  const applyCharacterTaskResult = useEditorStore((s) => s.applyCharacterTaskResult);
  const applyBeatImageTaskResult = useEditorStore((s) => s.applyBeatImageTaskResult);
  const applySegmentTaskResult = useEditorStore((s) => s.applySegmentTaskResult);

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const activeTask = useMemo(() => tasks.find((t) => t.id === activeTaskId) || null, [tasks, activeTaskId]);
  const taskQuery = useTask<any>(activeTaskId);
  const taskResp = (taskQuery.data || null) as TaskResponse<any> | null;

  useEffect(() => {
    if (!activeTaskId) return;
    if (!taskResp) return;
    const status = String(taskResp.status);
    updateGenerationTask(activeTaskId, { status: status as any, result: taskResp.result as any });

    const currentTask =
      useEditorStore.getState().data.generationTasks?.find((t) => t.id === activeTaskId) || null;

    if (status === "SUCCESS") {
      if (!currentTask) return;
      if (currentTask.type === "clip") applyClipTaskResult(activeTaskId, taskResp.result);
      if (currentTask.type === "character") {
        const characterId = currentTask.refIds?.characterId;
        if (characterId) applyCharacterTaskResult({ taskId: activeTaskId, characterId: characterId as any, result: taskResp.result });
      }
      if (currentTask.type === "beat_image") {
        const beatId = currentTask.refIds?.beatId;
        if (beatId) applyBeatImageTaskResult({ taskId: activeTaskId, beatId: beatId as any, result: taskResp.result });
      }
      if (currentTask.type === "segment") {
        const beatId = currentTask.refIds?.beatId;
        if (beatId) applySegmentTaskResult({ taskId: activeTaskId, beatId: beatId as any, result: taskResp.result as any });
      }
    }

    if (status === "FAILURE") {
      updateGenerationTask(activeTaskId, { error: (taskResp.result as any)?.error || "Task failed" });
    }
  }, [activeTaskId, taskResp, updateGenerationTask, applyClipTaskResult, applyCharacterTaskResult, applyBeatImageTaskResult, applySegmentTaskResult]);

  const retry = async (taskId: string) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    try {
      if (t.type === "clip") {
        const text = String(t.input?.text || "");
        if (!text.trim()) return;
        const { task_id } = await generationApi.generateClip({ topic: text.trim() });
        useEditorStore.getState().addGenerationTask({
          ...t,
          id: task_id,
          status: "PENDING",
          createdAt: new Date().toISOString(),
        });
        setActiveTaskId(task_id);
        toast({ title: "Task started", description: `Task: ${task_id}`, variant: "success" });
        return;
      }
      if (t.type === "character") {
        const prompt = String(t.input?.prompt || "");
        const characterId = String(t.input?.characterId || t.refIds?.characterId || "");
        if (!prompt.trim() || !characterId) return;
        const { task_id } = await generationApi.generateCharacter({ prompt: prompt.trim(), anchor_id: null });
        useEditorStore.getState().addGenerationTask({
          ...t,
          id: task_id,
          status: "PENDING",
          createdAt: new Date().toISOString(),
          refIds: { characterId },
        });
        setActiveTaskId(task_id);
        toast({ title: "Task started", description: `Task: ${task_id}`, variant: "success" });
        return;
      }
      if (t.type === "beat_image") {
        const prompt = String(t.input?.prompt || "");
        const beatId = String(t.refIds?.beatId || "");
        if (!prompt.trim() || !beatId) return;
        const { task_id } = await generationApi.generateCharacter({ prompt: prompt.trim(), anchor_id: null });
        useEditorStore.getState().addGenerationTask({
          ...t,
          id: task_id,
          status: "PENDING",
          createdAt: new Date().toISOString(),
          refIds: { beatId },
        });
        setActiveTaskId(task_id);
        toast({ title: "Task started", description: `Task: ${task_id}`, variant: "success" });
        return;
      }
      if (t.type === "segment") {
        const narration = String(t.input?.narration || "");
        const visual_description = String(t.input?.visual_description || "");
        const image_url = t.input?.image_url ?? null;
        const beatId = String(t.refIds?.beatId || "");
        if (!visual_description.trim() || !beatId) return;
        const { task_id } = await generationApi.generateSegment({ narration, visual_description, image_url });
        useEditorStore.getState().addGenerationTask({
          ...t,
          id: task_id,
          status: "PENDING",
          createdAt: new Date().toISOString(),
          refIds: { beatId },
        });
        setActiveTaskId(task_id);
        toast({ title: "Task started", description: `Task: ${task_id}`, variant: "success" });
        return;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Retry failed";
      toast({ title: "Retry failed", description: message, variant: "destructive" });
    }
  };

  if (tasks.length === 0) {
    return <div className="text-sm text-muted-foreground">暂无生成任务。</div>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((t) => {
        const selected = t.id === activeTaskId;
        return (
          <div key={t.id} className={cn("rounded-lg border border-border p-3", selected ? "ring-2 ring-ring" : "")}>
            <button type="button" className="w-full text-left" onClick={() => setActiveTaskId(t.id)}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">
                  {t.type === "clip"
                    ? "工作流生成"
                    : t.type === "character"
                      ? "人物参考图"
                      : t.type === "beat_image"
                        ? "场景参考图"
                        : "片段视频"}
                </div>
                <div className="text-xs text-muted-foreground">{t.status}</div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground break-all">{t.id}</div>
              {t.error ? <div className="mt-2 text-xs text-destructive break-words">{t.error}</div> : null}
            </button>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => retry(t.id)}>
                重试
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
