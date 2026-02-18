import type {
  EditorStateData,
  StoryNode,
  StoryStepKey,
  StoryWorkflowFocusTarget,
} from "@/lib/editor/types";

export type Step3MappingSummary = {
  total: number;
  mapped: number;
  missingCharacterIds: string[];
  complete: boolean;
};

export type StoryNodeRecommendedAction =
  | "read_only"
  | "edit_step2"
  | "fix_step3"
  | "render_step4"
  | "review_step4";

export type StoryStep4BlockReason = "mapping" | "image" | "params" | "video";

const STEP4_BLOCK_PRIORITY: StoryStep4BlockReason[] = ["mapping", "image", "params", "video"];

function parseComfyuiParamsObject(raw: string): Record<string, any> {
  const text = String(raw || "").trim();
  if (!text) return {};
  const parsed = JSON.parse(text);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("params must be a JSON object");
  }
  return parsed as Record<string, any>;
}

export function isStoryStep4BlockReason(value: unknown): value is StoryStep4BlockReason {
  return value === "mapping" || value === "image" || value === "params" || value === "video";
}

export function resolveStep4BlockBadgeClass(reason: StoryStep4BlockReason): string {
  if (reason === "mapping") return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  if (reason === "image") return "border-orange-500/40 bg-orange-500/10 text-orange-300";
  if (reason === "params") return "border-violet-500/40 bg-violet-500/10 text-violet-300";
  return "border-rose-500/40 bg-rose-500/10 text-rose-300";
}

export function resolveEffectiveStep4BlockReason(
  reason: StoryStep4BlockReason,
  blockReasons: StoryStep4BlockReason[],
): StoryStep4BlockReason {
  const clickedPriority = STEP4_BLOCK_PRIORITY.indexOf(reason);
  let effectiveReason = reason;
  let effectivePriority = clickedPriority >= 0 ? clickedPriority : STEP4_BLOCK_PRIORITY.length;
  for (const blockReason of blockReasons) {
    const nextPriority = STEP4_BLOCK_PRIORITY.indexOf(blockReason);
    if (nextPriority < 0) continue;
    if (nextPriority < effectivePriority) {
      effectiveReason = blockReason;
      effectivePriority = nextPriority;
    }
  }
  return effectiveReason;
}

export function resolveStep4BlockNavigation(
  reason: StoryStep4BlockReason,
): { targetStep: StoryStepKey; focusTarget: StoryWorkflowFocusTarget } {
  if (reason === "mapping") {
    return {
      targetStep: "step3",
      focusTarget: "step3_mapping",
    };
  }
  if (reason === "image") {
    return {
      targetStep: "step4",
      focusTarget: "step4_image_binding",
    };
  }
  if (reason === "params") {
    return {
      targetStep: "step4",
      focusTarget: "step4_params",
    };
  }
  return {
    targetStep: "step4",
    focusTarget: "step4_video_confirm",
  };
}

export function resolveStep4BlockNavigationByRawReason(
  reason: unknown,
  blockReasons: StoryStep4BlockReason[],
): { targetStep: StoryStepKey; focusTarget: StoryWorkflowFocusTarget } | null {
  if (!isStoryStep4BlockReason(reason)) return null;
  const effectiveReason = resolveEffectiveStep4BlockReason(reason, blockReasons);
  return resolveStep4BlockNavigation(effectiveReason);
}

export type Step4RenderReadiness = {
  characterIds: string[];
  missingCharacterIds: string[];
  missingCharacterNames: string[];
  mappingComplete: boolean;
  imageBindingMissing: boolean;
  hasPrimaryImage: boolean;
  primaryImageAssetId: string | null;
  ready: boolean;
};

export type Step4ConfirmReadiness = Step4RenderReadiness & {
  paramsValid: boolean;
  videoReady: boolean;
  videoAssetId: string | null;
  confirmReady: boolean;
  blockReasons: StoryStep4BlockReason[];
};

function collectNodeCharacterIds(
  node: StoryNode,
  data: Pick<EditorStateData, "beats">,
): string[] {
  const characterIds = new Set<string>();
  for (const beatId of node.beatIds || []) {
    const beat = data.beats[beatId];
    if (!beat) continue;
    for (const characterId of beat.characterIds || []) {
      characterIds.add(characterId);
    }
  }
  return Array.from(characterIds);
}

export function resolveStoryActionBadgeClass(
  action: StoryNodeRecommendedAction,
  tone: "solid" | "soft" = "solid",
): string {
  const byTone =
    tone === "soft"
      ? {
          read_only: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300",
          edit_step2: "border-sky-500/40 bg-sky-500/10 text-sky-300",
          fix_step3: "border-amber-500/40 bg-amber-500/10 text-amber-300",
          render_step4: "border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
          review_step4: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
        }
      : {
          read_only: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
          edit_step2: "bg-sky-500/20 text-sky-300 border-sky-500/40",
          fix_step3: "bg-amber-500/20 text-amber-300 border-amber-500/40",
          render_step4: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
          review_step4: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        };
  return byTone[action];
}

export function summarizeNodeStep3Mapping(
  node: StoryNode,
  data: Pick<EditorStateData, "beats">,
): Step3MappingSummary {
  const characterIds = collectNodeCharacterIds(node, data);
  const total = characterIds.length;
  if (total === 0) {
    return { total: 0, mapped: 0, missingCharacterIds: [], complete: true };
  }

  const mapping = node.step3.characterAssetMap || {};
  let mapped = 0;
  const missingCharacterIds: string[] = [];
  for (const characterId of characterIds) {
    if (mapping[characterId]) {
      mapped += 1;
      continue;
    }
    missingCharacterIds.push(characterId);
  }

  return {
    total,
    mapped,
    missingCharacterIds,
    complete: mapped === total,
  };
}

export function collectNodeStep3MissingCharacterNames(
  node: StoryNode,
  data: Pick<EditorStateData, "beats" | "characters">,
): string[] {
  const summary = summarizeNodeStep3Mapping(node, data);
  return summary.missingCharacterIds.map((characterId) => data.characters[characterId]?.name || characterId);
}

export function summarizeNodeStep4RenderReadiness(
  node: StoryNode,
  data: Pick<EditorStateData, "beats" | "characters" | "assets">,
): Step4RenderReadiness {
  const characterIds = collectNodeCharacterIds(node, data);
  const mergedCharacterAssetIds = {
    ...(node.step3.characterAssetMap || {}),
    ...(node.step4.assetBindings.characterAssetIds || {}),
  };
  const missingCharacterIds: string[] = [];
  const missingCharacterNames: string[] = [];

  for (const characterId of characterIds) {
    const assetId = mergedCharacterAssetIds[characterId];
    const asset = assetId ? data.assets[assetId] : null;
    const validImageAsset = !!asset && asset.type === "image" && !!asset.url;
    if (validImageAsset) continue;
    missingCharacterIds.push(characterId);
    missingCharacterNames.push(data.characters[characterId]?.name || characterId);
  }

  const startImageAssetId = node.step4.assetBindings.startImageAssetId || null;
  const backgroundAssetId = node.step4.assetBindings.backgroundAssetId || null;
  const startImageAsset = startImageAssetId ? data.assets[startImageAssetId] || null : null;
  const backgroundImageAsset = backgroundAssetId ? data.assets[backgroundAssetId] || null : null;
  const primaryImageAsset =
    (startImageAsset && startImageAsset.type === "image" && startImageAsset.url ? startImageAsset : null) ||
    (backgroundImageAsset && backgroundImageAsset.type === "image" && backgroundImageAsset.url ? backgroundImageAsset : null);
  const hasPrimaryImage = !!primaryImageAsset;
  const imageBindingMissing = !hasPrimaryImage;
  const mappingComplete = missingCharacterIds.length === 0;

  return {
    characterIds,
    missingCharacterIds,
    missingCharacterNames,
    mappingComplete,
    imageBindingMissing,
    hasPrimaryImage,
    primaryImageAssetId: primaryImageAsset?.id || null,
    ready: mappingComplete && hasPrimaryImage,
  };
}

export function summarizeNodeStep4ConfirmReadiness(
  node: StoryNode,
  data: Pick<EditorStateData, "beats" | "characters" | "assets">,
): Step4ConfirmReadiness {
  const renderReadiness = summarizeNodeStep4RenderReadiness(node, data);
  let paramsValid = true;
  if (node.step4.provider === "comfyui") {
    try {
      parseComfyuiParamsObject(node.step4.comfyuiParamsJson || "{}");
    } catch {
      paramsValid = false;
    }
  }
  const videoAssetId = node.step4.videoAssetId || null;
  const videoAsset = videoAssetId ? data.assets[videoAssetId] : null;
  const videoReady = !!videoAsset && videoAsset.type === "video" && !!videoAsset.url;
  const blockReasons: StoryStep4BlockReason[] = [];
  if (!renderReadiness.mappingComplete) blockReasons.push("mapping");
  if (renderReadiness.imageBindingMissing) blockReasons.push("image");
  if (!paramsValid) blockReasons.push("params");
  if (!videoReady) blockReasons.push("video");
  return {
    ...renderReadiness,
    paramsValid,
    videoReady,
    videoAssetId,
    confirmReady: renderReadiness.ready && paramsValid && videoReady,
    blockReasons,
  };
}

export function resolveNodeRecommendedAction(
  node: StoryNode,
  data: Pick<EditorStateData, "beats">,
): { targetStep: StoryStepKey; action: StoryNodeRecommendedAction } {
  if (node.locked) {
    return {
      targetStep: "step2",
      action: "read_only",
    };
  }

  if (node.step2.status !== "done") {
    return {
      targetStep: "step2",
      action: "edit_step2",
    };
  }

  const step3Mapping = summarizeNodeStep3Mapping(node, data);
  if (!step3Mapping.complete || node.step3.status !== "done") {
    return {
      targetStep: "step3",
      action: "fix_step3",
    };
  }

  if (node.step4.confirmed || node.step4.status === "done") {
    return {
      targetStep: "step4",
      action: "review_step4",
    };
  }

  return {
    targetStep: "step4",
    action: "render_step4",
  };
}
