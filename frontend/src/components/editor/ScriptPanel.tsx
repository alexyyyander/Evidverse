"use client";

import { useEffect, useMemo, useRef } from "react";
import type { GenerateClipResult, TaskResponse } from "@/lib/api";
import PromptPanel from "@/components/editor/PromptPanel";
import { useEditorStore } from "@/store/editorStore";
import { getBeatTitle } from "@/lib/editor/workspace";
import { cn } from "@/lib/cn";

export default function ScriptPanel({
  onTaskStarted,
  task,
  busy,
}: {
  onTaskStarted: (taskId: string) => void;
  task: TaskResponse<GenerateClipResult> | null;
  busy: boolean;
}) {
  const { workspace, setPrompt, selectBeat } = useEditorStore();
  const listRef = useRef<HTMLDivElement | null>(null);

  const beatsInOrder = useMemo(() => {
    const beats: { id: string; sceneTitle: string; order: number; title: string }[] = [];
    const scenes = [...workspace.story.scenes].sort((a, b) => a.order - b.order);
    scenes.forEach((scene) => {
      scene.beatIds.forEach((beatId, idx) => {
        const beat = workspace.story.beatsById[beatId];
        if (!beat) return;
        beats.push({
          id: beat.id,
          sceneTitle: scene.title,
          order: idx + 1,
          title: getBeatTitle(beat),
        });
      });
    });
    return beats;
  }, [workspace.story.beatsById, workspace.story.scenes]);

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const id = workspace.selection.selectedBeatId;
    if (!id) return;
    const el = container.querySelector(`[data-beat-id="${id}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ block: "nearest" });
  }, [workspace.selection.selectedBeatId]);

  return (
    <div className="flex flex-col gap-4">
      <PromptPanel
        prompt={workspace.prompt}
        onPromptChange={setPrompt}
        onTaskStarted={onTaskStarted}
        task={task}
        busy={busy}
      />

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-background/60">
          <div className="text-sm font-semibold">Story</div>
        </div>
        <div ref={listRef} className="max-h-[360px] overflow-y-auto p-2">
          {beatsInOrder.length === 0 ? (
            <div className="text-sm text-muted-foreground px-2 py-3">No beats yet.</div>
          ) : (
            <div className="flex flex-col gap-1">
              {beatsInOrder.map((b) => {
                const active = workspace.selection.selectedBeatId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    data-beat-id={b.id}
                    className={cn(
                      "w-full text-left rounded-md px-2 py-2 border border-transparent hover:bg-secondary transition-colors",
                      active ? "bg-secondary border-border" : ""
                    )}
                    onClick={() => selectBeat(b.id)}
                  >
                    <div className="text-xs text-muted-foreground truncate">{b.sceneTitle}</div>
                    <div className="text-sm font-medium truncate">{b.title}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

