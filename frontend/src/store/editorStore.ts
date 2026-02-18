import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useTimelineStore } from './timelineStore';
import { projectApi, TimelineWorkspace } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { isApiError } from "@/lib/api/errors";
import { createId } from "@/lib/editor/id";
import { extractCharactersFromBeats, toEditorStateFromGenerateClipResult } from "@/lib/editor/fromGenerateClip";
import { toEditorStateFromStoryboard } from "@/lib/editor/fromStoryboard";
import { applyStoryLockPolicy, buildStoryWorkflowFromEditorData, mapStoryNodeByBeatId } from "@/lib/editor/storyWorkflow";
import {
  collectNodeStep3MissingCharacterNames,
  summarizeNodeStep4ConfirmReadiness,
} from "@/lib/editor/storyProgress";
import { t as translate } from "@/lib/i18n";
import { 
  EditorStateData, 
  Asset,
  Clip,
  Beat,
  BeatId, 
  Character,
  CharacterId, 
  AssetId, 
  IdeaParameters,
  IdeaVersion,
  IdeaVersionId,
  GenerationTask,
  TaskStatus,
  TimelineItem,
  StoryNode,
  StoryStepKey,
  StoryWorkflowGlobal,
  StoryWorkflowMeta,
  StoryWorkflowUi
} from '@/lib/editor/types';
import type { GenerateClipResult, GenerateSegmentResult, StoryboardScene } from "@/lib/api";
import type { ExtendedSelectionSource, LayoutState, SelectionState } from "@/lib/editor/ui";

type WorkspaceSnapshot = {
  editorState: EditorStateData;
  timeline: { editorData: any; effects: any };
  selection: SelectionState;
};

type ConfirmNodeVideoResult =
  | { ok: true }
  | { ok: false; reason: "locked" | "missing_video" | "mapping_incomplete" | "missing_image"; missingCharacterNames?: string[] };

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getBeatIdFromNode(node: StoryNode): BeatId | null {
  const beatId = node.beatIds[0];
  return beatId ? (beatId as BeatId) : null;
}

function getNodeForBeatId(data: EditorStateData, beatId: BeatId): StoryNode | null {
  const workflow = data.storyWorkflow;
  if (!workflow) return null;
  const map = mapStoryNodeByBeatId(workflow);
  return map[beatId] || null;
}

function ensureStoryWorkflow(data: EditorStateData, branchName: string) {
  return buildStoryWorkflowFromEditorData({ data, branchName, existing: data.storyWorkflow || null });
}

function getRuntimeLang() {
  if (typeof window === "undefined") return "zh" as const;
  try {
    const raw = window.localStorage.getItem("lang");
    if (raw === "en" || raw === "zh" || raw === "ja") return raw;
  } catch {}
  return "zh" as const;
}

function i18nText(key: string) {
  return translate(getRuntimeLang(), key);
}

function showLockedNodeToast() {
  toast({
    title: i18nText("story.lockedToast.title"),
    description: i18nText("story.lockedToast.desc"),
    variant: "destructive",
  });
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
  selectBeat: (id: BeatId | null, source?: ExtendedSelectionSource) => void;
  selectTimelineItem: (id: string | null, source?: ExtendedSelectionSource) => void;
  selectCharacter: (id: CharacterId | null, source?: ExtendedSelectionSource) => void;
  selectAsset: (id: AssetId | null, source?: ExtendedSelectionSource) => void;
  selectStoryNode: (nodeId: string | null, source?: ExtendedSelectionSource) => void;
  setActiveStep: (step: StoryStepKey) => void;
  updateStoryGlobal: (patch: Partial<StoryWorkflowGlobal>) => void;
  updateStoryMeta: (meta: StoryWorkflowMeta | undefined) => void;
  updateStoryUi: (patch: Partial<StoryWorkflowUi>) => void;
  initializeStoryWorkflowFromStoryboard: (params: { branchName: string; ideaParams: IdeaParameters; storyboard: StoryboardScene[] }) => void;
  updateNodeStep2: (nodeId: string, patch: Partial<StoryNode["step2"]>) => boolean;
  updateNodeStep3: (nodeId: string, patch: Partial<StoryNode["step3"]>) => boolean;
  updateNodeStep4: (nodeId: string, patch: Partial<StoryNode["step4"]>) => boolean;
  updateNodeStep3Mapping: (nodeId: string, mapping: StoryNode["step3"]["characterAssetMap"]) => boolean;
  updateNodeStep4Binding: (nodeId: string, binding: Partial<StoryNode["step4"]["assetBindings"]>) => boolean;
  confirmNodeStep3: (nodeId: string) => { ok: boolean; missing: string[] };
  confirmNodeVideo: (nodeId: string) => ConfirmNodeVideoResult;
  setBranchBoundary: (order: number | null) => void;
  rewriteUnlockedNodesFromBoundary: () => void;
  isStoryNodeLocked: (nodeId: string) => boolean;
  
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
  applyBeatImageTaskResult: (params: { taskId: string; beatId: BeatId; result: any }) => void;
  applySegmentTaskResult: (params: { taskId: string; beatId: BeatId; result: GenerateSegmentResult }) => void;
  applyComfyuiTaskResult: (params: { taskId: string; result: any; beatId?: BeatId | null; characterId?: CharacterId | null }) => void;
  extractCharacters: () => void;
  applyStoryboard: (params: { topic: string; ideaParams: IdeaParameters; storyboard: StoryboardScene[]; mode?: "replace" | "append" }) => void;
  convertShotsToSegments: () => void;
  addImageAsset: (params: {
    url: string;
    source: Asset["source"];
    relatedBeatId?: BeatId;
    relatedCharacterId?: CharacterId;
    generationParams?: Record<string, any>;
  }) => AssetId;
  addBeatImageAsset: (params: { beatId: BeatId; url: string; source: Asset["source"] }) => void;
  addCharacterImageAsset: (params: { characterId: CharacterId; url: string; source: Asset["source"] }) => AssetId;
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
  
  saveProject: (projectId: string, options?: { silent?: boolean; branchName?: string }) => Promise<void>;
  loadProject: (projectId: string, options?: { branchName?: string }) => Promise<void>;
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
      storyWorkflow: undefined,
    },
    selection: {
      selectedBeatId: null,
      selectedTimelineItemId: null,
      selectedCharacterId: null,
      selectedAssetId: null,
      selectedStoryNodeId: null,
      source: null,
    },
    layout: {
      leftPanelWidth: 300,
      rightPanelWidth: 300,
      bottomPanelHeight: 300,
      leftPanelCollapsed: false,
      rightPanelCollapsed: false,
      bottomPanelCollapsed: false,
      activeLeftTab: 'create',
      activeRightTab: 'inspector',
      followSelection: true,
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
      if (!id) {
        state.selection.selectedStoryNodeId = null;
        return;
      }
      const node = getNodeForBeatId(state.data, id);
      if (node) {
        state.selection.selectedStoryNodeId = node.id;
        if (state.data.storyWorkflow) state.data.storyWorkflow.selectedNodeId = node.id;
      }
    }),
    
    selectTimelineItem: (id, source = null) => set((state) => {
      state.selection.selectedTimelineItemId = id;
      state.selection.source = source;
      if (id) {
        const item = state.data.timelineItems[id as any];
        if (item && item.linkedBeatId) {
          state.selection.selectedBeatId = item.linkedBeatId;
          const node = getNodeForBeatId(state.data, item.linkedBeatId);
          if (node) {
            state.selection.selectedStoryNodeId = node.id;
            if (state.data.storyWorkflow) state.data.storyWorkflow.selectedNodeId = node.id;
          }
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

    selectStoryNode: (nodeId, source = "story") =>
      set((state) => {
        state.selection.selectedStoryNodeId = nodeId;
        state.selection.source = source;
        if (!state.data.storyWorkflow) return;
        state.data.storyWorkflow.selectedNodeId = nodeId;
        if (!nodeId) return;
        const node = state.data.storyWorkflow.nodes.find((n) => n.id === nodeId);
        if (!node) return;
        const beatId = getBeatIdFromNode(node);
        if (beatId) {
          state.selection.selectedBeatId = beatId;
        }
      }),

    setActiveStep: (step) => {
      let blockedMissing: string[] = [];
      set((state) => {
        if (!state.data.storyWorkflow) return;
        if (step === "step4") {
          const selectedNodeId = state.data.storyWorkflow.selectedNodeId;
          const node = selectedNodeId ? state.data.storyWorkflow.nodes.find((n) => n.id === selectedNodeId) : null;
          if (node && !node.locked) {
            const missingNames = collectNodeStep3MissingCharacterNames(node, state.data);
            if (missingNames.length > 0) {
              blockedMissing = missingNames;
              return;
            }
          }
        }
        state.data.storyWorkflow.activeStep = step;
      });
      if (blockedMissing.length > 0) {
        toast({
          title: i18nText("story.step3.toast.mappingIncomplete.title"),
          description: i18nText("story.step3.toast.mappingIncomplete.desc")
            .replace("{count}", String(blockedMissing.length))
            .replace("{names}", blockedMissing.slice(0, 6).join(", ")),
          variant: "destructive",
        });
      }
    },

    updateStoryGlobal: (patch) =>
      set((state) => {
        if (!state.data.storyWorkflow) return;
        state.data.storyWorkflow.global = { ...state.data.storyWorkflow.global, ...patch };
      }),

    updateStoryMeta: (meta) =>
      set((state) => {
        if (!state.data.storyWorkflow) return;
        state.data.storyWorkflow.meta = meta;
      }),

    updateStoryUi: (patch) =>
      set((state) => {
        if (!state.data.storyWorkflow) return;
        state.data.storyWorkflow.ui = { ...(state.data.storyWorkflow.ui || {}), ...patch };
      }),

    initializeStoryWorkflowFromStoryboard: ({ branchName, ideaParams, storyboard }) => {
      const idea: IdeaVersion = {
        id: createId("idea"),
        createdAt: new Date().toISOString(),
        text: "story-workflow",
        params: ideaParams,
      };
      const nextState = toEditorStateFromStoryboard({ storyboard, ideaParams });
      nextState.ideaVersions = [idea];
      nextState.activeIdeaVersionId = idea.id;
      nextState.storyWorkflow = ensureStoryWorkflow(nextState, branchName);
      nextState.storyWorkflow.activeStep = "step2";
      nextState.storyWorkflow.selectedNodeId = nextState.storyWorkflow.nodes[0]?.id || null;

      get().beginHistoryGroup();
      set((state) => {
        state.data = nextState;
        state.selection.selectedStoryNodeId = nextState.storyWorkflow?.selectedNodeId || null;
      });
      useTimelineStore.getState().setEditorData([{ id: "0", actions: [] }] as any);
      useTimelineStore.setState({ effects: {} } as any);
      get().endHistoryGroup();
    },

    updateNodeStep2: (nodeId, patch) => {
      let updated = false;
      set((state) => {
        const workflow = state.data.storyWorkflow;
        if (!workflow) return;
        const node = workflow.nodes.find((n) => n.id === nodeId);
        if (!node) return;
        if (node.locked) return;

        node.step2 = { ...node.step2, ...patch };
        if (node.step2.status === "todo") node.step2.status = "in_progress";

        const beatId = getBeatIdFromNode(node);
        if (beatId) {
          const beat = state.data.beats[beatId];
          if (beat) {
            if (typeof patch.summary === "string") beat.narration = patch.summary;
            if (typeof patch.background === "string") beat.cameraDescription = patch.background;
          }
        }
        updated = true;
      });
      if (!updated) {
        const state = get();
        const node = state.data.storyWorkflow?.nodes.find((n) => n.id === nodeId);
        if (node?.locked) {
          showLockedNodeToast();
        }
      }
      return updated;
    },

    updateNodeStep3: (nodeId, patch) => {
      let updated = false;
      set((state) => {
        const workflow = state.data.storyWorkflow;
        if (!workflow) return;
        const node = workflow.nodes.find((n) => n.id === nodeId);
        if (!node || node.locked) return;
        node.step3 = { ...node.step3, ...patch };
        if (node.step3.status === "todo") node.step3.status = "in_progress";
        updated = true;
      });
      if (!updated) {
        const state = get();
        const node = state.data.storyWorkflow?.nodes.find((n) => n.id === nodeId);
        if (node?.locked) {
          showLockedNodeToast();
        }
      }
      return updated;
    },

    updateNodeStep4: (nodeId, patch) => {
      let updated = false;
      set((state) => {
        const workflow = state.data.storyWorkflow;
        if (!workflow) return;
        const node = workflow.nodes.find((n) => n.id === nodeId);
        if (!node || node.locked) return;
        node.step4 = { ...node.step4, ...patch };
        if (node.step4.status === "todo") node.step4.status = "in_progress";
        updated = true;
      });
      if (!updated) {
        const state = get();
        const node = state.data.storyWorkflow?.nodes.find((n) => n.id === nodeId);
        if (node?.locked) {
          showLockedNodeToast();
        }
      }
      return updated;
    },

    updateNodeStep3Mapping: (nodeId, mapping) => {
      let updated = false;
      set((state) => {
        const workflow = state.data.storyWorkflow;
        if (!workflow) return;
        const node = workflow.nodes.find((n) => n.id === nodeId);
        if (!node || node.locked) return;
        node.step3.characterAssetMap = { ...mapping };
        node.step4.assetBindings.characterAssetIds = {
          ...node.step4.assetBindings.characterAssetIds,
          ...Object.fromEntries(
            Object.entries(mapping).map(([characterId, assetId]) => [characterId, assetId || null]),
          ),
        };
        const values = Object.values(node.step3.characterAssetMap);
        node.step3.status = values.length > 0 && values.every((v) => !!v) ? "done" : "in_progress";
        updated = true;
      });
      if (!updated) {
        const state = get();
        const node = state.data.storyWorkflow?.nodes.find((n) => n.id === nodeId);
        if (node?.locked) {
          showLockedNodeToast();
        }
      }
      return updated;
    },

    updateNodeStep4Binding: (nodeId, binding) => {
      let updated = false;
      set((state) => {
        const workflow = state.data.storyWorkflow;
        if (!workflow) return;
        const node = workflow.nodes.find((n) => n.id === nodeId);
        if (!node || node.locked) return;
        node.step4.assetBindings = {
          ...node.step4.assetBindings,
          ...binding,
          characterAssetIds: {
            ...node.step4.assetBindings.characterAssetIds,
            ...(binding.characterAssetIds || {}),
          },
        };
        if (node.step4.status === "todo") node.step4.status = "in_progress";
        updated = true;
      });
      if (!updated) {
        const state = get();
        const node = state.data.storyWorkflow?.nodes.find((n) => n.id === nodeId);
        if (node?.locked) {
          showLockedNodeToast();
        }
      }
      return updated;
    },

    confirmNodeStep3: (nodeId) => {
      let result: { ok: boolean; missing: string[] } = { ok: false, missing: [] };
      let locked = false;
      set((state) => {
        const workflow = state.data.storyWorkflow;
        if (!workflow) return;
        const node = workflow.nodes.find((n) => n.id === nodeId);
        if (!node) return;
        if (node.locked) {
          locked = true;
          return;
        }
        const missing = collectNodeStep3MissingCharacterNames(node, state.data);
        if (missing.length > 0) {
          node.step3.status = "in_progress";
          result = { ok: false, missing };
          return;
        }
        node.step3.status = "done";
        workflow.activeStep = "step4";
        result = { ok: true, missing: [] };
      });
      if (locked) showLockedNodeToast();
      return result;
    },

    confirmNodeVideo: (nodeId) => {
      let result: ConfirmNodeVideoResult = { ok: false, reason: "missing_video" };
      set((state) => {
        const workflow = state.data.storyWorkflow;
        if (!workflow) return;
        const index = workflow.nodes.findIndex((n) => n.id === nodeId);
        if (index < 0) return;
        const node = workflow.nodes[index];
        if (node.locked) {
          result = { ok: false, reason: "locked" };
          return;
        }

        const readiness = summarizeNodeStep4ConfirmReadiness(node, state.data);
        if (!readiness.mappingComplete) {
          result = {
            ok: false,
            reason: "mapping_incomplete",
            missingCharacterNames: readiness.missingCharacterNames,
          };
          return;
        }
        if (readiness.imageBindingMissing) {
          result = { ok: false, reason: "missing_image" };
          return;
        }

        if (!readiness.videoReady) {
          result = { ok: false, reason: "missing_video" };
          return;
        }

        node.step4.confirmed = true;
        node.step4.status = "done";
        workflow.ui = {
          ...(workflow.ui || {}),
          eventFlowPulseNodeId: node.id,
          eventFlowPulseAt: Date.now(),
        };
        const next =
          workflow.nodes.find((candidate) => candidate.order > node.order && !candidate.locked && !candidate.step4.confirmed) ||
          workflow.nodes.find((candidate) => candidate.order > node.order && !candidate.locked) ||
          null;
        workflow.selectedNodeId = next?.id || node.id;
        workflow.activeStep = "step2";
        state.selection.selectedStoryNodeId = workflow.selectedNodeId;
        const beatId = next ? getBeatIdFromNode(next) : getBeatIdFromNode(node);
        if (beatId) state.selection.selectedBeatId = beatId;
        result = { ok: true };
      });

      if (result.ok) return result;
      if (result.reason === "locked") {
        showLockedNodeToast();
        return result;
      }
      if (result.reason === "mapping_incomplete") {
        const names = result.missingCharacterNames || [];
        toast({
          title: i18nText("story.step4.toast.mappingIncomplete.title"),
          description: i18nText("story.step4.toast.mappingIncomplete.desc")
            .replace("{count}", String(names.length))
            .replace("{names}", names.slice(0, 6).join(", ")),
          variant: "destructive",
        });
        return result;
      }
      if (result.reason === "missing_image") {
        toast({
          title: i18nText("story.step4.toast.missingImage.title"),
          description: i18nText("story.step4.toast.missingImage.desc"),
          variant: "destructive",
        });
        return result;
      }
      toast({
        title: i18nText("story.step4.toast.missingVideo.title"),
        description: i18nText("story.step4.toast.missingVideo.desc"),
        variant: "destructive",
      });
      return result;
    },

    setBranchBoundary: (order) =>
      set((state) => {
        if (!state.data.storyWorkflow) return;
        state.data.storyWorkflow.branchPolicy.lockBoundaryOrder = typeof order === "number" ? order : null;
        state.data.storyWorkflow.branchPolicy.boundaryConfigured = true;
        state.data.storyWorkflow = applyStoryLockPolicy(state.data.storyWorkflow);
      }),

    rewriteUnlockedNodesFromBoundary: () =>
      set((state) => {
        if (!state.data.storyWorkflow) return;
        for (const node of state.data.storyWorkflow.nodes) {
          if (node.locked) continue;
          node.step2.status = "todo";
          node.step3.status = "todo";
          node.step4.status = "todo";
          node.step4.confirmed = false;
          node.step4.videoTaskId = undefined;
          node.step4.videoAssetId = undefined;
        }
      }),

    isStoryNodeLocked: (nodeId) => {
      const node = get().data.storyWorkflow?.nodes.find((n) => n.id === nodeId);
      return !!node?.locked;
    },
    
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
        const tasks = state.data.generationTasks;
        if (!tasks) return;
        const index = tasks.findIndex((t) => t.id === taskId);
        if (index < 0) return;
        const current = tasks[index];
        let changed = false;
        const next: any = { ...current };
        for (const [key, value] of Object.entries(patch as any)) {
          if (next[key] !== value) {
            changed = true;
            next[key] = value;
          }
        }
        if (!changed) return;
        tasks[index] = next;
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
      const branchName = current.storyWorkflow?.branchPolicy.branchName || "main";
      next.storyWorkflow = buildStoryWorkflowFromEditorData({
        data: { ...next, storyWorkflow: current.storyWorkflow },
        branchName,
        existing: current.storyWorkflow || null,
      });

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

      set((state) => {
        const workflow = state.data.storyWorkflow;
        if (!workflow) return;
        const node = workflow.nodes.find((n) => n.beatIds.includes(beatId));
        if (!node) return;
        const videoAsset = Object.values(state.data.assets).find((a) => a.relatedBeatId === beatId && a.type === "video");
        if (videoAsset) {
          node.step4.videoAssetId = videoAsset.id;
          node.step4.status = "in_progress";
        }
      });

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
        if (state.data.storyWorkflow) {
          for (const node of state.data.storyWorkflow.nodes) {
            const hasCharacter = node.beatIds.some((beatId) => {
              const beat = state.data.beats[beatId];
              return !!beat && beat.characterIds.includes(characterId);
            });
            if (!hasCharacter) continue;
            node.step3.characterAssetMap[characterId] = assetId;
            node.step4.assetBindings.characterAssetIds[characterId] = assetId;
            const mappedValues = Object.values(node.step3.characterAssetMap);
            node.step3.status =
              mappedValues.length > 0 && mappedValues.every((v) => !!v) ? "done" : "in_progress";
          }
        }
      });
      get().endHistoryGroup();

      get().updateGenerationTask(taskId, { status: "SUCCESS" as TaskStatus, result });
      get().selectCharacter(characterId, "queue");
    },

    addImageAsset: ({ url, source, relatedBeatId, relatedCharacterId, generationParams }) => {
      const createdAt = new Date().toISOString();
      const assetId = createId("asset_image");
      set((state) => {
        state.data.assets[assetId] = {
          id: assetId,
          type: "image",
          url,
          source,
          relatedBeatId,
          relatedCharacterId,
          generationParams,
          createdAt,
        } as any;
      });
      return assetId as AssetId;
    },

    addBeatImageAsset: ({ beatId, url, source }) => {
      const assetId = get().addImageAsset({ url, source, relatedBeatId: beatId });
      set((state) => {
        if (state.data.storyWorkflow) {
          const node = state.data.storyWorkflow.nodes.find((n) => n.beatIds.includes(beatId));
          if (node) {
            node.step3.status = "in_progress";
            node.step4.assetBindings.backgroundAssetId = assetId;
            if (node.step4.status === "todo") node.step4.status = "in_progress";
          }
        }
      });
    },

    addCharacterImageAsset: ({ characterId, url, source }) => {
      const createdAt = new Date().toISOString();
      const assetId = createId("asset_image");
      set((state) => {
        state.data.assets[assetId] = {
          id: assetId,
          type: "image",
          url,
          source,
          relatedCharacterId: characterId,
          createdAt,
        } as any;
        const character = state.data.characters[characterId];
        if (character) {
          state.data.characters[characterId] = { ...character, avatarUrl: url };
        }
        if (state.data.storyWorkflow) {
          for (const node of state.data.storyWorkflow.nodes) {
            const includeCharacter = node.beatIds.some((beatId) => {
              const beat = state.data.beats[beatId];
              return !!beat && beat.characterIds.includes(characterId);
            });
            if (!includeCharacter) continue;
            node.step3.characterAssetMap[characterId] = assetId;
            node.step4.assetBindings.characterAssetIds[characterId] = assetId;
            const values = Object.values(node.step3.characterAssetMap);
            node.step3.status = values.length > 0 && values.every((v) => !!v) ? "done" : "in_progress";
          }
        }
      });
      return assetId as AssetId;
    },

    applyBeatImageTaskResult: ({ taskId, beatId, result }) => {
      const imageUrl = typeof result?.image_url === "string" ? result.image_url : "";
      if (!imageUrl) {
        get().updateGenerationTask(taskId, { status: "FAILURE" as TaskStatus, error: result?.error || "Invalid image result" });
        return;
      }
      get().beginHistoryGroup();
      get().addBeatImageAsset({ beatId, url: imageUrl, source: "generated" });
      get().endHistoryGroup();
      get().updateGenerationTask(taskId, { status: "SUCCESS" as TaskStatus, result });
      get().selectBeat(beatId, "queue");
    },

    applySegmentTaskResult: ({ taskId, beatId, result }) => {
      const videoUrl = typeof result?.video_url === "string" ? result.video_url : "";
      if (!videoUrl) {
        get().updateGenerationTask(taskId, { status: "FAILURE" as TaskStatus, error: result?.error || "Invalid segment result" });
        return;
      }

      const createdAt = new Date().toISOString();
      let affectedTimelineItemId: string | null = null;
      get().beginHistoryGroup();
      set((state) => {
        const beat = state.data.beats[beatId];
        const duration = beat ? beat.suggestedDuration : 0;
        const videoAssetId = createId("asset_video");
        state.data.assets[videoAssetId] = {
          id: videoAssetId,
          type: "video",
          url: videoUrl,
          duration,
          source: "generated",
          relatedBeatId: beatId,
          generationParams: { taskId },
          createdAt,
        };

        const all = Object.values(state.data.timelineItems).sort((a, b) => a.startTime - b.startTime);
        const imageUrl = typeof result?.image_url === "string" ? result.image_url : "";
        let imageAssetId: string | undefined;
        if (imageUrl) {
          const nextImageAssetId = createId("asset_image");
          state.data.assets[nextImageAssetId] = {
            id: nextImageAssetId,
            type: "image",
            url: imageUrl,
            source: "generated",
            relatedBeatId: beatId,
            generationParams: { taskId },
            createdAt,
          } as any;
          imageAssetId = nextImageAssetId;
        }

        const clipId = createId("clip");
        state.data.clips[clipId] = { id: clipId, assetId: videoAssetId, startOffset: 0 };

        const existing = all.find((t) => t.linkedBeatId === beatId) || null;
        if (existing) {
          affectedTimelineItemId = existing.id;
          state.data.timelineItems[existing.id] = {
            ...existing,
            clipId,
            duration,
          };
        } else {
          const last = all.length > 0 ? all[all.length - 1] : null;
          const startTime = last ? last.startTime + last.duration : 0;
          const timelineItemId = createId("timeline_item");
          state.data.timelineItems[timelineItemId] = {
            id: timelineItemId,
            clipId,
            trackId: "0",
            startTime,
            duration,
            linkedBeatId: beatId,
          };
          affectedTimelineItemId = timelineItemId;
        }

        const workflow = state.data.storyWorkflow;
        if (!workflow) return;
        const node = workflow.nodes.find((n) => n.beatIds.includes(beatId));
        if (!node) return;
        node.step4.videoAssetId = videoAssetId;
        node.step4.videoTaskId = taskId;
        node.step4.status = "in_progress";
        if (imageAssetId && !node.step4.assetBindings.backgroundAssetId) {
          node.step4.assetBindings.backgroundAssetId = imageAssetId;
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

      get().updateGenerationTask(taskId, { status: "SUCCESS" as TaskStatus, result: result as any });
      if (affectedTimelineItemId) {
        get().selectTimelineItem(affectedTimelineItemId, "queue");
        return;
      }
      get().selectBeat(beatId, "queue");
    },

    applyComfyuiTaskResult: ({ taskId, result, beatId, characterId }) => {
      const outputUrl = typeof result?.output_url === "string" ? result.output_url : "";
      if (!outputUrl) {
        get().updateGenerationTask(taskId, { status: "FAILURE" as TaskStatus, error: result?.error || "Invalid ComfyUI result" });
        return;
      }

      const task = get().data.generationTasks?.find((t) => t.id === taskId) || null;
      const kind = task?.type === "comfyui_video" ? "video" : "image";
      const createdAt = new Date().toISOString();
      const filename = String(result?.filename || "");
      const resolvedCharacterId =
        (characterId || (task?.refIds?.characterId as CharacterId | undefined) || null) as CharacterId | null;
      const resolvedBeatId = (beatId || (task?.refIds?.beatId as BeatId | undefined) || null) as BeatId | null;
      let affectedTimelineItemId: string | null = null;

      get().beginHistoryGroup();
      set((state) => {
        if (kind === "image") {
          const assetId = createId("asset_image");
          state.data.assets[assetId] = {
            id: assetId,
            type: "image",
            url: outputUrl,
            source: "generated",
            relatedBeatId: resolvedBeatId || undefined,
            relatedCharacterId: resolvedCharacterId || undefined,
            generationParams: { taskId, filename },
            createdAt,
          } as any;

          if (resolvedCharacterId) {
            const character = state.data.characters[resolvedCharacterId];
            if (character) {
              state.data.characters[resolvedCharacterId] = { ...character, avatarUrl: outputUrl };
            }
            if (state.data.storyWorkflow) {
              for (const node of state.data.storyWorkflow.nodes) {
                const containsCharacter = node.beatIds.some((id) => {
                  const beat = state.data.beats[id];
                  return !!beat && beat.characterIds.includes(resolvedCharacterId);
                });
                if (!containsCharacter) continue;
                node.step3.characterAssetMap[resolvedCharacterId] = assetId;
                node.step4.assetBindings.characterAssetIds[resolvedCharacterId] = assetId;
                const mappedValues = Object.values(node.step3.characterAssetMap);
                node.step3.status =
                  mappedValues.length > 0 && mappedValues.every((v) => !!v) ? "done" : "in_progress";
              }
            }
          }

          if (resolvedBeatId && state.data.storyWorkflow) {
            const node = state.data.storyWorkflow.nodes.find((n) => n.beatIds.includes(resolvedBeatId));
            if (node) {
              node.step4.assetBindings.backgroundAssetId = assetId;
              node.step3.status = "in_progress";
              if (node.step4.status === "todo") node.step4.status = "in_progress";
            }
          }
          return;
        }

        const assetId = createId("asset_video");
        const duration = (() => {
          if (resolvedBeatId) {
            const b = state.data.beats[resolvedBeatId];
            return b ? b.suggestedDuration : 0;
          }
          return 5;
        })();
        state.data.assets[assetId] = {
          id: assetId,
          type: "video",
          url: outputUrl,
          duration,
          source: "generated",
          relatedBeatId: resolvedBeatId || undefined,
          generationParams: { taskId, filename },
          createdAt,
        } as any;
        if (resolvedBeatId && state.data.storyWorkflow) {
          const node = state.data.storyWorkflow.nodes.find((n) => n.beatIds.includes(resolvedBeatId));
          if (node) {
            node.step4.videoAssetId = assetId;
            node.step4.videoTaskId = taskId;
            node.step4.status = "in_progress";
          }
        }

        const clipId = createId("clip");
        state.data.clips[clipId] = { id: clipId, assetId, startOffset: 0 };

        if (resolvedBeatId) {
          const existing = Object.values(state.data.timelineItems).find((t) => t.linkedBeatId === resolvedBeatId) || null;
          if (existing) {
            affectedTimelineItemId = existing.id;
            state.data.timelineItems[existing.id] = {
              ...existing,
              clipId,
              duration,
            } as any;
          } else {
            const all = Object.values(state.data.timelineItems).sort((a, b) => a.startTime - b.startTime);
            const last = all.length > 0 ? all[all.length - 1] : null;
            const startTime = last ? last.startTime + last.duration : 0;
            const timelineItemId = createId("timeline_item");
            state.data.timelineItems[timelineItemId] = {
              id: timelineItemId,
              clipId,
              trackId: "0",
              startTime,
              duration,
              linkedBeatId: resolvedBeatId,
            } as any;
            affectedTimelineItemId = timelineItemId;
          }
        }
      });
      get().endHistoryGroup();

      if (kind === "video" && resolvedBeatId) {
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
      }

      get().updateGenerationTask(taskId, { status: "SUCCESS" as TaskStatus, result: result as any });
      if (affectedTimelineItemId) {
        get().selectTimelineItem(affectedTimelineItemId, "queue");
        return;
      }
      if (resolvedCharacterId) {
        get().selectCharacter(resolvedCharacterId, "queue");
        return;
      }
      if (resolvedBeatId) get().selectBeat(resolvedBeatId, "queue");
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

    applyStoryboard: ({ topic, ideaParams, storyboard, mode }) => {
      const branchName = get().data.storyWorkflow?.branchPolicy.branchName || "main";
      const nextIdea: IdeaVersion = {
        id: createId("idea"),
        createdAt: new Date().toISOString(),
        text: topic,
        params: ideaParams,
      };
      const nextState = toEditorStateFromStoryboard({ storyboard, ideaParams });
      nextState.ideaVersions = [nextIdea];
      nextState.activeIdeaVersionId = nextIdea.id;
      nextState.storyWorkflow = buildStoryWorkflowFromEditorData({
        data: { ...nextState, storyWorkflow: get().data.storyWorkflow },
        branchName,
        existing: get().data.storyWorkflow || null,
      });
      nextState.storyWorkflow.activeStep = "step2";
      nextState.storyWorkflow.selectedNodeId = nextState.storyWorkflow.nodes[0]?.id || null;

      get().beginHistoryGroup();
      set((state) => {
        if (mode === "append") {
          const sceneOffset = state.data.sceneOrder.length;
          const appended = toEditorStateFromStoryboard({ storyboard, ideaParams });
          for (const sceneId of appended.sceneOrder) {
            const scene = appended.scenes[sceneId];
            state.data.scenes[sceneId] = { ...scene, order: sceneOffset + scene.order };
            state.data.sceneOrder.push(sceneId);
          }
          for (const [beatId, beat] of Object.entries(appended.beats)) {
            state.data.beats[beatId] = beat;
          }
          state.data.ideaVersions = [...(state.data.ideaVersions || []), nextIdea];
          state.data.activeIdeaVersionId = nextIdea.id;
          state.data.storyWorkflow = buildStoryWorkflowFromEditorData({
            data: state.data,
            branchName,
            existing: state.data.storyWorkflow || null,
          });
          if (!state.selection.selectedStoryNodeId) {
            state.selection.selectedStoryNodeId = state.data.storyWorkflow.selectedNodeId;
          }
          return;
        }
        state.data = nextState;
        state.selection.selectedStoryNodeId = nextState.storyWorkflow?.selectedNodeId || null;
      });
      useTimelineStore.getState().setEditorData([{ id: "0", actions: [] }] as any);
      useTimelineStore.setState({ effects: {} } as any);
      get().endHistoryGroup();
    },

    convertShotsToSegments: () => {
      get().beginHistoryGroup();
      set((state) => {
        const oldBeats = state.data.beats;
        const oldScenes = state.data.scenes;
        const oldAssets = state.data.assets;

        const beatIdMap = new Map<string, string>();
        const nextBeats: Record<string, any> = {};
        const nextScenes: Record<string, any> = {};

        for (const sceneId of state.data.sceneOrder) {
          const scene = oldScenes[sceneId];
          if (!scene) continue;
          const nextBeatIds: string[] = [];
          for (const beatId of scene.beatIds) {
            const beat = oldBeats[beatId];
            if (!beat) continue;
            const shots = Array.isArray(beat.shots) && beat.shots.length > 0 ? beat.shots.slice().sort((a, b) => a.order - b.order) : null;
            if (!shots) {
              const newBeatId = createId("beat");
              beatIdMap.set(beatId, newBeatId);
              nextBeats[newBeatId] = { ...beat, id: newBeatId, order: nextBeatIds.length, shots: undefined };
              nextBeatIds.push(newBeatId);
              continue;
            }
            let firstNewBeatId: string | null = null;
            for (const shot of shots) {
              const newBeatId = createId("beat");
              if (!firstNewBeatId) firstNewBeatId = newBeatId;
              if (!beatIdMap.has(beatId)) beatIdMap.set(beatId, newBeatId);
              nextBeats[newBeatId] = {
                ...beat,
                id: newBeatId,
                narration: shot.narration || beat.narration,
                cameraDescription: shot.cameraDescription || beat.cameraDescription,
                suggestedDuration: shot.suggestedDuration,
                order: nextBeatIds.length,
                shots: undefined,
              };
              nextBeatIds.push(newBeatId);
            }
          }
          nextScenes[sceneId] = { ...scene, beatIds: nextBeatIds };
        }

        for (const [assetId, asset] of Object.entries(oldAssets)) {
          const rel = (asset as any).relatedBeatId;
          if (!rel) continue;
          const mapped = beatIdMap.get(rel);
          if (!mapped) continue;
          (asset as any).relatedBeatId = mapped;
          oldAssets[assetId] = asset as any;
        }

        state.data.beats = nextBeats as any;
        state.data.scenes = nextScenes as any;
        state.selection.selectedBeatId = null;
        const branchName = state.data.storyWorkflow?.branchPolicy.branchName || "main";
        state.data.storyWorkflow = buildStoryWorkflowFromEditorData({
          data: state.data,
          branchName,
          existing: state.data.storyWorkflow || null,
        });
        state.selection.selectedStoryNodeId = state.data.storyWorkflow.selectedNodeId;
      });
      get().endHistoryGroup();
    },

    updateBeat: (beatId, patch) => {
      const lockedNode = getNodeForBeatId(get().data, beatId);
      if (lockedNode?.locked) {
        showLockedNodeToast();
        return;
      }
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
        const node = state.data.storyWorkflow?.nodes.find((n) => n.beatIds.includes(beatId));
        if (node) {
          if (typeof patch.narration === "string") node.step2.summary = patch.narration;
          if (typeof patch.cameraDescription === "string") node.step2.background = patch.cameraDescription;
        }
      });
    },

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
        const seeds = state.data.storyWorkflow?.global.characterSeeds;
        if (seeds && seeds.length > 0) {
          state.data.storyWorkflow!.global.characterSeeds = seeds.map((seed) =>
            seed.linkedCharacterId === characterId
              ? { ...seed, linkedCharacterId: undefined }
              : seed,
          );
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
        const seeds = state.data.storyWorkflow?.global.characterSeeds;
        if (seeds && seeds.length > 0) {
          state.data.storyWorkflow!.global.characterSeeds = seeds.map((seed) =>
            seed.linkedCharacterId === fromCharacterId
              ? { ...seed, linkedCharacterId: toCharacterId }
              : seed,
          );
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
      const branchName = options?.branchName || "main";
      
      try {
          const workspace: TimelineWorkspace = {
              editorData,
              effects,
              editorState: data,
              editorUi: {
                layout,
                selection,
                storyWorkflow: data.storyWorkflow
                  ? {
                      activeStep: data.storyWorkflow.activeStep,
                      selectedNodeId: data.storyWorkflow.selectedNodeId,
                      step4AutoFillEnabled: !!data.storyWorkflow.ui?.step4AutoFillEnabled,
                      previewPreferCard: !!data.storyWorkflow.ui?.previewPreferCard,
                      assetsImageFilter:
                        data.storyWorkflow.ui?.assetsImageFilter === "all" ||
                        data.storyWorkflow.ui?.assetsImageFilter === "node" ||
                        data.storyWorkflow.ui?.assetsImageFilter === "character"
                          ? data.storyWorkflow.ui.assetsImageFilter
                          : "all",
                    }
                  : undefined,
              },
          };
          await projectApi.updateWorkspace(projectId, workspace, { branch_name: branchName });
          if (!options?.silent) {
               toast({
                 title: i18nText("editor.toast.projectSaved.title"),
                 description: i18nText("editor.toast.projectSaved.desc"),
                 variant: "success",
               });
          }
      } catch (e) {
          const message = e instanceof Error ? e.message : i18nText("editor.toast.saveFailed.title");
          toast({ title: i18nText("editor.toast.saveFailed.title"), description: message, variant: "destructive" });
      }
    },

    loadProject: async (projectId, options) => {
      const branchName = options?.branchName || "main";
      try {
          const data = await projectApi.getWorkspace(projectId, { branch_name: branchName });
          if (data) {
              if (data.editorData) {
                  useTimelineStore.getState().setEditorData(data.editorData);
                  useTimelineStore.setState({ effects: data.effects || {} });
              }
              if (data.editorState) {
                  set((state) => {
                    state.data = data.editorState!;
                    state.data.storyWorkflow = ensureStoryWorkflow(state.data, branchName);
                    if (!state.selection.selectedStoryNodeId) {
                      state.selection.selectedStoryNodeId = state.data.storyWorkflow.selectedNodeId;
                    }
                  });
              }
              if (data.editorUi) {
                  set((state) => {
                    state.layout = { ...state.layout, ...(data.editorUi!.layout as any) };
                    state.selection = { ...state.selection, ...(data.editorUi!.selection as any), selectedStoryNodeId: (data.editorUi!.selection as any)?.selectedStoryNodeId || state.selection.selectedStoryNodeId || null };
                    if (state.data.storyWorkflow && data.editorUi?.storyWorkflow) {
                      if (data.editorUi.storyWorkflow.activeStep) {
                        state.data.storyWorkflow.activeStep = data.editorUi.storyWorkflow.activeStep;
                      }
                      if (typeof data.editorUi.storyWorkflow.selectedNodeId === "string" || data.editorUi.storyWorkflow.selectedNodeId === null) {
                        state.data.storyWorkflow.selectedNodeId = data.editorUi.storyWorkflow.selectedNodeId;
                      }
                      if (typeof data.editorUi.storyWorkflow.step4AutoFillEnabled === "boolean") {
                        state.data.storyWorkflow.ui = {
                          ...(state.data.storyWorkflow.ui || {}),
                          step4AutoFillEnabled: data.editorUi.storyWorkflow.step4AutoFillEnabled,
                        };
                      }
                      if (typeof data.editorUi.storyWorkflow.previewPreferCard === "boolean") {
                        state.data.storyWorkflow.ui = {
                          ...(state.data.storyWorkflow.ui || {}),
                          previewPreferCard: data.editorUi.storyWorkflow.previewPreferCard,
                        };
                      }
                      if (
                        data.editorUi.storyWorkflow.assetsImageFilter === "all" ||
                        data.editorUi.storyWorkflow.assetsImageFilter === "node" ||
                        data.editorUi.storyWorkflow.assetsImageFilter === "character"
                      ) {
                        state.data.storyWorkflow.ui = {
                          ...(state.data.storyWorkflow.ui || {}),
                          assetsImageFilter: data.editorUi.storyWorkflow.assetsImageFilter,
                        };
                      }
                    }
                  });
              }
              set((state) => {
                if (!state.data.storyWorkflow) {
                  state.data.storyWorkflow = ensureStoryWorkflow(state.data, branchName);
                } else if (state.data.storyWorkflow.branchPolicy.branchName !== branchName) {
                  state.data.storyWorkflow = buildStoryWorkflowFromEditorData({
                    data: state.data,
                    branchName,
                    existing: state.data.storyWorkflow,
                  });
                }
                if (!state.selection.selectedStoryNodeId) {
                  state.selection.selectedStoryNodeId = state.data.storyWorkflow.selectedNodeId;
                }
              });
              if (branchName !== "main") {
                const workflow = useEditorStore.getState().data.storyWorkflow;
                if (workflow && !workflow.branchPolicy.boundaryConfigured) {
                  toast({
                    title: i18nText("editor.toast.branchBoundaryRequired.title"),
                    description: i18nText("editor.toast.branchBoundaryRequired.desc"),
                    variant: "default",
                  });
                }
              }
          }
      } catch (e) {
          if (isApiError(e) && e.status === 403) {
            throw e;
          }
          const message = e instanceof Error ? e.message : i18nText("editor.toast.loadFailed.title");
          toast({ title: i18nText("editor.toast.loadFailed.title"), description: message, variant: "destructive" });
          throw e;
      }
    }
  }))
);
