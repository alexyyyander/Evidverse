"use client";

import { useMemo } from "react";
import { useEditorStore } from "@/store/editorStore";
import Button from "@/components/ui/button";

export default function InspectorPanel() {
  const selectedTimelineItemId = useEditorStore((s) => s.selection.selectedTimelineItemId);
  const { data, selectBeat, selectAsset } = useEditorStore();

  const info = useMemo(() => {
    if (!selectedTimelineItemId) return null;
    const item = data.timelineItems[selectedTimelineItemId];
    if (!item) return null;
    const beat = item.linkedBeatId ? data.beats[item.linkedBeatId] : null;
    const clip = data.clips[item.clipId];
    const asset = clip ? data.assets[clip.assetId] : null;
    return { item, beat, clip, asset };
  }, [selectedTimelineItemId, data]);

  if (!selectedTimelineItemId) {
    return <div className="text-muted-foreground">选择一个片段查看详情</div>;
  }

  if (!info) {
    return <div className="text-muted-foreground">未找到该片段</div>;
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold">Timeline Item</div>
        <div className="mt-1 text-xs text-muted-foreground break-all">{info.item.id}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Start</div>
          <div>{info.item.startTime.toFixed(2)}s</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Duration</div>
          <div>{info.item.duration.toFixed(2)}s</div>
        </div>
      </div>

      {info.beat ? (
        <div>
          <div className="text-sm font-semibold">Beat</div>
          <div className="mt-1 text-xs text-muted-foreground break-all">{info.beat.id}</div>
          <div className="mt-2 text-sm whitespace-pre-wrap">{info.beat.narration || ""}</div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => selectBeat(info.beat!.id, "inspector")}>
              定位到 Beat
            </Button>
          </div>
        </div>
      ) : null}

      {info.asset ? (
        <div>
          <div className="text-sm font-semibold">Asset</div>
          <div className="mt-1 text-xs text-muted-foreground">{info.asset.type}</div>
          <a href={info.asset.url} target="_blank" className="mt-1 block text-xs text-primary underline break-all">
            打开资源
          </a>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => selectAsset(info.asset!.id, "inspector")}>
              选中资源
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

