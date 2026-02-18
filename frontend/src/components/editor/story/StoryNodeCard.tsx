"use client";

import { useMemo } from "react";
import { useEditorStore } from "@/store/editorStore";
import { useI18n } from "@/lib/i18nContext";
import { resolveComfyuiParamsFillState, summarizeComfyuiParams } from "@/lib/editor/comfyuiParams";
import {
  resolveNodeRecommendedAction,
  summarizeNodeStep4ConfirmReadiness,
  summarizeNodeStep3Mapping,
} from "@/lib/editor/storyProgress";
import StoryActionBadge from "@/components/editor/story/StoryActionBadge";

export default function StoryNodeCard({ nodeId }: { nodeId: string | null }) {
  const { t } = useI18n();
  const data = useEditorStore((s) => s.data);
  const workflow = useEditorStore((s) => s.data.storyWorkflow);

  const node = useMemo(() => {
    if (!workflow || !nodeId) return null;
    return workflow.nodes.find((item) => item.id === nodeId) || null;
  }, [nodeId, workflow]);

  if (!node) {
    return <div className="text-xs text-muted-foreground">{t("story.nodeCard.empty")}</div>;
  }
  const step4Provider = node.step4.provider || "segment";
  const step3Mapping = summarizeNodeStep3Mapping(node, data);
  const step4Readiness = summarizeNodeStep4ConfirmReadiness(node, data);
  const step4MissingCharacterNames = step4Readiness.missingCharacterNames;
  const recommendation = resolveNodeRecommendedAction(node, data);
  const step3MappingState =
    step3Mapping.total === 0 || step3Mapping.mapped === 0
      ? "empty"
      : step3Mapping.mapped >= step3Mapping.total
        ? "full"
        : "partial";
  const step4ParamsText = String(node.step4.comfyuiParamsJson || "{}").trim();
  const step4ParamsSummary = summarizeComfyuiParams(step4ParamsText);
  const step4FillState = resolveComfyuiParamsFillState(step4ParamsSummary);

  const videoAsset = node.step4.videoAssetId ? data.assets[node.step4.videoAssetId] : null;
  const bgAsset = node.step4.assetBindings.backgroundAssetId ? data.assets[node.step4.assetBindings.backgroundAssetId] : null;
  const startAsset = node.step4.assetBindings.startImageAssetId ? data.assets[node.step4.assetBindings.startImageAssetId] : null;
  const endAsset = node.step4.assetBindings.endImageAssetId ? data.assets[node.step4.assetBindings.endImageAssetId] : null;
  const step4CharacterMap = node.step4.assetBindings.characterAssetIds || {};

  return (
    <div className="w-full max-w-3xl rounded-xl border border-border bg-background/80 p-4 shadow-soft backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">
            {t("story.common.node")} #{node.order + 1} · {node.title}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("story.step2.title")}: {t(`story.status.${node.step2.status}`)} · {t("story.step3.title")}: {t(`story.status.${node.step3.status}`)} · {t("story.step4.title")}: {t(`story.status.${node.step4.status}`)} · {node.locked ? t("story.common.locked") : t("story.common.editable")}
          </div>
          <StoryActionBadge action={recommendation.action} tone="soft" className="mt-1 rounded-full px-2 py-0.5 text-[11px]" />
          {step3Mapping.total > 0 ? (
            <div
              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                step3MappingState === "full"
                  ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : step3MappingState === "partial"
                    ? "border border-amber-500/40 bg-amber-500/10 text-amber-300"
                    : "border border-zinc-500/40 bg-zinc-500/10 text-zinc-300"
              }`}
            >
              {t("story.step3.mappingRatio")
                .replace("{mapped}", String(step3Mapping.mapped))
                .replace("{total}", String(step3Mapping.total))}
            </div>
          ) : null}
          {step4MissingCharacterNames.length > 0 ? (
            <div className="mt-1 text-xs text-amber-300">
              {t("story.step4.mapping.required")} {step4MissingCharacterNames.slice(0, 6).join(", ")}
            </div>
          ) : null}
          {step4Readiness.imageBindingMissing ? (
            <div className="mt-1 text-xs text-amber-300">{t("story.step4.image.required")}</div>
          ) : null}
          {!step4Readiness.videoReady ? (
            <div className="mt-1 text-xs text-rose-300">{t("story.step4.video.required")}</div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-border bg-muted/20 p-3">
          <div className="text-xs font-semibold">{t("story.nodeCard.textSection")}</div>
          <div className="mt-2 space-y-2 text-xs">
            <div>
              <div className="text-muted-foreground">{t("story.step2.summary.label")}</div>
              <div className="whitespace-pre-wrap">{node.step2.summary || t("story.nodeCard.placeholder")}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("story.step2.background.label")}</div>
              <div className="whitespace-pre-wrap">{node.step2.background || t("story.nodeCard.placeholder")}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("story.nodeCard.characterChanges")}</div>
              <div className="whitespace-pre-wrap">{node.step2.characterChanges || t("story.nodeCard.placeholder")}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("story.nodeCard.encounters")}</div>
              <div className="whitespace-pre-wrap">{node.step2.encounters || t("story.nodeCard.placeholder")}</div>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3">
          <div className="text-xs font-semibold">{t("story.nodeCard.assetsSection")}</div>
          <div className="mt-2 space-y-2 text-xs">
            <div>
              <div className="text-muted-foreground">{t("story.step4.backgroundAsset")}</div>
              <div>{bgAsset ? bgAsset.id : t("story.nodeCard.notBound")}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("story.nodeCard.startImage")}</div>
              <div>{startAsset ? startAsset.id : t("story.nodeCard.notBound")}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("story.nodeCard.endImage")}</div>
              <div>{endAsset ? endAsset.id : t("story.nodeCard.notBound")}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("story.nodeCard.characterMap")}</div>
              <div className="space-y-1">
                {Object.entries(step4CharacterMap).length === 0 ? (
                  <div>{t("story.nodeCard.placeholder")}</div>
                ) : (
                  Object.entries(step4CharacterMap).map(([characterId, assetId]) => (
                    <div key={characterId}>
                      {characterId}: {assetId || t("story.nodeCard.notBound")}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("story.nodeCard.video")}</div>
              <div>{videoAsset ? videoAsset.id : t("story.nodeCard.notGenerated")}</div>
              <div className="text-muted-foreground">
                {t("story.step4.renderProvider.label")}: {t(`story.step4.renderProvider.${step4Provider}`)}
              </div>
              {step4Provider === "comfyui" ? (
                <div className="text-muted-foreground">
                  {t("story.step4.template.label")}: {node.step4.comfyuiTemplateId || t("story.step4.template.none")}
                </div>
              ) : null}
              {step4Provider === "comfyui" ? (
                <div>
                  <div className="text-muted-foreground">{t("story.step4.params.label")}</div>
                  {step4ParamsSummary.valid ? (
                    <div
                      className={`text-[11px] ${
                        step4FillState === "full"
                          ? "text-emerald-300"
                          : step4FillState === "partial"
                            ? "text-amber-300"
                            : "text-zinc-300"
                      }`}
                    >
                      {t("story.step4.params.fillRatio")
                        .replace("{filled}", String(step4ParamsSummary.filled))
                        .replace("{total}", String(step4ParamsSummary.total))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-destructive">{t("story.step4.params.invalid")}</div>
                  )}
                  <div className="max-h-20 overflow-auto whitespace-pre-wrap break-all text-[11px]">
                    {step4ParamsText || t("story.step4.none")}
                  </div>
                </div>
              ) : null}
              <div className="text-muted-foreground">{t("story.step4.confirmed")}: {String(node.step4.confirmed)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
