"use client";

import { useEffect, useMemo, useState } from "react";
import Textarea from "@/components/ui/textarea";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { generationApi } from "@/lib/api";
import { useTask } from "@/lib/queries/useTask";
import { useEditorStore } from "@/store/editorStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { GenerateClipResult, TaskResponse } from "@/lib/api";
import type { IdeaParameters } from "@/lib/editor/types";
import { cn } from "@/lib/cn";
import { createId } from "@/lib/editor/id";
import Dialog from "@/components/ui/dialog";
import { validateGenerateClipResult } from "@/lib/editor/validators";
import { useI18n } from "@/lib/i18nContext";

const DEFAULT_PARAMS: IdeaParameters = {
  style: "default",
  aspectRatio: "16:9",
  duration: 12,
  shotCount: 4,
  pace: "normal",
  language: "zh",
  resolution: "1080p",
};

export default function ScriptPanel() {
  const { t } = useI18n();
  const settings = useSettingsStore((s) => ({
    defaultStyle: s.defaultStyle,
    defaultAspectRatio: s.defaultAspectRatio,
    defaultResolution: s.defaultResolution,
    defaultShotCount: s.defaultShotCount,
    defaultPace: s.defaultPace,
  }));
  const [ideaText, setIdeaText] = useState("");
  const [params, setParams] = useState<IdeaParameters>(DEFAULT_PARAMS);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [applyModeDialog, setApplyModeDialog] = useState<{
    open: boolean;
    taskId: string | null;
    result: GenerateClipResult | null;
  }>({ open: false, taskId: null, result: null });
  const [beatRegenDialog, setBeatRegenDialog] = useState<{
    open: boolean;
    beatId: string | null;
  }>({ open: false, beatId: null });
  const [beatRegenJob, setBeatRegenJob] = useState<{
    taskId: string;
    beatId: string;
    mode: "append" | "replace";
  } | null>(null);

  const {
    data,
    addIdeaVersion,
    setActiveIdeaVersion,
    addGenerationTask,
    updateGenerationTask,
    applyClipTaskResult,
    applyBeatClipResult,
    extractCharacters,
    beginHistoryGroup,
    endHistoryGroup,
    selectBeat,
    selectTimelineItem,
    updateBeat,
  } = useEditorStore();

  const activeIdea = useMemo(() => {
    const versions = data.ideaVersions || [];
    return versions.find((v) => v.id === data.activeIdeaVersionId) || null;
  }, [data.ideaVersions, data.activeIdeaVersionId]);

  useEffect(() => {
    if (!activeIdea) return;
    setIdeaText(activeIdea.text);
    setParams(activeIdea.params);
  }, [activeIdea]);

  useEffect(() => {
    if (activeIdea) return;
    setParams((p) => ({
      ...p,
      style: settings.defaultStyle,
      aspectRatio: settings.defaultAspectRatio,
      resolution: settings.defaultResolution,
      shotCount: settings.defaultShotCount,
      pace: settings.defaultPace,
    }));
  }, [activeIdea,
    settings.defaultStyle,
    settings.defaultAspectRatio,
    settings.defaultResolution,
    settings.defaultShotCount,
    settings.defaultPace,
  ]);

  const taskQuery = useTask<GenerateClipResult>(taskId);
  const task = (taskQuery.data || null) as TaskResponse<GenerateClipResult> | null;
  const beatTaskQuery = useTask<GenerateClipResult>(beatRegenJob?.taskId || null);
  const beatTask = (beatTaskQuery.data || null) as TaskResponse<GenerateClipResult> | null;

  useEffect(() => {
    if (!taskId) return;
    if (!task) return;
    updateGenerationTask(taskId, {
      status: String(task.status) as any,
      result: (task.result as any) || undefined,
    });
    if (String(task.status) === "SUCCESS") {
      const validation = validateGenerateClipResult(task.result);
      if (!validation.ok) {
        updateGenerationTask(taskId, { error: validation.error });
        toast({ title: t("prompt.toast.generateFailed.title"), description: validation.error, variant: "destructive" });
        return;
      }
      if (validation.issues.length > 0) {
        toast({ title: t("script.toast.partial.title"), description: validation.issues[0], variant: "default" });
      }
      const hasExisting = Object.keys(data.timelineItems).length > 0;
      if (hasExisting) {
        setApplyModeDialog({ open: true, taskId, result: task.result });
      } else {
        applyClipTaskResult(taskId, task.result, { mode: "append" });
      }
    }
    if (String(task.status) === "FAILURE") {
      const err = (task.result as any)?.error || t("queue.taskFailed");
      updateGenerationTask(taskId, { error: err });
    }
  }, [taskId, task, updateGenerationTask, applyClipTaskResult, data.timelineItems, t]);

  useEffect(() => {
    if (!beatRegenJob) return;
    if (!beatTask) return;
    updateGenerationTask(beatRegenJob.taskId, {
      status: String(beatTask.status) as any,
      result: (beatTask.result as any) || undefined,
    });
    if (String(beatTask.status) === "SUCCESS") {
      const validation = validateGenerateClipResult(beatTask.result);
      if (!validation.ok) {
        updateGenerationTask(beatRegenJob.taskId, { error: validation.error });
        toast({ title: t("prompt.toast.generateFailed.title"), description: validation.error, variant: "destructive" });
        return;
      }
      if (validation.issues.length > 0) {
        toast({ title: t("script.toast.partial.title"), description: validation.issues[0], variant: "default" });
      }
      applyBeatClipResult({
        taskId: beatRegenJob.taskId,
        beatId: beatRegenJob.beatId as any,
        result: beatTask.result,
        mode: beatRegenJob.mode,
      });
      setBeatRegenJob(null);
    }
    if (String(beatTask.status) === "FAILURE") {
      const err = (beatTask.result as any)?.error || t("queue.taskFailed");
      updateGenerationTask(beatRegenJob.taskId, { error: err });
      toast({ title: t("prompt.toast.generateFailed.title"), description: err, variant: "destructive" });
      setBeatRegenJob(null);
    }
  }, [beatRegenJob, beatTask, updateGenerationTask, applyBeatClipResult, t]);

  const canSubmit = ideaText.trim().length > 0 && !submitting && !(task && (String(task.status) === "PENDING" || String(task.status) === "STARTED"));

  const handleGenerate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const text = ideaText.trim();
    const idea = addIdeaVersion({ text, params });
    try {
      const { task_id } = await generationApi.generateClip({ topic: text });
      addGenerationTask({
        id: task_id,
        type: "clip",
        status: "PENDING",
        createdAt: new Date().toISOString(),
        input: { text, params, ideaVersionId: idea.id },
        refIds: { ideaVersionId: idea.id },
      });
      setTaskId(task_id);
      toast({ title: t("prompt.toast.taskStarted.title"), description: `Task: ${task_id}`, variant: "success" });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("prompt.toast.generateFailed.title");
      toast({ title: t("prompt.toast.generateFailed.title"), description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const orderedBeats = useMemo(() => {
    const beats = Object.values(data.beats);
    beats.sort((a, b) => {
      const sceneOrderA = data.scenes[a.sceneId]?.order ?? 0;
      const sceneOrderB = data.scenes[b.sceneId]?.order ?? 0;
      if (sceneOrderA !== sceneOrderB) return sceneOrderA - sceneOrderB;
      return a.order - b.order;
    });
    return beats;
  }, [data.beats, data.scenes]);

  const selectedBeatId = useEditorStore((s) => s.selection.selectedBeatId);
  const followSelection = useEditorStore((s) => s.layout.followSelection);

  const handleSelectBeat = (beatId: string) => {
    selectBeat(beatId as any, "script");
    if (!followSelection) return;
    const item = Object.values(data.timelineItems).find((t) => t.linkedBeatId === beatId);
    if (item) selectTimelineItem(item.id, "script");
  };

  const startBeatRegen = async (beatId: string, mode: "append" | "replace") => {
    const beat = data.beats[beatId as any];
    if (!beat) return;
    const topic = `${beat.narration || ""}\n${beat.cameraDescription || ""}`.trim();
    if (!topic) {
      toast({
        title: t("script.toast.missingPrompt.title"),
        description: t("script.toast.missingPrompt.desc"),
        variant: "destructive"
      });
      return;
    }
    try {
      const { task_id } = await generationApi.generateClip({ topic });
      addGenerationTask({
        id: task_id,
        type: "clip",
        status: "PENDING",
        createdAt: new Date().toISOString(),
        input: { topic, beatId, mode },
        refIds: { beatId },
      });
      setBeatRegenJob({ taskId: task_id, beatId, mode });
      toast({ title: t("prompt.toast.taskStarted.title"), description: `Task: ${task_id}`, variant: "success" });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("prompt.toast.generateFailed.title");
      toast({ title: t("prompt.toast.generateFailed.title"), description: message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Dialog
        open={applyModeDialog.open}
        onOpenChange={(open) => setApplyModeDialog((s) => ({ ...s, open }))}
        title={t("script.applyMode.title")}
        description={t("script.applyMode.desc")}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setApplyModeDialog({ open: false, taskId: null, result: null })}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (applyModeDialog.taskId && applyModeDialog.result) {
                  applyClipTaskResult(applyModeDialog.taskId, applyModeDialog.result, { mode: "append" });
                }
                setApplyModeDialog({ open: false, taskId: null, result: null });
              }}
            >
              {t("script.applyMode.append")}
            </Button>
            <Button
              onClick={() => {
                if (applyModeDialog.taskId && applyModeDialog.result) {
                  applyClipTaskResult(applyModeDialog.taskId, applyModeDialog.result, { mode: "replace" });
                }
                setApplyModeDialog({ open: false, taskId: null, result: null });
              }}
            >
              {t("script.applyMode.replace")}
            </Button>
          </div>
        }
      >
        <div className="text-sm text-muted-foreground">{t("script.applyMode.warning")}</div>
      </Dialog>

      <Dialog
        open={beatRegenDialog.open}
        onOpenChange={(open) => setBeatRegenDialog((s) => ({ ...s, open }))}
        title={t("script.regenBeat.title")}
        description={t("script.regenBeat.desc")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBeatRegenDialog({ open: false, beatId: null })}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (beatRegenDialog.beatId) startBeatRegen(beatRegenDialog.beatId, "append");
                setBeatRegenDialog({ open: false, beatId: null });
              }}
            >
              {t("script.applyMode.append")}
            </Button>
            <Button
              onClick={() => {
                if (beatRegenDialog.beatId) startBeatRegen(beatRegenDialog.beatId, "replace");
                setBeatRegenDialog({ open: false, beatId: null });
              }}
            >
              {t("script.applyMode.replace")}
            </Button>
          </div>
        }
      >
        <div className="text-sm text-muted-foreground">{t("script.regenBeat.warning")}</div>
      </Dialog>

      <div className="p-4 border-b border-border">
        <div className="text-sm font-medium text-foreground">{t("script.idea.title")}</div>
        {(data.ideaVersions || []).length > 0 ? (
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {(data.ideaVersions || []).map((v, idx) => {
              const active = v.id === data.activeIdeaVersionId;
              return (
                <button
                  key={v.id}
                  type="button"
                  className={cn(
                    "px-2 py-1 rounded-md text-xs border border-border whitespace-nowrap",
                    active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setActiveIdeaVersion(v.id)}
                >
                  v{idx + 1}
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="mt-2">
          <Textarea value={ideaText} onChange={(e) => setIdeaText(e.target.value)} placeholder={t("script.idea.placeholder")} className="min-h-[120px]" />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Input
            value={params.style}
            onChange={(e) => setParams((p) => ({ ...p, style: e.target.value }))}
            placeholder={t("workflow.placeholder.style")}
          />
          <Input
            value={params.aspectRatio}
            onChange={(e) => setParams((p) => ({ ...p, aspectRatio: e.target.value }))}
            placeholder={t("workflow.placeholder.aspect")}
          />
          <Input
            value={String(params.duration)}
            onChange={(e) => setParams((p) => ({ ...p, duration: Number(e.target.value) || 0 }))}
            placeholder={t("workflow.placeholder.duration")}
          />
          <Input
            value={String(params.shotCount)}
            onChange={(e) => setParams((p) => ({ ...p, shotCount: Number(e.target.value) || 1 }))}
            placeholder={t("workflow.placeholder.count")}
          />
          <Input
            value={params.pace}
            onChange={(e) => setParams((p) => ({ ...p, pace: e.target.value }))}
            placeholder={t("script.placeholder.pace")}
          />
          <Input
            value={params.language}
            onChange={(e) => setParams((p) => ({ ...p, language: e.target.value }))}
            placeholder={t("script.placeholder.language")}
          />
          <Input
            value={params.resolution}
            onChange={(e) => setParams((p) => ({ ...p, resolution: e.target.value }))}
            placeholder={t("workflow.placeholder.resolution")}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={handleGenerate} disabled={!canSubmit} loading={submitting} className="flex-1">
            {t("script.generateClipVideo")}
          </Button>
          <Button variant="secondary" onClick={() => extractCharacters()}>
            {t("workflow.extract")}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {orderedBeats.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("workflow.empty.noScript")}</div>
        ) : (
          <div className="space-y-3">
            {orderedBeats.map((beat) => {
              const selected = beat.id === selectedBeatId;
              return (
                <div key={beat.id} className={cn("rounded-lg border border-border p-3", selected ? "ring-2 ring-ring" : "")}>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => handleSelectBeat(beat.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{data.scenes[beat.sceneId]?.title || t("script.sceneFallback")}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{t("script.beatLabel")} {beat.order + 1}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setBeatRegenDialog({ open: true, beatId: beat.id });
                        }}
                      >
                        {t("script.regenerate")}
                      </Button>
                    </div>
                  </button>

                  <div className="mt-3 grid gap-2">
                    <Textarea
                      value={beat.narration || ""}
                      onChange={(e) => updateBeat(beat.id, { narration: e.target.value })}
                      onFocus={() => beginHistoryGroup()}
                      onBlur={() => endHistoryGroup()}
                      placeholder={t("script.placeholder.narration")}
                      className="min-h-[80px]"
                    />
                    <Textarea
                      value={beat.cameraDescription || ""}
                      onChange={(e) => updateBeat(beat.id, { cameraDescription: e.target.value })}
                      onFocus={() => beginHistoryGroup()}
                      onBlur={() => endHistoryGroup()}
                      placeholder={t("script.placeholder.cameraDescription")}
                      className="min-h-[60px]"
                    />
                    <Input
                      value={String(beat.suggestedDuration)}
                      onChange={(e) => updateBeat(beat.id, { suggestedDuration: Number(e.target.value) || 0 })}
                      onFocus={() => beginHistoryGroup()}
                      onBlur={() => endHistoryGroup()}
                      placeholder={t("script.placeholder.suggestedDuration")}
                    />

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const count = Math.max(1, Math.round(params.shotCount || 1));
                          const per = beat.suggestedDuration / count;
                          const shots = Array.from({ length: count }).map((_, idx) => ({
                            id: createId("shot"),
                            beatId: beat.id,
                            order: idx,
                            narration: beat.narration || "",
                            cameraDescription: beat.cameraDescription || "",
                            suggestedDuration: per,
                          }));
                          updateBeat(beat.id, { shots });
                        }}
                      >
                        {t("script.splitShots")}
                      </Button>
                    </div>

                    {Array.isArray(beat.shots) && beat.shots.length > 0 ? (
                      <div className="rounded-md border border-border p-2 space-y-2">
                        {beat.shots
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((shot, idx) => (
                            <div key={shot.id} className="rounded-md border border-border p-2">
                              <div className="text-xs text-muted-foreground">{t("script.shotLabel")} {idx + 1}</div>
                              <Textarea
                                value={shot.narration || ""}
                                onChange={(e) => {
                                  const nextShots = (beat.shots || []).map((s) =>
                                    s.id === shot.id ? { ...s, narration: e.target.value } : s
                                  );
                                  updateBeat(beat.id, { shots: nextShots });
                                }}
                                onFocus={() => beginHistoryGroup()}
                                onBlur={() => endHistoryGroup()}
                                placeholder={t("script.placeholder.shotNarration")}
                                className="min-h-[60px] mt-2"
                              />
                              <Textarea
                                value={shot.cameraDescription || ""}
                                onChange={(e) => {
                                  const nextShots = (beat.shots || []).map((s) =>
                                    s.id === shot.id ? { ...s, cameraDescription: e.target.value } : s
                                  );
                                  updateBeat(beat.id, { shots: nextShots });
                                }}
                                onFocus={() => beginHistoryGroup()}
                                onBlur={() => endHistoryGroup()}
                                placeholder={t("script.placeholder.shotCameraDescription")}
                                className="min-h-[60px] mt-2"
                              />
                              <Input
                                value={String(shot.suggestedDuration)}
                                onChange={(e) => {
                                  const nextShots = (beat.shots || []).map((s) =>
                                    s.id === shot.id ? { ...s, suggestedDuration: Number(e.target.value) || 0 } : s
                                  );
                                  updateBeat(beat.id, { shots: nextShots });
                                }}
                                onFocus={() => beginHistoryGroup()}
                                onBlur={() => endHistoryGroup()}
                                placeholder={t("script.placeholder.shotDuration")}
                                className="mt-2"
                              />
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
