"use client";

import { useEffect, useMemo, useState } from "react";
import Textarea from "@/components/ui/textarea";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { generationApi } from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";
import type { BeatId, IdeaParameters } from "@/lib/editor/types";
import { cn } from "@/lib/cn";
import { createId } from "@/lib/editor/id";
import { useI18n } from "@/lib/i18nContext";

const DEFAULT_PARAMS: IdeaParameters = {
  style: "default",
  aspectRatio: "16:9",
  duration: 60,
  shotCount: 6,
  pace: "normal",
  language: "zh",
  resolution: "1080p",
};

export default function WorkflowPanel() {
  const { lang, t } = useI18n();
  const [topic, setTopic] = useState("");
  const [params, setParams] = useState<IdeaParameters>(DEFAULT_PARAMS);
  const [submittingStoryboard, setSubmittingStoryboard] = useState(false);
  const [beatImageUrl, setBeatImageUrl] = useState("");
  const [submittingSegments, setSubmittingSegments] = useState(false);

  const {
    data,
    selection,
    updateLayout,
    applyStoryboard,
    extractCharacters,
    addGenerationTask,
    beginHistoryGroup,
    endHistoryGroup,
    addBeatImageAsset,
    selectBeat,
    updateBeat,
    convertShotsToSegments,
  } = useEditorStore();

  const orderedBeats = useMemo(() => {
    const scenes = data.sceneOrder.map((id) => data.scenes[id]).filter(Boolean);
    const beats = scenes.flatMap((scene) => (scene.beatIds || []).map((id) => data.beats[id]).filter(Boolean));
    return beats.sort((a, b) => a.order - b.order);
  }, [data]);

  const selectedBeatId = selection.selectedBeatId as BeatId | null;
  const selectedBeat = selectedBeatId ? data.beats[selectedBeatId] : null;

  const canGenerateStoryboard = topic.trim().length > 0 && !submittingStoryboard;

  useEffect(() => {
    setParams((p) => ({ ...p, language: lang }));
  }, [lang]);

  const generateStoryboard = async () => {
    if (!canGenerateStoryboard) return;
    setSubmittingStoryboard(true);
    try {
      const resp = await generationApi.generateStoryboard({ topic: topic.trim() });
      applyStoryboard({ topic: topic.trim(), ideaParams: params, storyboard: resp.storyboard, mode: "replace" });
      toast({ title: t("workflow.generateScript"), description: t("workflow.step2"), variant: "success" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to generate script";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSubmittingStoryboard(false);
    }
  };

  const onExtractCharacters = () => {
    extractCharacters();
    updateLayout({ activeLeftTab: "characters" });
    toast({ title: t("workflow.step2"), description: t("workflow.step3"), variant: "success" });
  };

  const onAttachBeatImage = () => {
    if (!selectedBeatId) return;
    const url = beatImageUrl.trim();
    if (!url) return;
    beginHistoryGroup();
    addBeatImageAsset({ beatId: selectedBeatId, url, source: "upload" });
    endHistoryGroup();
    setBeatImageUrl("");
    toast({ title: t("workflow.toast.assetAdded.title"), description: t("workflow.toast.assetAdded.desc"), variant: "success" });
  };

  const onGenerateBeatImage = async () => {
    if (!selectedBeatId || !selectedBeat) return;
    const prompt = String(selectedBeat.cameraDescription || selectedBeat.narration || "").trim();
    if (!prompt) {
      toast({ title: t("workflow.toast.missingDesc.title"), description: t("workflow.toast.missingDesc.desc"), variant: "destructive" });
      return;
    }
    try {
      const { task_id } = await generationApi.generateCharacter({ prompt, anchor_id: null });
      addGenerationTask({
        id: task_id,
        type: "beat_image",
        status: "PENDING",
        createdAt: new Date().toISOString(),
        input: { prompt },
        refIds: { beatId: selectedBeatId },
      });
      updateLayout({ activeRightTab: "queue" });
      toast({ title: t("workflow.toast.refStarted.title"), description: `Task: ${task_id}`, variant: "success" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "生成图片失败";
      toast({ title: t("workflow.toast.imageFailed.title"), description: message, variant: "destructive" });
    }
  };

  const startSegmentTask = async (beatId: BeatId) => {
    const beat = data.beats[beatId];
    if (!beat) return;
    const narration = String(beat.narration || "").trim();
    const visual_description = String(beat.cameraDescription || beat.narration || "").trim();
    if (!visual_description) return;
    const image = Object.values(data.assets).find((a) => a.type === "image" && a.relatedBeatId === beatId) || null;
    const image_url = image ? image.url : null;

    const { task_id } = await generationApi.generateSegment({ narration, visual_description, image_url });
    addGenerationTask({
      id: task_id,
      type: "segment",
      status: "PENDING",
      createdAt: new Date().toISOString(),
      input: { narration, visual_description, image_url },
      refIds: { beatId },
    });
    updateLayout({ activeRightTab: "queue" });
    return task_id;
  };

  const generateAllSegments = async () => {
    if (submittingSegments) return;
    const beats = orderedBeats;
    if (beats.length === 0) return;
    setSubmittingSegments(true);
    try {
      for (const beat of beats) {
        await startSegmentTask(beat.id as any);
      }
      toast({ title: t("workflow.step5"), description: t("workflow.toast.queued.title"), variant: "success" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "片段生成入队失败";
      toast({ title: t("workflow.toast.queueFailed.title"), description: message, variant: "destructive" });
    } finally {
      setSubmittingSegments(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-4">
        <div className="text-sm font-semibold">{t("workflow.title")}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {t("workflow.step1")} → {t("workflow.step2")} → {t("workflow.step3")} → {t("workflow.step4")} → {t("workflow.step5")}
        </div>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto">
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">{t("workflow.step1")}</div>
          <div className="mt-3 grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <div className="text-xs font-medium text-foreground mb-1">{t("workflow.field.topic")}</div>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t("workflow.placeholder.topic")} />
              </div>
              <div>
                <div className="text-xs font-medium text-foreground mb-1">{t("workflow.field.duration")}</div>
                <Input
                  value={String(params.duration)}
                  onChange={(e) => setParams((p) => ({ ...p, duration: Number(e.target.value) || 0 }))}
                  placeholder={t("workflow.placeholder.duration")}
                />
              </div>
              <div>
                <div className="text-xs font-medium text-foreground mb-1">{t("workflow.field.style")}</div>
                <Input
                  value={params.style}
                  onChange={(e) => setParams((p) => ({ ...p, style: e.target.value }))}
                  placeholder={t("workflow.placeholder.style")}
                />
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={generateStoryboard} disabled={!canGenerateStoryboard} loading={submittingStoryboard} className="flex-1">
              {t("workflow.generateScript")}
            </Button>
            <Button variant="secondary" onClick={onExtractCharacters} disabled={orderedBeats.length === 0}>
              {t("workflow.step2")}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">{t("workflow.step3")}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            {t("workflow.help.assetAlign")}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={beatImageUrl}
              onChange={(e) => setBeatImageUrl(e.target.value)}
              placeholder={selectedBeat ? t("workflow.placeholder.assetUrl") : t("workflow.placeholder.selectBeat")}
              disabled={!selectedBeat}
            />
            <Button variant="secondary" onClick={onAttachBeatImage} disabled={!selectedBeat}>
              {t("workflow.addAsset")}
            </Button>
          </div>
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={onGenerateBeatImage} disabled={!selectedBeat}>
              {t("workflow.generateRef")}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">{t("workflow.step4")}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t("workflow.help.step4")}</div>
            </div>
            <Button variant="secondary" onClick={convertShotsToSegments} disabled={orderedBeats.length === 0}>
              {t("workflow.applySegments")}
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs font-medium text-foreground mb-1">{t("workflow.field.shotCount")}</div>
              <Input
                value={String(params.shotCount)}
                onChange={(e) => setParams((p) => ({ ...p, shotCount: Number(e.target.value) || 1 }))}
                placeholder={t("workflow.placeholder.count")}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">{t("workflow.step5")}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t("workflow.help.step5")}</div>
            </div>
            <Button onClick={generateAllSegments} loading={submittingSegments} disabled={orderedBeats.length === 0}>
              {t("workflow.generateAll")}
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs font-medium text-foreground mb-1">{t("workflow.field.aspect")}</div>
              <Input
                value={params.aspectRatio}
                onChange={(e) => setParams((p) => ({ ...p, aspectRatio: e.target.value }))}
                placeholder={t("workflow.placeholder.aspect")}
              />
            </div>
            <div>
              <div className="text-xs font-medium text-foreground mb-1">{t("workflow.field.resolution")}</div>
              <Input
                value={params.resolution}
                onChange={(e) => setParams((p) => ({ ...p, resolution: e.target.value }))}
                placeholder={t("workflow.placeholder.resolution")}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {orderedBeats.length === 0 ? (
            <div className="text-sm text-muted-foreground">{t("workflow.empty.noScript")}</div>
          ) : (
            orderedBeats.map((beat) => {
              const selected = beat.id === selectedBeatId;
              return (
                <div key={beat.id} className={cn("rounded-lg border border-border p-3", selected ? "ring-2 ring-ring" : "")}>
                  <button type="button" className="w-full text-left" onClick={() => selectBeat(beat.id as any, "script")}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-foreground">
                        {data.scenes[beat.sceneId]?.title || "Scene"} · Beat {beat.order + 1}
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            const id = await startSegmentTask(beat.id as any);
                            if (id) toast({ title: t("workflow.toast.queued.title"), description: `Task: ${id}`, variant: "success" });
                          } catch (err) {
                            const message = err instanceof Error ? err.message : "入队失败";
                            toast({ title: t("workflow.toast.queueFailed.title"), description: message, variant: "destructive" });
                          }
                        }}
                      >
                        {t("workflow.generateVideo")}
                      </Button>
                    </div>
                  </button>

                  <div className="mt-3 grid gap-2">
                    <Textarea
                      value={beat.narration || ""}
                      onChange={(e) => updateBeat(beat.id as any, { narration: e.target.value })}
                      onFocus={() => beginHistoryGroup()}
                      onBlur={() => endHistoryGroup()}
                      placeholder={t("workflow.placeholder.dialogue")}
                      className="min-h-[80px]"
                    />
                    <Textarea
                      value={beat.cameraDescription || ""}
                      onChange={(e) => updateBeat(beat.id as any, { cameraDescription: e.target.value })}
                      onFocus={() => beginHistoryGroup()}
                      onBlur={() => endHistoryGroup()}
                      placeholder={t("workflow.placeholder.scene")}
                      className="min-h-[60px]"
                    />
                    <Input
                      value={String(beat.suggestedDuration)}
                      onChange={(e) => updateBeat(beat.id as any, { suggestedDuration: Number(e.target.value) || 0 })}
                      onFocus={() => beginHistoryGroup()}
                      onBlur={() => endHistoryGroup()}
                      placeholder={t("workflow.placeholder.segmentDuration")}
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
                          updateBeat(beat.id as any, { shots });
                        }}
                      >
                        {t("workflow.segment.generate")}
                      </Button>
                    </div>

                    {Array.isArray(beat.shots) && beat.shots.length > 0 ? (
                      <div className="rounded-md border border-border p-2 space-y-2">
                        {beat.shots
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((shot, idx) => (
                            <div key={shot.id} className="rounded-md border border-border p-2">
                              <div className="text-xs text-muted-foreground">
                                {t("workflow.segment.index")} {idx + 1}
                              </div>
                              <Textarea
                                value={shot.narration || ""}
                                onChange={(e) => {
                                  const nextShots = (beat.shots || []).map((s) => (s.id === shot.id ? { ...s, narration: e.target.value } : s));
                                  updateBeat(beat.id as any, { shots: nextShots });
                                }}
                                onFocus={() => beginHistoryGroup()}
                                onBlur={() => endHistoryGroup()}
                                placeholder={t("workflow.segment.dialogue")}
                                className="min-h-[60px] mt-2"
                              />
                              <Textarea
                                value={shot.cameraDescription || ""}
                                onChange={(e) => {
                                  const nextShots = (beat.shots || []).map((s) =>
                                    s.id === shot.id ? { ...s, cameraDescription: e.target.value } : s
                                  );
                                  updateBeat(beat.id as any, { shots: nextShots });
                                }}
                                onFocus={() => beginHistoryGroup()}
                                onBlur={() => endHistoryGroup()}
                                placeholder={t("workflow.segment.scene")}
                                className="min-h-[60px] mt-2"
                              />
                              <Input
                                value={String(shot.suggestedDuration)}
                                onChange={(e) => {
                                  const nextShots = (beat.shots || []).map((s) =>
                                    s.id === shot.id ? { ...s, suggestedDuration: Number(e.target.value) || 0 } : s
                                  );
                                  updateBeat(beat.id as any, { shots: nextShots });
                                }}
                                onFocus={() => beginHistoryGroup()}
                                onBlur={() => endHistoryGroup()}
                                placeholder={t("workflow.segment.duration")}
                                className="mt-2"
                              />
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
