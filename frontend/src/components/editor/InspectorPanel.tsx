"use client";

import { useMemo } from "react";
import { useEditorStore } from "@/store/editorStore";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTimelineStore } from "@/store/timelineStore";
import { useI18n } from "@/lib/i18nContext";
import { resolveNodeRecommendedAction } from "@/lib/editor/storyProgress";
import StoryActionBadge from "@/components/editor/story/StoryActionBadge";

export default function InspectorPanel() {
  const { t } = useI18n();
  const selectedTimelineItemId = useEditorStore((s) => s.selection.selectedTimelineItemId);
  const selectedStoryNodeId = useEditorStore((s) => s.selection.selectedStoryNodeId);
  const data = useEditorStore((s) => s.data);
  const selectBeat = useEditorStore((s) => s.selectBeat);
  const selectAsset = useEditorStore((s) => s.selectAsset);
  const selectStoryNode = useEditorStore((s) => s.selectStoryNode);
  const setActiveStep = useEditorStore((s) => s.setActiveStep);
  const updateLayout = useEditorStore((s) => s.updateLayout);
  const { editorData, setEditorData } = useTimelineStore();
  const syncTimelineFromRows = useEditorStore((s) => s.syncTimelineFromRows);

  const info = useMemo(() => {
    if (!selectedTimelineItemId) return null;
    const item = data.timelineItems[selectedTimelineItemId];
    if (!item) return null;
    const beat = item.linkedBeatId ? data.beats[item.linkedBeatId] : null;
    const clip = data.clips[item.clipId];
    const asset = clip ? data.assets[clip.assetId] : null;
    return { item, beat, clip, asset };
  }, [selectedTimelineItemId, data]);

  const selectedNode = useMemo(() => {
    const workflow = data.storyWorkflow;
    if (!workflow) return null;
    const nodeId = selectedStoryNodeId || workflow.selectedNodeId;
    if (!nodeId) return null;
    return workflow.nodes.find((node) => node.id === nodeId) || null;
  }, [data.storyWorkflow, selectedStoryNodeId]);

  const recommendation = useMemo(() => {
    if (!selectedNode) return null;
    return resolveNodeRecommendedAction(selectedNode, { beats: data.beats });
  }, [data.beats, selectedNode]);

  if (!selectedTimelineItemId && !selectedNode) {
    return <div className="text-muted-foreground">{t("inspector.select")}</div>;
  }

  if (selectedTimelineItemId && !info && !selectedNode) {
    return <div className="text-muted-foreground">{t("inspector.notFound")}</div>;
  }

  return (
    <div className="space-y-4">
      {selectedNode ? (
        <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">{t("inspector.storyNode")}</h3>
            <div className="text-xs text-muted-foreground break-all">#{selectedNode.order + 1} {selectedNode.title}</div>
            {recommendation ? (
              <StoryActionBadge action={recommendation.action} tone="soft" className="text-[11px]" />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                selectStoryNode(selectedNode.id, "inspector");
                updateLayout({ activeLeftTab: "create" });
                if (recommendation) setActiveStep(recommendation.targetStep);
              }}
            >
              {t("inspector.goRecommended")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                selectStoryNode(selectedNode.id, "inspector");
                updateLayout({ activeLeftTab: "create" });
                setActiveStep("step2");
              }}
            >
              {t("story.step2.title")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                selectStoryNode(selectedNode.id, "inspector");
                updateLayout({ activeLeftTab: "create" });
                setActiveStep("step3");
              }}
              disabled={selectedNode.locked}
            >
              {t("story.step3.title")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                selectStoryNode(selectedNode.id, "inspector");
                updateLayout({ activeLeftTab: "create" });
                setActiveStep("step4");
              }}
              disabled={selectedNode.locked}
            >
              {t("story.step4.title")}
            </Button>
          </div>
          {selectedNode.locked ? (
            <div className="text-[11px] text-muted-foreground">
              {t("inspector.storyNode.lockedHint")}
            </div>
          ) : null}
        </div>
      ) : null}

      {info ? (
        <>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">{t("inspector.item")}</h3>
            <div className="text-xs text-muted-foreground break-all">{info.item.id}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item-start">{t("inspector.start")}</Label>
              <Input
                id="item-start"
                value={String(info.item.startTime)}
                onChange={(e) => {
                  const nextStart = Number(e.target.value);
                  if (!Number.isFinite(nextStart)) return;
                  const nextRows = editorData.map((row) => ({
                    ...row,
                    actions: row.actions.map((a) =>
                      a.id === info.item.id ? { ...a, start: nextStart, end: nextStart + info.item.duration } : a
                    ),
                  }));
                  setEditorData(nextRows as any);
                  syncTimelineFromRows(nextRows as any);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-duration">{t("inspector.duration")}</Label>
              <Input
                id="item-duration"
                value={String(info.item.duration)}
                onChange={(e) => {
                  const nextDuration = Number(e.target.value);
                  if (!Number.isFinite(nextDuration) || nextDuration < 0) return;
                  const nextRows = editorData.map((row) => ({
                    ...row,
                    actions: row.actions.map((a) =>
                      a.id === info.item.id ? { ...a, start: info.item.startTime, end: info.item.startTime + nextDuration } : a
                    ),
                  }));
                  setEditorData(nextRows as any);
                  syncTimelineFromRows(nextRows as any);
                }}
              />
            </div>
          </div>

          {info.beat ? (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">{t("inspector.beat")}</h3>
                <div className="text-xs text-muted-foreground break-all">{info.beat.id}</div>
              </div>
              <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground whitespace-pre-wrap">
                {info.beat.narration || "(No narration)"}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => selectBeat(info.beat!.id, "inspector")}>
                  {t("inspector.locateBeat")}
                </Button>
              </div>
            </div>
          ) : null}

          {info.asset ? (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">{t("inspector.asset")}</h3>
                <div className="text-xs text-muted-foreground">{info.asset.type}</div>
              </div>
              <a href={info.asset.url} target="_blank" className="block text-xs text-primary underline break-all">
                {t("inspector.openAsset")}
              </a>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => selectAsset(info.asset!.id, "inspector")}>
                  {t("inspector.selectAsset")}
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
