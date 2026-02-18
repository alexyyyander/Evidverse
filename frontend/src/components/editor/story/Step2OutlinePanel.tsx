"use client";

import { useMemo, useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { generationApi } from "@/lib/api";
import { resolveComfyuiParamsFillState, summarizeComfyuiParams } from "@/lib/editor/comfyuiParams";
import {
  resolveNodeRecommendedAction,
  resolveStep4BlockBadgeClass,
  resolveStep4BlockNavigationByRawReason,
  summarizeNodeStep4ConfirmReadiness,
  summarizeNodeStep3Mapping,
} from "@/lib/editor/storyProgress";
import StoryActionBadge from "@/components/editor/story/StoryActionBadge";
import { useEditorStore } from "@/store/editorStore";
import { useI18n } from "@/lib/i18nContext";

export default function Step2OutlinePanel() {
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const workflow = useEditorStore((s) => s.data.storyWorkflow);
  const beats = useEditorStore((s) => s.data.beats);
  const characters = useEditorStore((s) => s.data.characters);
  const assets = useEditorStore((s) => s.data.assets);
  const selectStoryNode = useEditorStore((s) => s.selectStoryNode);
  const updateNodeStep2 = useEditorStore((s) => s.updateNodeStep2);
  const updateStoryGlobal = useEditorStore((s) => s.updateStoryGlobal);
  const updateStoryMeta = useEditorStore((s) => s.updateStoryMeta);
  const updateStoryUi = useEditorStore((s) => s.updateStoryUi);
  const setActiveStep = useEditorStore((s) => s.setActiveStep);

  const node = useMemo(() => workflow?.nodes.find((n) => n.id === workflow.selectedNodeId) || null, [workflow]);

  if (!workflow) return null;
  if (!node) return <div className="text-xs text-muted-foreground">{t("story.step2.empty")}</div>;

  const regenerateCurrentNode = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await generationApi.generateStoryboard({
        topic: node.step2.summary || node.title,
        stage: "step2_outline",
        llm_provider: workflow.global.llmProvider,
        script_mode: workflow.global.scriptMode,
        segment_length: workflow.global.segmentLength,
        existing_outline: {
          summary: node.step2.summary,
          background: node.step2.background,
          character_changes: node.step2.characterChanges,
          encounters: node.step2.encounters,
        },
      });
      const first = response.storyboard[0] || null;
      if (!first) throw new Error(t("story.step2.error.noContent"));
      updateNodeStep2(node.id, {
        summary: String(first.narration || node.step2.summary || ""),
        background: String(first.visual_description || node.step2.background || ""),
        status: "done",
      });
      updateStoryMeta({
        requestedProvider: response.meta?.requested_provider || workflow.global.llmProvider,
        resolvedProvider: response.meta?.resolved_provider || undefined,
        fallbackUsed: !!response.meta?.fallback_used,
        warnings: response.meta?.warnings || [],
      });
      setActiveStep("step3");
      toast({ title: t("story.step2.toast.updated.title"), description: node.title, variant: "success" });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("story.step2.toast.generateFailed.title");
      toast({ title: t("story.step2.toast.generateFailed.title"), description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <div className="space-y-1">
          <div className="text-xs font-medium">{t("story.step2.llmProvider.label")}</div>
          <Select value={workflow.global.llmProvider} onValueChange={(v) => updateStoryGlobal({ llmProvider: v as any })}>
            <SelectTrigger disabled={node.locked}>
              <SelectValue>{t(`story.provider.${workflow.global.llmProvider}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{t("story.provider.auto")}</SelectItem>
              <SelectItem value="ollama">{t("story.provider.ollama")}</SelectItem>
              <SelectItem value="vllm">{t("story.provider.vllm")}</SelectItem>
              <SelectItem value="sglang">{t("story.provider.sglang")}</SelectItem>
              <SelectItem value="openai_compatible">{t("story.provider.openai_compatible")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium">{t("story.step2.scriptMode.label")}</div>
          <Select
            value={workflow.global.scriptMode}
            onValueChange={(v) => {
              updateStoryGlobal({ scriptMode: v as any });
              updateNodeStep2(node.id, { scriptMode: v as any });
            }}
          >
            <SelectTrigger disabled={node.locked}>
              <SelectValue>{t(`story.step2.scriptMode.${workflow.global.scriptMode}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strict_screenplay">{t("story.step2.scriptMode.strict_screenplay")}</SelectItem>
              <SelectItem value="stage_play">{t("story.step2.scriptMode.stage_play")}</SelectItem>
              <SelectItem value="dance_drama">{t("story.step2.scriptMode.dance_drama")}</SelectItem>
              <SelectItem value="narrative">{t("story.step2.scriptMode.narrative")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium">{t("story.step2.segmentLength.label")}</div>
          <Select
            value={workflow.global.segmentLength}
            onValueChange={(v) => {
              updateStoryGlobal({ segmentLength: v as any });
              updateNodeStep2(node.id, { segmentLength: v as any });
            }}
          >
            <SelectTrigger disabled={node.locked}>
              <SelectValue>{t(`story.step2.segmentLength.${workflow.global.segmentLength}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="long">{t("story.step2.segmentLength.long")}</SelectItem>
              <SelectItem value="medium">{t("story.step2.segmentLength.medium")}</SelectItem>
              <SelectItem value="short">{t("story.step2.segmentLength.short")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-border p-2">
        {workflow.nodes.map((item) => {
          const active = item.id === node.id;
          const step3Mapping = summarizeNodeStep3Mapping(item, { beats });
          const step4Readiness = summarizeNodeStep4ConfirmReadiness(item, {
            beats,
            characters,
            assets,
          });
          const step4Blockers = step4Readiness.blockReasons;
          const recommendation = resolveNodeRecommendedAction(item, { beats });
          const step3MappingBadgeClass =
            step3Mapping.total > 0 && step3Mapping.mapped === step3Mapping.total
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              : step3Mapping.mapped > 0
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-zinc-500/20 text-zinc-300 border-zinc-500/40";
          const step4ParamsSummary = summarizeComfyuiParams(item.step4.comfyuiParamsJson || "");
          const fillState = resolveComfyuiParamsFillState(step4ParamsSummary);
          const paramsBadgeClass =
            fillState === "full"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              : fillState === "partial"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : fillState === "empty"
                  ? "bg-zinc-500/20 text-zinc-300 border-zinc-500/40"
                  : "bg-rose-500/20 text-rose-300 border-rose-500/40";
          return (
            <button
              key={item.id}
              type="button"
              className={`w-full rounded-md border px-2 py-2 text-left text-xs ${active ? "border-primary bg-primary/10" : "border-border hover:bg-muted/30"}`}
              onClick={(event) => {
                selectStoryNode(item.id, "story");
                const reasonElement = (event.target as HTMLElement).closest("[data-story-block-reason]");
                const reason = reasonElement?.getAttribute("data-story-block-reason");
                const blockTarget = resolveStep4BlockNavigationByRawReason(reason, step4Blockers);
                if (blockTarget) {
                  updateStoryUi({ focusTarget: blockTarget.focusTarget });
                  setActiveStep(blockTarget.targetStep);
                  return;
                }
                setActiveStep(recommendation.targetStep);
              }}
            >
              <div className="font-semibold">
                #{item.order + 1} {item.title}
                <StoryActionBadge action={recommendation.action} className="ml-2" />
                {step4Blockers.length > 0 ? (
                  <span className="ml-2 inline-flex items-center rounded border border-rose-500/40 bg-rose-500/10 px-1 py-0.5 text-[10px] text-rose-300">
                    {t("story.step4.block.count").replace("{count}", String(step4Blockers.length))}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{t("story.step2.badge.step2")}: {t(`story.status.${item.step2.status}`)}</span>
                <span>{t("story.step2.badge.step3")}: {t(`story.status.${item.step3.status}`)}</span>
                {step3Mapping.total > 0 ? (
                  <span className={`inline-flex items-center rounded border px-1 py-0.5 ${step3MappingBadgeClass}`}>
                    {t("story.step3.mappingRatio")
                      .replace("{mapped}", String(step3Mapping.mapped))
                      .replace("{total}", String(step3Mapping.total))}
                  </span>
                ) : null}
                <span>{t("story.step2.badge.step4")}: {t(`story.status.${item.step4.status}`)}</span>
                {item.step4.provider === "comfyui" ? (
                  <span className={`inline-flex items-center rounded border px-1 py-0.5 ${paramsBadgeClass}`}>
                    {step4ParamsSummary.valid
                      ? t("story.step4.params.fillRatio")
                          .replace("{filled}", String(step4ParamsSummary.filled))
                          .replace("{total}", String(step4ParamsSummary.total))
                      : t("story.step4.params.invalid")}
                  </span>
                ) : null}
                {step4Blockers.length > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    {step4Blockers.map((reason) => (
                      <span
                        key={`${item.id}-step2-block-${reason}`}
                        data-story-block-reason={reason}
                        title={`${t(`story.step4.block.${reason}`)} · ${t("story.step4.block.fixHint")}`}
                        className={`inline-flex cursor-pointer items-center rounded border px-1 py-0.5 transition-opacity hover:opacity-90 ${resolveStep4BlockBadgeClass(reason)}`}
                      >
                        {t(`story.step4.block.${reason}`)}
                      </span>
                    ))}
                  </span>
                ) : null}
                {item.locked ? <span className="text-destructive">{t("story.common.locked")}</span> : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium">{t("story.step2.summary.label")}</div>
        <Textarea
          value={node.step2.summary}
          onChange={(e) => updateNodeStep2(node.id, { summary: e.target.value })}
          className="min-h-[82px]"
          disabled={node.locked}
        />
      </div>
      <div className="space-y-2">
        <div className="text-xs font-medium">{t("story.step2.background.label")}</div>
        <Textarea
          value={node.step2.background}
          onChange={(e) => updateNodeStep2(node.id, { background: e.target.value })}
          className="min-h-[82px]"
          disabled={node.locked}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input
          value={node.step2.characterChanges}
          onChange={(e) => updateNodeStep2(node.id, { characterChanges: e.target.value })}
          placeholder={t("story.step2.characterChanges.placeholder")}
          disabled={node.locked}
        />
        <Input
          value={node.step2.encounters}
          onChange={(e) => updateNodeStep2(node.id, { encounters: e.target.value })}
          placeholder={t("story.step2.encounters.placeholder")}
          disabled={node.locked}
        />
      </div>

      <Button className="w-full" variant="secondary" onClick={regenerateCurrentNode} loading={submitting} disabled={node.locked}>
        {t("story.step2.regenerate")}
      </Button>
    </div>
  );
}
