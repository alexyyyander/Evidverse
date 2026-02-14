"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import { useTask } from "@/lib/queries/useTask";
import { generationApi } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { useEditorStore } from "@/store/editorStore";
import type { TaskResponse } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18nContext";

export default function GenerationQueuePanel() {
  const { t } = useI18n();
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
    const targetTask = tasks.find((x) => x.id === taskId);
    if (!targetTask) return;
    try {
      if (targetTask.type === "clip") {
        const text = String(targetTask.input?.text || "");
        if (!text.trim()) return;
        const { task_id } = await generationApi.generateClip({ topic: text.trim() });
        useEditorStore.getState().addGenerationTask({
          ...targetTask,
          id: task_id,
          status: "PENDING",
          createdAt: new Date().toISOString(),
        });
        setActiveTaskId(task_id);
        toast({ title: "Task started", description: `Task: ${task_id}`, variant: "success" });
        return;
      }
      if (targetTask.type === "character") {
        const prompt = String(targetTask.input?.prompt || "");
        const characterId = String(targetTask.input?.characterId || targetTask.refIds?.characterId || "");
        if (!prompt.trim() || !characterId) return;
        const { task_id } = await generationApi.generateCharacter({ prompt: prompt.trim(), anchor_id: null });
        useEditorStore.getState().addGenerationTask({
          ...targetTask,
          id: task_id,
          status: "PENDING",
          createdAt: new Date().toISOString(),
          refIds: { characterId },
        });
        setActiveTaskId(task_id);
        toast({ title: t("workflow.toast.refStarted.title"), description: `Task: ${task_id}`, variant: "success" });
        return;
      }
      if (targetTask.type === "beat_image") {
        const prompt = String(targetTask.input?.prompt || "");
        const beatId = String(targetTask.refIds?.beatId || "");
        if (!prompt.trim() || !beatId) return;
        const { task_id } = await generationApi.generateCharacter({ prompt: prompt.trim(), anchor_id: null });
        useEditorStore.getState().addGenerationTask({
          ...targetTask,
          id: task_id,
          status: "PENDING",
          createdAt: new Date().toISOString(),
          refIds: { beatId },
        });
        setActiveTaskId(task_id);
        toast({ title: t("workflow.toast.refStarted.title"), description: `Task: ${task_id}`, variant: "success" });
        return;
      }
      if (targetTask.type === "segment") {
        const narration = String(targetTask.input?.narration || "");
        const visual_description = String(targetTask.input?.visual_description || "");
        const image_url = targetTask.input?.image_url ?? null;
        const beatId = String(targetTask.refIds?.beatId || "");
        if (!visual_description.trim() || !beatId) return;
        const { task_id } = await generationApi.generateSegment({ narration, visual_description, image_url });
        useEditorStore.getState().addGenerationTask({
          ...targetTask,
          id: task_id,
          status: "PENDING",
          createdAt: new Date().toISOString(),
          refIds: { beatId },
        });
        setActiveTaskId(task_id);
        toast({ title: t("workflow.toast.refStarted.title"), description: `Task: ${task_id}`, variant: "success" });
        return;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : t("workflow.toast.retryFailed.title");
      toast({ title: t("workflow.toast.retryFailed.title"), description: message, variant: "destructive" });
    }
  };

  if (tasks.length === 0) {
    return <div className="text-sm text-muted-foreground">{t("queue.empty")}</div>;
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const selected = task.id === activeTaskId;
        return (
          <div key={task.id} className={cn("rounded-lg border border-border p-3", selected ? "ring-2 ring-ring" : "")}>
            <button type="button" className="w-full text-left" onClick={() => setActiveTaskId(task.id)}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">
                  {task.type === "clip"
                    ? t("queue.type.clip")
                    : task.type === "character"
                      ? t("queue.type.char")
                      : task.type === "beat_image"
                        ? t("queue.type.beat")
                        : t("queue.type.segment")}

                </div>
                <div className="text-xs text-muted-foreground">{task.status}</div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground break-all">{task.id}</div>
              {task.error ? <div className="mt-2 text-xs text-destructive break-words">{task.error}</div> : null}
            </button>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => retry(task.id)}>
                {t("common.retry")}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
