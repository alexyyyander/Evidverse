"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import IconButton from "@/components/ui/icon-button";
import { Repeat, StepBack, StepForward } from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18nContext";
import StoryNodeCard from "@/components/editor/story/StoryNodeCard";
import { useEditorStore } from "@/store/editorStore";
import Button from "@/components/ui/button";

export default function PreviewPanel({
  videoUrl,
  label,
  storyNodeId,
}: {
  videoUrl: string | null;
  label?: string | null;
  storyNodeId?: string | null;
}) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [loop, setLoop] = useState(false);
  const [cardTransitioning, setCardTransitioning] = useState(false);
  const workflow = useEditorStore((s) => s.data.storyWorkflow);
  const updateStoryUi = useEditorStore((s) => s.updateStoryUi);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.loop = loop;
  }, [loop]);

  const safeLabel = useMemo(() => (typeof label === "string" && label.trim().length > 0 ? label.trim() : null), [label]);
  const selectedNode = useMemo(() => {
    if (!workflow || !storyNodeId) return null;
    return workflow.nodes.find((n) => n.id === storyNodeId) || null;
  }, [workflow, storyNodeId]);
  const preferCard = !!workflow?.ui?.previewPreferCard;

  useEffect(() => {
    if (!storyNodeId) return;
    setCardTransitioning(true);
    const timer = window.setTimeout(() => setCardTransitioning(false), 220);
    return () => window.clearTimeout(timer);
  }, [storyNodeId]);

  const shouldPreferCard = !videoUrl || !selectedNode?.step4.confirmed || preferCard;

  return (
    <div className="flex-1 bg-black flex items-center justify-center relative">
      {!shouldPreferCard && videoUrl ? (
        <>
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {safeLabel ? (
                <div className="px-2 py-1 rounded-md bg-black/60 text-xs text-white truncate">{safeLabel}</div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {selectedNode ? (
                <Button size="sm" variant="secondary" onClick={() => updateStoryUi({ previewPreferCard: true })}>
                  {t("story.preview.card")}
                </Button>
              ) : null}
              <IconButton
                aria-label={t("story.preview.toggleLoop")}
                variant="secondary"
                className={cn(loop ? "ring-2 ring-ring" : "")}
                onClick={() => setLoop((v) => !v)}
              >
                <Repeat size={16} />
              </IconButton>
              <IconButton
                aria-label={t("story.preview.stepBack")}
                variant="secondary"
                onClick={() => {
                  const el = videoRef.current;
                  if (!el) return;
                  el.currentTime = Math.max(0, el.currentTime - 0.1);
                }}
              >
                <StepBack size={16} />
              </IconButton>
              <IconButton
                aria-label={t("story.preview.stepForward")}
                variant="secondary"
                onClick={() => {
                  const el = videoRef.current;
                  if (!el) return;
                  el.currentTime = Math.min(el.duration || el.currentTime + 0.1, el.currentTime + 0.1);
                }}
              >
                <StepForward size={16} />
              </IconButton>
            </div>
          </div>
          <video ref={videoRef} src={videoUrl} controls className="max-h-full max-w-full" autoPlay />
        </>
      ) : (
        <div className="h-full w-full overflow-auto p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {selectedNode
                ? t("story.preview.nodeLabel").replace("{order}", String(selectedNode.order + 1))
                : t("preview.placeholder")}
            </div>
            {videoUrl && selectedNode?.step4.confirmed ? (
              <Button size="sm" variant="secondary" onClick={() => updateStoryUi({ previewPreferCard: false })}>
                {t("story.preview.video")}
              </Button>
            ) : null}
          </div>
          <div
            className={cn(
              "flex w-full justify-center transition-all duration-300",
              cardTransitioning ? "translate-y-1 opacity-70" : "translate-y-0 opacity-100",
            )}
          >
            <StoryNodeCard nodeId={storyNodeId || workflow?.selectedNodeId || null} />
          </div>
        </div>
      )}
    </div>
  );
}
