"use client";

import { useMemo } from "react";
import Button from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useEditorStore } from "@/store/editorStore";
import { getBeatTitle } from "@/lib/editor/workspace";

export default function InspectorPanel() {
  const { workspace, selectTimelineItem, selectCharacter } = useEditorStore();

  const selectedBeat = useMemo(() => {
    const id = workspace.selection.selectedBeatId;
    if (!id) return null;
    return workspace.story.beatsById[id] || null;
  }, [workspace.selection.selectedBeatId, workspace.story.beatsById]);

  const selectedTimelineItemId = workspace.selection.selectedTimelineItemId || null;

  const linkedTimelineItems = useMemo(() => {
    const beatId = selectedBeat?.id || null;
    if (!beatId) return [];
    return Object.entries(workspace.timeline.itemsById)
      .filter(([, meta]) => meta?.beatId === beatId)
      .map(([id]) => id);
  }, [selectedBeat?.id, workspace.timeline.itemsById]);

  const selectedClip = useMemo(() => {
    const clipId = selectedBeat?.clipId || null;
    if (!clipId) return null;
    return workspace.clips.find((c) => c.id === clipId) || null;
  }, [selectedBeat?.clipId, workspace.clips]);

  const selectedAsset = useMemo(() => {
    if (!selectedClip) return null;
    return workspace.assets.find((a) => a.id === selectedClip.assetId) || null;
  }, [selectedClip, workspace.assets]);

  return (
    <div className="flex flex-col gap-4">
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-background/60">
          <div className="text-sm font-semibold">Selection</div>
        </div>
        <div className="p-3 flex flex-col gap-3">
          <div className="text-xs text-muted-foreground">Beat</div>
          {selectedBeat ? (
            <div className="rounded-md border border-border p-3">
              <div className="text-sm font-semibold">{getBeatTitle(selectedBeat)}</div>
              <div className="mt-1 text-xs text-muted-foreground break-all">{selectedBeat.id}</div>
              {selectedBeat.status ? <div className="mt-2 text-xs">Status: {selectedBeat.status}</div> : null}
              {selectedAsset?.type === "video" && selectedAsset.url ? (
                <div className="mt-2 text-xs text-muted-foreground break-all">Video: {selectedAsset.url}</div>
              ) : null}
              {Array.isArray(selectedBeat.characterIds) && selectedBeat.characterIds.length > 0 ? (
                <div className="mt-3">
                  <div className="text-xs text-muted-foreground">Characters</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedBeat.characterIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={cn(
                          "text-xs px-2 py-1 rounded border border-border hover:bg-secondary transition-colors",
                          workspace.selection.selectedCharacterId === id ? "ring-2 ring-ring" : ""
                        )}
                        onClick={() => selectCharacter(id)}
                      >
                        {workspace.characters.find((c) => c.id === id)?.name || id}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No beat selected.</div>
          )}

          <div className="text-xs text-muted-foreground">Timeline Item</div>
          {selectedTimelineItemId ? (
            <div className="rounded-md border border-border p-3">
              <div className="text-sm font-semibold">Timeline Item</div>
              <div className="mt-1 text-xs text-muted-foreground break-all">{selectedTimelineItemId}</div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No timeline item selected.</div>
          )}
        </div>
      </div>

      {linkedTimelineItems.length > 0 ? (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-background/60">
            <div className="text-sm font-semibold">Linked Timeline</div>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {linkedTimelineItems.map((id) => (
              <Button key={id} variant="secondary" onClick={() => selectTimelineItem(id, { alignPlayhead: true })}>
                Select {id.slice(0, 8)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

