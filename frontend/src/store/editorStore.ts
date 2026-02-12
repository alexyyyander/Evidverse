import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useTimelineStore } from './timelineStore';
import { projectApi, TimelineWorkspace } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { createId } from "@/lib/editor/id";
import { extractCharactersFromBeats, toEditorStateFromGenerateClipResult } from "@/lib/editor/fromGenerateClip";
import { 
  EditorStateData, 
  Beat,
  BeatId, 
  Character,
  CharacterId, 
  AssetId, 
  IdeaParameters,
  IdeaVersion,
  IdeaVersionId,
  GenerationTask,
  TaskStatus
} from '@/lib/editor/types';
import type { GenerateClipResult } from "@/lib/api";
import type { LayoutState, SelectionState, SelectionSource } from "@/lib/editor/ui";

type WorkspaceSnapshot = {
  editorState: EditorStateData;
  timeline: { editorData: any; effects: any };
  selection: SelectionState;
};

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface EditorState {
  data: EditorStateData;
  selection: SelectionState;
  layout: LayoutState;
  history: {
    undo: WorkspaceSnapshot[];
    redo: WorkspaceSnapshot[];
    recording: boolean;
    applying: boolean;
  };
  
  // Actions
  selectBeat: (id: BeatId | null, source?: SelectionSource) => void;
  selectTimelineItem: (id: string | null, source?: SelectionSource) => void;
  selectCharacter: (id: CharacterId | null, source?: SelectionSource) => void;
  selectAsset: (id: AssetId | null, source?: SelectionSource) => void;
  
  updateLayout: (layout: Partial<LayoutState>) => void;
  
  setData: (data: EditorStateData) => void;

  addIdeaVersion: (params: { text: string; params: IdeaParameters }) => IdeaVersion;
  setActiveIdeaVersion: (id: IdeaVersionId | null) => void;
  addGenerationTask: (task: GenerationTask) => void;
  updateGenerationTask: (taskId: string, patch: Partial<GenerationTask>) => void;
  applyClipTaskResult: (
    taskId: string,
    result: GenerateClipResult,
    options?: { mode?: "append" | "replace" }
  ) => void;
  applyBeatClipResult: (params: {
    taskId: string;
    beatId: BeatId;
    result: GenerateClipResult;
    mode: "append" | "replace";
  }) => void;
  applyCharacterTaskResult: (params: { taskId: string; characterId: CharacterId; result: any }) => void;
  extractCharacters: () => void;
  updateBeat: (beatId: BeatId, patch: Partial<Beat>) => void;
  updateCharacter: (characterId: CharacterId, patch: Partial<Character>) => void;
  deleteCharacter: (characterId: CharacterId) => void;
  mergeCharacter: (fromCharacterId: CharacterId, toCharacterId: CharacterId) => void;
  syncTimelineFromRows: (rows: Array<{ id: string; actions: Array<{ id: string; start: number; end: number }> }>) => void;
  beginHistoryGroup: () => void;
  endHistoryGroup: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  saveProject: (projectId: number, options?: { silent?: boolean }) => Promise<void>;
  loadProject: (projectId: number) => Promise<void>;
}

export const useEditorStore = create<EditorState>()(
  immer((set, get) => ({
    data: {
      scenes: {},
      beats: {},
      characters: {},
      assets: {},
      clips: {},
      timelineItems: {},
      sceneOrder: [],
      ideaVersions: [],
      generationTasks: [],
      activeIdeaVersionId: undefined,
    },
    selection: {
      selectedBeatId: null,
      selectedTimelineItemId: null,
      selectedCharacterId: null,
      selectedAssetId: null,
      source: null,
    },
    layout: {
      leftPanelWidth: 300,
      rightPanelWidth: 300,
      bottomPanelHeight: 300,
      leftPanelCollapsed: false,
      rightPanelCollapsed: false,
      bottomPanelCollapsed: false,
      activeLeftTab: 'script',
      activeRightTab: 'inspector',
    },
    history: {
      undo: [],
      redo: [],
      recording: false,
      applying: false,
    },
    
    selectBeat: (id, source = null) => set((state) => {
      state.selection.selectedBeatId = id;
      state.selection.source = source;
    }),
    
    selectTimelineItem: (id, source = null) => set((state) => {
      state.selection.selectedTimelineItemId = id;
      state.selection.source = source;
      if (id) {
        const item = state.data.timelineItems[id as any];
        if (item && item.linkedBeatId) {
          state.selection.selectedBeatId = item.linkedBeatId;
        }
      }
    }),

    selectCharacter: (id, source = null) => set((state) => {
      state.selection.selectedCharacterId = id;
      state.selection.source = source;
    }),

    selectAsset: (id, source = null) => set((state) => {
      state.selection.selectedAssetId = id;
      state.selection.source = source;
    }),
    
    updateLayout: (layout) => set((state) => {
      Object.assign(state.layout, layout);
    }),
    
    setData: (data) => set((state) => {
      state.data = data;
    }),

    beginHistoryGroup: () =>
      set((state) => {
        if (state.history.applying) return;
        if (state.history.recording) return;
        const { editorData, effects } = useTimelineStore.getState();
        state.history.undo.push({
          editorState: cloneValue(state.data),
          timeline: { editorData: cloneValue(editorData), effects: cloneValue(effects) },
          selection: cloneValue(state.selection),
        });
        state.history.redo = [];
        if (state.history.undo.length > 50) state.history.undo = state.history.undo.slice(-50);
        state.history.recording = true;
      }),

    endHistoryGroup: () =>
      set((state) => {
        state.history.recording = false;
      }),

    canUndo: () => get().history.undo.length > 0,
    canRedo: () => get().history.redo.length > 0,

    undo: () => {
      const { history } = get();
      if (history.undo.length === 0) return;
      const snap = history.undo[history.undo.length - 1];
      set((state) => {
        state.history.applying = true;
        const { editorData, effects } = useTimelineStore.getState();
        state.history.redo.push({
          editorState: cloneValue(state.data),
          timeline: { editorData: cloneValue(editorData), effects: cloneValue(effects) },
          selection: cloneValue(state.selection),
        });
        state.history.undo = state.history.undo.slice(0, -1);
        state.data = cloneValue(snap.editorState);
        state.selection = cloneValue(snap.selection);
        state.history.recording = false;
      });
      useTimelineStore.setState({ editorData: cloneValue(snap.timeline.editorData), effects: cloneValue(snap.timeline.effects) });
      set((state) => {
        state.history.applying = false;
      });
    },

    redo: () => {
      const { history } = get();
      if (history.redo.length === 0) return;
      const snap = history.redo[history.redo.length - 1];
      set((state) => {
        state.history.applying = true;
        const { editorData, effects } = useTimelineStore.getState();
        state.history.undo.push({
          editorState: cloneValue(state.data),
          timeline: { editorData: cloneValue(editorData), effects: cloneValue(effects) },
          selection: cloneValue(state.selection),
        });
        state.history.redo = state.history.redo.slice(0, -1);
        state.data = cloneValue(snap.editorState);
        state.selection = cloneValue(snap.selection);
        state.history.recording = false;
      });
      useTimelineStore.setState({ editorData: cloneValue(snap.timeline.editorData), effects: cloneValue(snap.timeline.effects) });
      set((state) => {
        state.history.applying = false;
      });
    },

    addIdeaVersion: ({ text, params }) => {
      const idea: IdeaVersion = {
        id: createId("idea"),
        createdAt: new Date().toISOString(),
        text,
        params,
      };
      set((state) => {
        if (!state.history.recording && !state.history.applying) {
          const { editorData, effects } = useTimelineStore.getState();
          state.history.undo.push({
            editorState: cloneValue(state.data),
            timeline: { editorData: cloneValue(editorData), effects: cloneValue(effects) },
            selection: cloneValue(state.selection),
          });
          state.history.redo = [];
          if (state.history.undo.length > 50) state.history.undo = state.history.undo.slice(-50);
        }
        const next = state.data.ideaVersions ? [...state.data.ideaVersions, idea] : [idea];
        state.data.ideaVersions = next;
        state.data.activeIdeaVersionId = idea.id;
      });
      return idea;
    },

    setActiveIdeaVersion: (id) =>
      set((state) => {
        state.data.activeIdeaVersionId = id || undefined;
      }),

    addGenerationTask: (task) =>
      set((state) => {
        const tasks = state.data.generationTasks ? [...state.data.generationTasks] : [];
        tasks.unshift(task);
        state.data.generationTasks = tasks;
      }),

    updateGenerationTask: (taskId, patch) =>
      set((state) => {
        if (!state.data.generationTasks) return;
        state.data.generationTasks = state.data.generationTasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t));
      }),

    applyClipTaskResult: (taskId, result, options) => {
      const current = get().data;
      const mode = options?.mode || "append";
      const base: EditorStateData =
        mode === "replace"
          ? {
              scenes: {},
              beats: {},
              characters: current.characters,
              assets: {},
              clips: {},
              timelineItems: {},
              sceneOrder: [],
              ideaVersions: current.ideaVersions,
              generationTasks: current.generationTasks,
              activeIdeaVersionId: current.activeIdeaVersionId,
            }
          : current;
      const activeIdea = (base.ideaVersions || []).find((v) => v.id === base.activeIdeaVersionId) || null;
      const createdAt = new Date().toISOString();
      const ideaParams: IdeaParameters =
        activeIdea?.params || {
          style: "default",
          aspectRatio: "16:9",
          duration: 12,
          shotCount: 4,
          pace: "normal",
          language: "zh",
          resolution: "1080p",
        };

      const next = toEditorStateFromGenerateClipResult({ base, result, ideaParams, createdAt });
      if (!next) {
        get().updateGenerationTask(taskId, {
          status: "FAILURE" as TaskStatus,
          error: result.error || "Invalid generation result",
          result: result as any,
        });
        return;
      }

      get().beginHistoryGroup();
      set((state) => {
        state.data = next;
      });
      get().endHistoryGroup();

      const timelineRows = [
        {
          id: "0",
          actions: Object.values(next.timelineItems)
            .filter((t) => t.trackId === "0")
            .sort((a, b) => a.startTime - b.startTime)
            .map((t) => ({
              id: t.id,
              start: t.startTime,
              end: t.startTime + t.duration,
              effectId: t.id,
            })),
        },
      ];

      const effects: Record<string, any> = {};
      for (const item of Object.values(next.timelineItems)) {
        const beat = item.linkedBeatId ? next.beats[item.linkedBeatId] : null;
        effects[item.id] = { id: item.id, name: beat?.narration || "Clip" };
      }

      useTimelineStore.getState().setEditorData(timelineRows as any);
      useTimelineStore.setState({ effects } as any);

      const newest = Object.values(next.timelineItems).sort((a, b) => b.startTime - a.startTime)[0];
      if (newest) {
        get().selectTimelineItem(newest.id, "queue");
      }

      get().updateGenerationTask(taskId, { status: "SUCCESS" as TaskStatus, result: result as any });
    },

    applyBeatClipResult: ({ taskId, beatId, result, mode }) => {
      const clip0 = Array.isArray(result.clips) ? result.clips[0] : null;
      if (!clip0 || typeof clip0.video_url !== "string" || clip0.video_url.length === 0) {
        get().updateGenerationTask(taskId, { status: "FAILURE" as TaskStatus, error: result.error || "Invalid beat generation result" });
        return;
      }

      const current = get().data;
      const beat = current.beats[beatId];
      if (!beat) return;

      const createdAt = new Date().toISOString();
      const videoAssetId = createId("asset_video");
      const clipId = createId("clip");
      const imageUrl = typeof clip0.image_url === "string" ? clip0.image_url : "";
      const imageAssetId = imageUrl ? createId("asset_image") : null;

      const existingItems = Object.values(current.timelineItems)
        .filter((t) => t.linkedBeatId === beatId)
        .sort((a, b) => a.startTime - b.startTime);
      const firstExisting = existingItems[0] || null;

      let timelineItemId = firstExisting?.id || createId("timeline_item");
      let startTime = 0;
      if (mode === "replace" && firstExisting) startTime = firstExisting.startTime;
      if (mode === "append" || !firstExisting) {
        const last = Object.values(current.timelineItems).sort((a, b) => a.startTime - b.startTime).slice(-1)[0] || null;
        startTime = last ? last.startTime + last.duration : 0;
      }

      get().beginHistoryGroup();
      set((state) => {
        state.data.assets[videoAssetId] = {
          id: videoAssetId,
          type: "video",
          url: clip0.video_url as string,
          duration: beat.suggestedDuration,
          source: "generated",
          relatedBeatId: beatId,
          generationParams: { taskId },
          createdAt,
        };
        if (imageAssetId) {
          state.data.assets[imageAssetId] = {
            id: imageAssetId,
            type: "image",
            url: imageUrl,
            source: "generated",
            relatedBeatId: beatId,
            generationParams: { taskId },
            createdAt,
          };
        }
        state.data.clips[clipId] = { id: clipId, assetId: videoAssetId, startOffset: 0 };

        if (mode === "replace" && firstExisting) {
          state.data.timelineItems[timelineItemId] = {
            ...firstExisting,
            clipId,
            duration: beat.suggestedDuration,
            startTime,
          };
          for (let i = 1; i < existingItems.length; i += 1) {
            delete state.data.timelineItems[existingItems[i].id];
          }
        } else {
          state.data.timelineItems[timelineItemId] = {
            id: timelineItemId,
            clipId,
            trackId: "0",
            startTime,
            duration: beat.suggestedDuration,
            linkedBeatId: beatId,
          };
        }
      });
      get().endHistoryGroup();

      const next = get().data;
      const timelineRows = [
        {
          id: "0",
          actions: Object.values(next.timelineItems)
            .filter((t) => t.trackId === "0")
            .sort((a, b) => a.startTime - b.startTime)
            .map((t) => ({
              id: t.id,
              start: t.startTime,
              end: t.startTime + t.duration,
              effectId: t.id,
            })),
        },
      ];

      const effects: Record<string, any> = {};
      for (const item of Object.values(next.timelineItems)) {
        const b = item.linkedBeatId ? next.beats[item.linkedBeatId] : null;
        effects[item.id] = { id: item.id, name: b?.narration || "Clip" };
      }
      useTimelineStore.getState().setEditorData(timelineRows as any);
      useTimelineStore.setState({ effects } as any);

      get().selectTimelineItem(timelineItemId, "queue");
      get().updateGenerationTask(taskId, { status: "SUCCESS" as TaskStatus, result: result as any });
    },

    applyCharacterTaskResult: ({ taskId, characterId, result }) => {
      const imageUrl = typeof result?.image_url === "string" ? result.image_url : "";
      if (!imageUrl) {
        get().updateGenerationTask(taskId, { status: "FAILURE" as TaskStatus, error: result?.error || "Invalid character result" });
        return;
      }

      const createdAt = new Date().toISOString();
      const assetId = createId("asset_image");
      get().beginHistoryGroup();
      set((state) => {
        state.data.assets[assetId] = {
          id: assetId,
          type: "image",
          url: imageUrl,
          source: "generated",
          relatedCharacterId: characterId,
          generationParams: { taskId },
          createdAt,
        };
        const character = state.data.characters[characterId];
        if (character) state.data.characters[characterId] = { ...character, avatarUrl: imageUrl };
      });
      get().endHistoryGroup();

      get().updateGenerationTask(taskId, { status: "SUCCESS" as TaskStatus, result });
      get().selectCharacter(characterId, "queue");
    },

    extractCharacters: () => {
      const state = get();
      const beats = Object.values(state.data.beats).sort((a, b) => a.order - b.order);
      const existing = Object.values(state.data.characters);
      const createdAt = new Date().toISOString();
      const added = extractCharactersFromBeats({ beats, existing, createdAt });
      if (added.length === 0) return;
      set((draft) => {
        for (const c of added) draft.data.characters[c.id] = c;
      });
    },

    updateBeat: (beatId, patch) =>
      set((state) => {
        if (!state.history.recording && !state.history.applying) {
          const { editorData, effects } = useTimelineStore.getState();
          state.history.undo.push({
            editorState: cloneValue(state.data),
            timeline: { editorData: cloneValue(editorData), effects: cloneValue(effects) },
            selection: cloneValue(state.selection),
          });
          state.history.redo = [];
          if (state.history.undo.length > 50) state.history.undo = state.history.undo.slice(-50);
        }
        const beat = state.data.beats[beatId];
        if (!beat) return;
        state.data.beats[beatId] = { ...beat, ...patch };
      }),

    updateCharacter: (characterId, patch) =>
      set((state) => {
        if (!state.history.recording && !state.history.applying) {
          const { editorData, effects } = useTimelineStore.getState();
          state.history.undo.push({
            editorState: cloneValue(state.data),
            timeline: { editorData: cloneValue(editorData), effects: cloneValue(effects) },
            selection: cloneValue(state.selection),
          });
          state.history.redo = [];
          if (state.history.undo.length > 50) state.history.undo = state.history.undo.slice(-50);
        }
        const character = state.data.characters[characterId];
        if (!character) return;
        state.data.characters[characterId] = { ...character, ...patch };
      }),

    deleteCharacter: (characterId) => {
      get().beginHistoryGroup();
      set((state) => {
        delete state.data.characters[characterId];
        for (const beat of Object.values(state.data.beats)) {
          beat.characterIds = beat.characterIds.filter((id) => id !== characterId);
        }
        for (const asset of Object.values(state.data.assets)) {
          if (asset.relatedCharacterId === characterId) asset.relatedCharacterId = undefined;
        }
        if (state.selection.selectedCharacterId === characterId) state.selection.selectedCharacterId = null;
      });
      get().endHistoryGroup();
    },

    mergeCharacter: (fromCharacterId, toCharacterId) => {
      if (fromCharacterId === toCharacterId) return;
      get().beginHistoryGroup();
      set((state) => {
        for (const beat of Object.values(state.data.beats)) {
          if (!beat.characterIds.includes(fromCharacterId)) continue;
          const next = beat.characterIds.map((id) => (id === fromCharacterId ? toCharacterId : id));
          beat.characterIds = Array.from(new Set(next));
        }
        for (const asset of Object.values(state.data.assets)) {
          if (asset.relatedCharacterId === fromCharacterId) asset.relatedCharacterId = toCharacterId;
        }
        delete state.data.characters[fromCharacterId];
        if (state.selection.selectedCharacterId === fromCharacterId) state.selection.selectedCharacterId = toCharacterId;
      });
      get().endHistoryGroup();
    },

    syncTimelineFromRows: (rows) =>
      set((state) => {
        if (!state.history.recording && !state.history.applying) {
          const { editorData, effects } = useTimelineStore.getState();
          state.history.undo.push({
            editorState: cloneValue(state.data),
            timeline: { editorData: cloneValue(editorData), effects: cloneValue(effects) },
            selection: cloneValue(state.selection),
          });
          state.history.redo = [];
          if (state.history.undo.length > 50) state.history.undo = state.history.undo.slice(-50);
        }
        for (const row of rows) {
          for (const action of row.actions) {
            const item = state.data.timelineItems[action.id];
            if (!item) continue;
            state.data.timelineItems[action.id] = {
              ...item,
              trackId: String(row.id),
              startTime: action.start,
              duration: Math.max(0, action.end - action.start),
            };
          }
        }
      }),

    saveProject: async (projectId, options) => {
      const { data } = get();
      const { editorData, effects } = useTimelineStore.getState();
      const { layout, selection } = get();
      
      try {
          const workspace: TimelineWorkspace = {
              editorData,
              effects,
              editorState: data,
              editorUi: { layout, selection },
          };
          await projectApi.updateWorkspace(projectId, workspace);
          if (!options?.silent) {
               toast({ title: "Saved", description: "Project saved.", variant: "success" });
          }
      } catch (e) {
          const message = e instanceof Error ? e.message : "Failed to save project";
          toast({ title: "Save failed", description: message, variant: "destructive" });
      }
    },

    loadProject: async (projectId) => {
      try {
          const data = await projectApi.getWorkspace(projectId);
          if (data) {
              if (data.editorData) {
                  useTimelineStore.getState().setEditorData(data.editorData);
                  useTimelineStore.setState({ effects: data.effects || {} });
              }
              if (data.editorState) {
                  set(state => { state.data = data.editorState! });
              }
              if (data.editorUi) {
                  set((state) => {
                    state.layout = data.editorUi!.layout;
                    state.selection = data.editorUi!.selection;
                  });
              }
          }
      } catch (e) {
          const message = e instanceof Error ? e.message : "Failed to load project";
          toast({ title: "Load failed", description: message, variant: "destructive" });
      }
    }
  }))
);
