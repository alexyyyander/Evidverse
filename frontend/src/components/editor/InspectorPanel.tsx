"use client";

import { useMemo } from "react";
import { useEditorStore } from "@/store/editorStore";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { useTimelineStore } from "@/store/timelineStore";

export default function InspectorPanel() {
  const selectedTimelineItemId = useEditorStore((s) => s.selection.selectedTimelineItemId);
  const { data, selectBeat, selectAsset } = useEditorStore();
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
          <Input
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
        <div>
          <div className="text-xs text-muted-foreground">Duration</div>
          <Input
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
