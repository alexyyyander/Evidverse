"use client";

import { create } from "zustand";
import { projectApi } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import type { TaskResponse, GenerateClipResult } from "@/lib/api";
import {
  coerceEditorWorkspace,
  createDefaultWorkspace,
  createEditorId,
  type Asset,
  type BeatId,
  type ClipId,
  type EditorWorkspace,
  type TimelineItemId,
} from "@/lib/editor/workspace";

type DirtyState = {
  data: boolean;
  ui: boolean;
};

export type EditorState = {
  projectId: number | null;
  workspace: EditorWorkspace;
  playheadTime: number;
  isPlaying: boolean;
  lastTaskId: string | null;
  dirty: DirtyState;

  setProjectId: (id: number) => void;
  loadFromBackend: () => Promise<void>;
  saveToBackend: (options?: { silent?: boolean }) => Promise<void>;

  setPlayheadTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;

  setPrompt: (prompt: string) => void;
  ingestGenerationResult: (taskId: string, task: TaskResponse<GenerateClipResult>) => void;
  addCharacter: (name?: string) => void;

  selectBeat: (beatId: BeatId, options?: { alignPlayhead?: boolean }) => void;
  selectTimelineItem: (timelineItemId: TimelineItemId, options?: { alignPlayhead?: boolean }) => void;
  selectCharacter: (characterId: string | null) => void;

  setLayout: (partial: Partial<EditorWorkspace["layout"]>) => void;
  setLeftTab: (tab: EditorWorkspace["layout"]["leftTab"]) => void;
  setRightTab: (tab: EditorWorkspace["layout"]["rightTab"]) => void;

  updateTimelineData: (editorData: EditorWorkspace["timeline"]["editorData"]) => void;
  addClipFromCommit: (commitId: string, message: string, durationSec?: number) => void;
  selectFromTimelineTime: (timeSec: number) => void;
};

function getActionStartEnd(action: any): { start: number; end: number } {
  return { start: Number(action?.start ?? 0), end: Number(action?.end ?? 0) };
}

function findActionAtTime(editorData: any[], timeSec: number): { action: any; rowId: string } | null {
  for (const row of editorData || []) {
    const actions = Array.isArray(row?.actions) ? row.actions : [];
    for (const action of actions) {
      const { start, end } = getActionStartEnd(action);
      if (timeSec >= start && timeSec < end) return { action, rowId: String(row?.id ?? "") };
    }
  }
  return null;
}

function findActionById(editorData: any[], actionId: string): any | null {
  for (const row of editorData || []) {
    const actions = Array.isArray(row?.actions) ? row.actions : [];
    const found = actions.find((a: any) => String(a?.id ?? "") === actionId);
    if (found) return found;
  }
  return null;
}

export const useEditorStore = create<EditorState>((set, get) => {
  let saveDataTimer: number | null = null;
  let saveUiTimer: number | null = null;

  const scheduleSave = (kind: "data" | "ui") => {
    const delay = kind === "data" ? 800 : 1500;
    const current = kind === "data" ? saveDataTimer : saveUiTimer;
    if (current) window.clearTimeout(current);
    const t = window.setTimeout(() => {
      get()
        .saveToBackend({ silent: true })
        .finally(() => {
          set((s) => ({ dirty: { ...s.dirty, [kind]: false } }));
        });
    }, delay);
    if (kind === "data") saveDataTimer = t;
    else saveUiTimer = t;
  };

  const markDirty = (kind: "data" | "ui") => {
    set((s) => ({ dirty: { ...s.dirty, [kind]: true } }));
    scheduleSave(kind);
  };

  const alignSelectionToBeat = (workspace: EditorWorkspace, beatId: BeatId) => {
    const timelineItemId =
      Object.entries(workspace.timeline.itemsById).find(([, meta]) => meta?.beatId === beatId)?.[0] ?? null;
    return {
      ...workspace,
      selection: { ...workspace.selection, selectedBeatId: beatId, selectedTimelineItemId: timelineItemId },
    };
  };

  const alignSelectionToTimelineItem = (workspace: EditorWorkspace, timelineItemId: TimelineItemId) => {
    const meta = workspace.timeline.itemsById[timelineItemId];
    const beatId = meta?.beatId ?? workspace.selection.selectedBeatId ?? null;
    return {
      ...workspace,
      selection: { ...workspace.selection, selectedTimelineItemId: timelineItemId, selectedBeatId: beatId },
    };
  };

  return {
    projectId: null,
    workspace: createDefaultWorkspace(),
    playheadTime: 0,
    isPlaying: false,
    lastTaskId: null,
    dirty: { data: false, ui: false },

    setProjectId: (id) => set({ projectId: id }),

    loadFromBackend: async () => {
      const { projectId } = get();
      if (!projectId) return;
      try {
        const raw = await projectApi.getWorkspace(projectId);
        const workspace = coerceEditorWorkspace(raw);
        set({ workspace, dirty: { data: false, ui: false } });
        const selectedBeatId = workspace.selection.selectedBeatId;
        if (selectedBeatId) {
          const beat = workspace.story.beatsById[selectedBeatId];
          if (!beat) {
            const next = createDefaultWorkspace();
            set({ workspace: next });
          }
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load workspace";
        toast({ title: "Load failed", description: message, variant: "destructive" });
      }
    },

    saveToBackend: async (options) => {
      const { projectId, workspace } = get();
      if (!projectId) return;
      try {
        await projectApi.updateWorkspace(projectId, workspace);
        if (!options?.silent) {
          toast({ title: "Saved", description: "Workspace saved.", variant: "success" });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to save workspace";
        toast({ title: "Save failed", description: message, variant: "destructive" });
      }
    },

    setPlayheadTime: (time) => {
      set({ playheadTime: time });
      markDirty("ui");
    },

    setIsPlaying: (playing) => set({ isPlaying: playing }),

    setPrompt: (prompt) => {
      set((s) => ({ workspace: { ...s.workspace, prompt } }));
      markDirty("data");
    },

    ingestGenerationResult: (taskId, task) => {
      if (!task?.result) return;
      if (task.result.status !== "succeeded") return;
      const clips = Array.isArray(task.result.clips) ? task.result.clips : [];
      if (clips.length === 0) return;

      set((s) => {
        const workspace = s.workspace;
        const sceneId = createEditorId("scene");
        const beatIds: BeatId[] = [];
        const beatsById = { ...workspace.story.beatsById };
        const assets = [...workspace.assets];
        const clipsArr = [...workspace.clips];
        const effects = { ...workspace.timeline.effects } as Record<string, any>;
        const itemsById = { ...workspace.timeline.itemsById };
        const editorData = workspace.timeline.editorData.map((r: any) => ({ ...r, actions: Array.isArray(r.actions) ? [...r.actions] : [] }));
        const row0 = editorData.find((r: any) => String(r.id) === "0") || { id: "0", actions: [] };
        if (!editorData.find((r: any) => String(r.id) === "0")) editorData.push(row0);
        const lastAction = row0.actions[row0.actions.length - 1];
        let cursor = lastAction ? Number(lastAction.end) : 0;

        clips.forEach((c, idx) => {
          const beatId = createEditorId("beat");
          beatIds.push(beatId);
          const videoUrl = typeof c?.video_url === "string" ? c.video_url : "";
          const imageUrl = typeof c?.image_url === "string" ? c.image_url : "";

          const assetId = createEditorId("asset");
          if (videoUrl) {
            assets.push({
              id: assetId,
              type: "video",
              url: videoUrl,
              source: "generation",
              beatId,
              createdAt: new Date().toISOString(),
            });
          }
          if (imageUrl) {
            assets.push({
              id: createEditorId("asset"),
              type: "image",
              url: imageUrl,
              source: "generation",
              beatId,
              createdAt: new Date().toISOString(),
            });
          }

          const clipId = createEditorId("clip");
          if (videoUrl) {
            clipsArr.push({ id: clipId, assetId, name: `Clip ${idx + 1}` });
          }

          beatsById[beatId] = {
            id: beatId,
            sceneId,
            order: idx + 1,
            narration: typeof c?.narration === "string" ? c.narration : undefined,
            suggestedDurationSec: 5,
            status: "succeeded",
            clipId: videoUrl ? clipId : null,
          };

          if (videoUrl) {
            const timelineItemId = createEditorId("ti");
            const durationSec = 5;
            row0.actions.push({ id: timelineItemId, start: cursor, end: cursor + durationSec, effectId: clipId });
            itemsById[timelineItemId] = { clipId, beatId };
            effects[clipId] = { id: clipId, name: `Clip ${idx + 1}` };
            cursor += durationSec;
          }
        });

        const scenes = [
          ...workspace.story.scenes,
          {
            id: sceneId,
            order: workspace.story.scenes.length + 1,
            title: `Generated ${new Date().toLocaleString()}`,
            beatIds,
          },
        ];

        let next = {
          ...workspace,
          story: { scenes, beatsById },
          assets,
          clips: clipsArr,
          timeline: { ...workspace.timeline, editorData, effects, itemsById },
        };
        const firstBeatId = beatIds[0];
        if (firstBeatId) next = alignSelectionToBeat(next, firstBeatId);
        return { workspace: next, lastTaskId: taskId };
      });
      markDirty("data");
    },

    addCharacter: (name) => {
      const id = createEditorId("char");
      set((s) => ({
        workspace: {
          ...s.workspace,
          characters: [...s.workspace.characters, { id, name: name?.trim() ? name.trim() : `Character ${s.workspace.characters.length + 1}` }],
          selection: { ...s.workspace.selection, selectedCharacterId: id },
        },
      }));
      markDirty("data");
    },

    selectBeat: (beatId, options) => {
      set((s) => {
        const nextWorkspace = alignSelectionToBeat(s.workspace, beatId);
        const ti = nextWorkspace.selection.selectedTimelineItemId || null;
        if (!ti) return { workspace: nextWorkspace };
        const action = findActionById(nextWorkspace.timeline.editorData as any, ti);
        if (!action) return { workspace: nextWorkspace };
        return { workspace: nextWorkspace, playheadTime: Number(action.start ?? 0) };
      });
      markDirty("ui");
    },

    selectTimelineItem: (timelineItemId, options) => {
      set((s) => {
        const nextWorkspace = alignSelectionToTimelineItem(s.workspace, timelineItemId);
        const action = findActionById(nextWorkspace.timeline.editorData as any, timelineItemId);
        if (!action) return { workspace: nextWorkspace };
        return { workspace: nextWorkspace, playheadTime: Number(action.start ?? 0) };
      });
      markDirty("ui");
    },

    selectCharacter: (characterId) => {
      set((s) => ({ workspace: { ...s.workspace, selection: { ...s.workspace.selection, selectedCharacterId: characterId } } }));
      markDirty("ui");
    },

    setLayout: (partial) => {
      set((s) => ({ workspace: { ...s.workspace, layout: { ...s.workspace.layout, ...partial } } }));
      markDirty("ui");
    },

    setLeftTab: (tab) => {
      set((s) => ({ workspace: { ...s.workspace, layout: { ...s.workspace.layout, leftTab: tab } } }));
      markDirty("ui");
    },

    setRightTab: (tab) => {
      set((s) => ({ workspace: { ...s.workspace, layout: { ...s.workspace.layout, rightTab: tab } } }));
      markDirty("ui");
    },

    updateTimelineData: (editorData) => {
      set((s) => ({ workspace: { ...s.workspace, timeline: { ...s.workspace.timeline, editorData } } }));
      markDirty("data");
    },

    addClipFromCommit: (commitId, message, durationSec = 5) => {
      set((s) => {
        const workspace = s.workspace;
        const row = workspace.timeline.editorData.find((r) => String((r as any).id) === "0") || { id: "0", actions: [] };
        const lastAction = (row as any).actions?.[(row as any).actions.length - 1];
        const startTime = lastAction ? Number(lastAction.end) : 0;

        const assetId = createEditorId("asset");
        const clipId = createEditorId("clip");
        const timelineItemId = createEditorId("ti");

        const newAsset: Asset = { id: assetId, type: "video", url: "", source: "commit", createdAt: new Date().toISOString() };
        const assets = [...workspace.assets, newAsset];
        const clips = [...workspace.clips, { id: clipId, assetId, name: message || `Commit ${commitId.slice(0, 7)}` }];

        const newAction: any = {
          id: timelineItemId,
          start: startTime,
          end: startTime + durationSec,
          effectId: clipId,
        };

        const newRows = workspace.timeline.editorData.map((r: any) => {
          if (String(r.id) === "0") return { ...r, actions: [...(r.actions || []), newAction] };
          return r;
        });

        const effects = { ...workspace.timeline.effects, [clipId]: { id: clipId, name: message || `Commit ${commitId.slice(0, 7)}` } as any };
        const itemsById = { ...workspace.timeline.itemsById, [timelineItemId]: { clipId, beatId: null } };

        return { workspace: { ...workspace, assets, clips, timeline: { ...workspace.timeline, editorData: newRows, effects, itemsById } } };
      });
      markDirty("data");
    },

    selectFromTimelineTime: (timeSec) => {
      const { workspace } = get();
      const found = findActionAtTime(workspace.timeline.editorData as any, timeSec);
      if (!found) {
        get().setPlayheadTime(timeSec);
        return;
      }
      const timelineItemId = String(found.action?.id ?? "");
      const nextWorkspace = alignSelectionToTimelineItem(workspace, timelineItemId);
      set({ workspace: nextWorkspace, playheadTime: timeSec });
      markDirty("ui");
    },
  };
});
