import { createId } from "@/lib/editor/id";
import type {
  Asset,
  Beat,
  CharacterId,
  EditorStateData,
  StoryAssetsImageFilter,
  StoryBranchPolicy,
  StoryCharacterSeed,
  StoryNode,
  StoryNodeStepState,
  StoryWorkflowFocusTarget,
  StoryWorkflowState,
} from "@/lib/editor/types";

function defaultStepStatusFromText(beat: Beat): StoryNodeStepState {
  const hasText = String(beat.narration || "").trim().length > 0 || String(beat.cameraDescription || "").trim().length > 0;
  return hasText ? "done" : "todo";
}

function findBeatImageAssetId(data: EditorStateData, beatId: string): string | undefined {
  return Object.values(data.assets).find((a) => a.type === "image" && a.relatedBeatId === beatId)?.id;
}

function findBeatVideoAssetId(data: EditorStateData, beatId: string): string | undefined {
  const item = Object.values(data.timelineItems).find((t) => t.linkedBeatId === beatId);
  if (!item) return undefined;
  const clip = data.clips[item.clipId];
  if (!clip) return undefined;
  const asset = data.assets[clip.assetId];
  if (!asset || asset.type !== "video") return undefined;
  return asset.id;
}

function normalizeAssetsImageFilter(
  value: StoryAssetsImageFilter | string | undefined,
): StoryAssetsImageFilter {
  if (value === "all" || value === "node" || value === "character") return value;
  return "all";
}

function normalizeStoryFocusTarget(
  value: StoryWorkflowFocusTarget | string | null | undefined,
): StoryWorkflowFocusTarget | null {
  if (value === "step3_mapping" || value === "step4_image_binding" || value === "step4_video_confirm") {
    return value;
  }
  return null;
}

function normalizePreviewPreferCard(value: boolean | undefined): boolean {
  return !!value;
}

function normalizeEventFlowPulseNodeId(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
}

function normalizeEventFlowPulseAt(value: number | null | undefined): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function createNodeFromBeat(params: {
  data: EditorStateData;
  beatId: string;
  order: number;
  title: string;
  existing?: StoryNode | null;
}): StoryNode {
  const { data, beatId, order, title, existing } = params;
  const beat = data.beats[beatId];
  const beatImageAssetId = findBeatImageAssetId(data, beatId);
  const beatVideoAssetId = findBeatVideoAssetId(data, beatId);

  const fallbackCharacterMap: Record<CharacterId, string | null> = {};
  for (const characterId of beat.characterIds || []) {
    const mappedAsset = Object.values(data.assets).find((a) => a.relatedCharacterId === characterId) || null;
    fallbackCharacterMap[characterId] = mappedAsset?.id || null;
  }

  const next: StoryNode = {
    id: existing?.id || createId("story_node"),
    order,
    title,
    sceneId: beat.sceneId,
    beatIds: [beatId],
    locked: false,
    step2: {
      status: existing?.step2.status || defaultStepStatusFromText(beat),
      scriptMode: existing?.step2.scriptMode || "strict_screenplay",
      segmentLength: existing?.step2.segmentLength || "medium",
      summary: existing?.step2.summary || String(beat.narration || ""),
      background: existing?.step2.background || String(beat.cameraDescription || ""),
      characterChanges: existing?.step2.characterChanges || "",
      encounters: existing?.step2.encounters || "",
    },
    step3: {
      status: existing?.step3.status || (beatImageAssetId ? "done" : "todo"),
      provider: existing?.step3.provider || "comfyui",
      comfyuiTemplateId: existing?.step3.comfyuiTemplateId,
      stylePrompt: existing?.step3.stylePrompt || "",
      characterAssetMap: existing?.step3.characterAssetMap || fallbackCharacterMap,
    },
    step4: {
      status: existing?.step4.status || (beatVideoAssetId ? "done" : "todo"),
      confirmed: existing?.step4.confirmed || false,
      provider: existing?.step4.provider || "segment",
      comfyuiTemplateId: existing?.step4.comfyuiTemplateId || existing?.step3.comfyuiTemplateId,
      comfyuiParamsJson: existing?.step4.comfyuiParamsJson || "{}",
      videoTaskId: existing?.step4.videoTaskId,
      videoAssetId: existing?.step4.videoAssetId || beatVideoAssetId,
      assetBindings: {
        backgroundAssetId: existing?.step4.assetBindings?.backgroundAssetId || beatImageAssetId,
        startImageAssetId: existing?.step4.assetBindings?.startImageAssetId,
        endImageAssetId: existing?.step4.assetBindings?.endImageAssetId,
        characterAssetIds: existing?.step4.assetBindings?.characterAssetIds || fallbackCharacterMap,
      },
    },
  };

  if (next.step4.videoAssetId && !existing?.step4.confirmed) {
    next.step4.confirmed = true;
  }

  return next;
}

export function createDefaultBranchPolicy(branchName: string): StoryBranchPolicy {
  const isMain = branchName === "main";
  return {
    branchName,
    lockBoundaryOrder: isMain ? null : 0,
    boundaryConfigured: isMain,
  };
}

function isNodePersistedPrefix(node: StoryNode): boolean {
  // Prefix lock heuristic:
  // - Explicitly confirmed Step4 nodes are immutable.
  // - Older workspaces may only have done/video markers, treat them as persisted too.
  if (node.step4.confirmed) return true;
  if (node.step4.status === "done" && !!node.step4.videoAssetId) return true;
  if (node.step4.status === "done" && node.step3.status === "done" && node.step2.status === "done") return true;
  return false;
}

export function inferBranchBoundaryOrder(nodes: StoryNode[]): number {
  const ordered = [...nodes].sort((a, b) => a.order - b.order);
  let boundary = 0;
  for (const node of ordered) {
    if (!isNodePersistedPrefix(node)) break;
    boundary = node.order + 1;
  }
  return boundary;
}

export function applyStoryLockPolicy(workflow: StoryWorkflowState): StoryWorkflowState {
  const boundary = workflow.branchPolicy.lockBoundaryOrder;
  const nodes = workflow.nodes.map((node) => ({
    ...node,
    locked: typeof boundary === "number" ? node.order < boundary : false,
  }));
  return { ...workflow, nodes };
}

export function createEmptyStoryWorkflow(branchName: string): StoryWorkflowState {
  return {
    version: 1,
    activeStep: "step1",
    selectedNodeId: null,
    nodes: [],
    global: {
      storyMode: "generate",
      storyStyle: "series",
      tone: "serious",
      llmProvider: "auto",
      scriptMode: "strict_screenplay",
      segmentLength: "medium",
      characterSeeds: [],
    },
    branchPolicy: createDefaultBranchPolicy(branchName),
    meta: {
      requestedProvider: "auto",
      fallbackUsed: false,
      warnings: [],
    },
    ui: {
      step4AutoFillEnabled: false,
      assetsImageFilter: "all",
      focusTarget: null,
      previewPreferCard: false,
      eventFlowPulseNodeId: null,
      eventFlowPulseAt: null,
    },
  };
}

export function buildStoryWorkflowFromEditorData(params: {
  data: EditorStateData;
  branchName: string;
  existing?: StoryWorkflowState | null;
}): StoryWorkflowState {
  const { data, branchName, existing } = params;
  const base = existing || data.storyWorkflow || createEmptyStoryWorkflow(branchName);
  const existingByBeatId = new Map<string, StoryNode>();
  for (const node of base.nodes || []) {
    for (const beatId of node.beatIds || []) {
      existingByBeatId.set(beatId, node);
    }
  }

  const nodes: StoryNode[] = [];
  for (const sceneId of data.sceneOrder || []) {
    const scene = data.scenes[sceneId];
    if (!scene) continue;
    for (const beatId of scene.beatIds || []) {
      const beat = data.beats[beatId];
      if (!beat) continue;
      const title = `${scene.title || "Scene"} · Beat ${beat.order + 1}`;
      nodes.push(
        createNodeFromBeat({
          data,
          beatId,
          order: nodes.length,
          title,
          existing: existingByBeatId.get(beatId) || null,
        }),
      );
    }
  }

  const nextBranchPolicy: StoryBranchPolicy = {
    ...createDefaultBranchPolicy(branchName),
    ...base.branchPolicy,
    branchName,
  };
  if (branchName !== "main" && !nextBranchPolicy.boundaryConfigured) {
    nextBranchPolicy.lockBoundaryOrder = inferBranchBoundaryOrder(nodes);
  }

  const next: StoryWorkflowState = {
    ...base,
    selectedNodeId: base.selectedNodeId && nodes.some((n) => n.id === base.selectedNodeId) ? base.selectedNodeId : nodes[0]?.id || null,
    nodes,
    branchPolicy: nextBranchPolicy,
    global: {
      ...base.global,
      characterSeeds: Array.isArray(base.global.characterSeeds) ? base.global.characterSeeds : ([] as StoryCharacterSeed[]),
    },
    ui: {
      step4AutoFillEnabled: !!base.ui?.step4AutoFillEnabled,
      assetsImageFilter: normalizeAssetsImageFilter(base.ui?.assetsImageFilter),
      focusTarget: normalizeStoryFocusTarget(base.ui?.focusTarget),
      previewPreferCard: normalizePreviewPreferCard(base.ui?.previewPreferCard),
      eventFlowPulseNodeId: normalizeEventFlowPulseNodeId(base.ui?.eventFlowPulseNodeId),
      eventFlowPulseAt: normalizeEventFlowPulseAt(base.ui?.eventFlowPulseAt),
    },
  };

  return applyStoryLockPolicy(next);
}

export function mapStoryNodeByBeatId(workflow: StoryWorkflowState): Record<string, StoryNode> {
  const out: Record<string, StoryNode> = {};
  for (const node of workflow.nodes) {
    for (const beatId of node.beatIds) {
      out[beatId] = node;
    }
  }
  return out;
}

export function firstBeatAssetOfType(
  data: EditorStateData,
  beatId: string,
  type: Asset["type"],
): Asset | null {
  return Object.values(data.assets).find((a) => a.relatedBeatId === beatId && a.type === type) || null;
}
