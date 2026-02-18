"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { useEditorStore } from "@/store/editorStore";
import type { StoryStepKey } from "@/lib/editor/types";
import { useI18n } from "@/lib/i18nContext";
import {
  resolveNodeRecommendedAction,
  resolveStep4BlockBadgeClass,
  resolveStep4BlockNavigationByRawReason,
  summarizeNodeStep4ConfirmReadiness,
} from "@/lib/editor/storyProgress";
import StoryActionBadge from "@/components/editor/story/StoryActionBadge";
import Button from "@/components/ui/button";

const STEP_ORDER: Array<{ key: StoryStepKey; labelKey: string }> = [
  { key: "step1", labelKey: "story.step1.title" },
  { key: "step2", labelKey: "story.step2.title" },
  { key: "step3", labelKey: "story.step3.title" },
  { key: "step4", labelKey: "story.step4.title" },
];

export default function StepNavigator({ className }: { className?: string }) {
  const { t } = useI18n();
  const data = useEditorStore((s) => s.data);
  const workflow = useEditorStore((s) => s.data.storyWorkflow);
  const setActiveStep = useEditorStore((s) => s.setActiveStep);
  const updateStoryUi = useEditorStore((s) => s.updateStoryUi);
  const selectStoryNode = useEditorStore((s) => s.selectStoryNode);
  const selectedNode = useMemo(() => {
    if (!workflow) return null;
    return workflow.nodes.find((n) => n.id === workflow.selectedNodeId) || null;
  }, [workflow]);
  const recommendation = useMemo(() => {
    if (!selectedNode) return null;
    return resolveNodeRecommendedAction(selectedNode, { beats: data.beats });
  }, [data.beats, selectedNode]);
  const step4Readiness = useMemo(() => {
    if (!selectedNode) return null;
    return summarizeNodeStep4ConfirmReadiness(selectedNode, data);
  }, [data, selectedNode]);
  const step4Blockers = step4Readiness?.blockReasons || [];

  if (!workflow) return null;

  const goRecommended = () => {
    if (!selectedNode || !recommendation) return;
    selectStoryNode(selectedNode.id, "story");
    setActiveStep(recommendation.targetStep);
  };
  const statusByStep: Record<StoryStepKey, string> = {
    step1: workflow.nodes.length > 0 ? t("story.status.done") : t("story.status.todo"),
    step2: t(`story.status.${selectedNode?.step2.status || "todo"}`),
    step3: t(`story.status.${selectedNode?.step3.status || "todo"}`),
    step4: t(`story.status.${selectedNode?.step4.status || "todo"}`),
  };

  return (
    <div className={cn("space-y-2", className)}>
      {selectedNode ? (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            #{selectedNode.order + 1} {selectedNode.title}
          </span>
          {recommendation ? <StoryActionBadge action={recommendation.action} tone="soft" className="text-[11px]" /> : null}
        </div>
      ) : null}
      <div className="grid grid-cols-4 gap-2">
        {STEP_ORDER.map((item) => {
          const active = workflow.activeStep === item.key;
          const status = statusByStep[item.key];
          const isRecommendedStep = recommendation?.targetStep === item.key;
          const showStep4Blockers = item.key === "step4" && step4Blockers.length > 0;
          return (
            <button
              key={item.key}
              type="button"
              onClick={(event) => {
                const reasonElement = (event.target as HTMLElement).closest("[data-story-block-reason]");
                const reason = reasonElement?.getAttribute("data-story-block-reason");
                const blockTarget = item.key === "step4" ? resolveStep4BlockNavigationByRawReason(reason, step4Blockers) : null;
                if (blockTarget) {
                  setActiveStep(blockTarget.targetStep);
                  updateStoryUi({ focusTarget: blockTarget.focusTarget });
                  return;
                }
                setActiveStep(item.key);
              }}
              className={cn(
                "rounded-md border px-2 py-2 text-left transition-colors",
                active ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/40",
                isRecommendedStep && !active ? "border-primary/50" : "",
              )}
            >
              <div className="text-xs font-semibold">{t(item.labelKey)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{status}</div>
              {isRecommendedStep && recommendation ? (
                <StoryActionBadge action={recommendation.action} withLabel={false} className="mt-1 text-[10px]" />
              ) : null}
              {showStep4Blockers ? (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className="inline-flex items-center rounded border border-rose-500/40 bg-rose-500/10 px-1 py-0.5 text-[10px] text-rose-300">
                    {t("story.step4.block.count").replace("{count}", String(step4Blockers.length))}
                  </span>
                  {step4Blockers.map((reason) => (
                    <span
                      key={`${selectedNode?.id || "step4"}-nav-block-${reason}`}
                      data-story-block-reason={reason}
                      title={`${t(`story.step4.block.${reason}`)} · ${t("story.step4.block.fixHint")}`}
                      className={`inline-flex cursor-pointer items-center rounded border px-1 py-0.5 text-[10px] transition-opacity hover:opacity-90 ${resolveStep4BlockBadgeClass(reason)}`}
                    >
                      {t(`story.step4.block.${reason}`)}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
      {selectedNode && recommendation ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={goRecommended}
          disabled={workflow.activeStep === recommendation.targetStep}
          className="w-full"
        >
          {t("editor.header.goRecommended")}
        </Button>
      ) : null}
    </div>
  );
}
