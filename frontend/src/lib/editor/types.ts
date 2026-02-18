export type SceneId = string;
export type BeatId = string;
export type ShotId = string;
export type CharacterId = string;
export type AssetId = string;
export type ClipId = string;
export type TimelineItemId = string;
export type IdeaVersionId = string;

export type GenerationStatus = 'pending' | 'generating' | 'success' | 'failed';
export type TaskStatus = "PENDING" | "STARTED" | "SUCCESS" | "FAILURE" | "RETRY" | "REVOKED";

export interface Character {
  id: CharacterId;
  name: string;
  description: string;
  avatarUrl?: string;
}

export interface Beat {
  id: BeatId;
  sceneId: SceneId;
  narration?: string;
  dialogue?: string;
  cameraDescription?: string;
  suggestedDuration: number;
  characterIds: CharacterId[];
  status: GenerationStatus;
  order: number;
  shots?: Shot[];
}

export interface Shot {
  id: ShotId;
  beatId: BeatId;
  order: number;
  narration?: string;
  cameraDescription?: string;
  suggestedDuration: number;
}

export interface Scene {
  id: SceneId;
  title: string;
  summary: string;
  order: number;
  beatIds: BeatId[];
}

export type AssetType = 'image' | 'video' | 'audio';

export interface Asset {
  id: AssetId;
  type: AssetType;
  url: string;
  width?: number;
  height?: number;
  duration?: number;
  source: 'upload' | 'generated' | 'library';
  relatedBeatId?: BeatId;
  relatedCharacterId?: CharacterId;
  generationParams?: Record<string, any>;
  createdAt: string;
}

export interface Clip {
  id: ClipId;
  assetId: AssetId;
  startOffset: number;
  endOffset?: number;
}

export interface TimelineItem {
  id: TimelineItemId;
  clipId: ClipId;
  trackId: string;
  startTime: number;
  duration: number;
  linkedBeatId?: BeatId;
}

export interface IdeaParameters {
  style: string;
  aspectRatio: string;
  duration: number;
  shotCount: number;
  pace: string;
  language: string;
  resolution: string;
}

export interface IdeaVersion {
  id: IdeaVersionId;
  createdAt: string;
  text: string;
  params: IdeaParameters;
}

export interface GenerationTask {
  id: string;
  type: "clip" | "character" | "beat_image" | "segment" | "comfyui_image" | "comfyui_video";
  status: TaskStatus;
  createdAt: string;
  input: Record<string, any>;
  refIds?: Record<string, string>;
  error?: string;
  result?: Record<string, any>;
}

export type StoryStepKey = "step1" | "step2" | "step3" | "step4";
export type StoryNodeStepState = "todo" | "in_progress" | "done" | "blocked";

export type StoryLLMProvider = "auto" | "ollama" | "vllm" | "sglang" | "openai_compatible";
export type StoryMode = "generate" | "create" | "edit";
export type StoryStyle = "record" | "science" | "series" | "short_drama" | "animation";
export type StoryTone = "humorous" | "serious" | "warm" | "cold";
export type StoryScriptMode = "strict_screenplay" | "stage_play" | "dance_drama" | "narrative";
export type StorySegmentLength = "long" | "medium" | "short";

export interface StoryCharacterSeed {
  id: string;
  name: string;
  identity: string;
  personality: string;
  appearance: string;
  fateKeywords: string[];
  referenceImageUrl?: string;
  referenceAssetId?: AssetId;
  linkedCharacterId?: CharacterId;
}

export interface StoryNodeStep2Data {
  status: StoryNodeStepState;
  scriptMode: StoryScriptMode;
  segmentLength: StorySegmentLength;
  summary: string;
  background: string;
  characterChanges: string;
  encounters: string;
}

export interface StoryNodeStep3Data {
  status: StoryNodeStepState;
  provider: "comfyui" | "placeholder";
  comfyuiTemplateId?: string;
  stylePrompt: string;
  characterAssetMap: Record<CharacterId, AssetId | null>;
}

export interface StoryNodeStep4Data {
  status: StoryNodeStepState;
  confirmed: boolean;
  provider: "segment" | "comfyui";
  comfyuiTemplateId?: string;
  comfyuiParamsJson?: string;
  videoTaskId?: string;
  videoAssetId?: AssetId;
  assetBindings: {
    backgroundAssetId?: AssetId;
    startImageAssetId?: AssetId;
    endImageAssetId?: AssetId;
    characterAssetIds: Record<CharacterId, AssetId | null>;
  };
}

export interface StoryNode {
  id: string;
  order: number;
  title: string;
  sceneId?: SceneId;
  beatIds: BeatId[];
  locked: boolean;
  step2: StoryNodeStep2Data;
  step3: StoryNodeStep3Data;
  step4: StoryNodeStep4Data;
}

export interface StoryBranchPolicy {
  branchName: string;
  lockBoundaryOrder: number | null;
  boundaryConfigured: boolean;
}

export interface StoryWorkflowGlobal {
  storyMode: StoryMode;
  storyStyle: StoryStyle;
  tone: StoryTone;
  llmProvider: StoryLLMProvider;
  scriptMode: StoryScriptMode;
  segmentLength: StorySegmentLength;
  characterSeeds: StoryCharacterSeed[];
}

export interface StoryWorkflowMeta {
  requestedProvider?: StoryLLMProvider;
  resolvedProvider?: StoryLLMProvider | "cloud";
  fallbackUsed?: boolean;
  warnings?: string[];
}

export type StoryAssetsImageFilter = "all" | "node" | "character";
export type StoryWorkflowFocusTarget =
  | "step3_mapping"
  | "step4_image_binding"
  | "step4_video_confirm"
  | "step4_params";

export interface StoryWorkflowUi {
  step4AutoFillEnabled?: boolean;
  assetsImageFilter?: StoryAssetsImageFilter;
  focusTarget?: StoryWorkflowFocusTarget | null;
  previewPreferCard?: boolean;
  eventFlowPulseNodeId?: string | null;
  eventFlowPulseAt?: number | null;
}

export interface StoryWorkflowState {
  version: number;
  activeStep: StoryStepKey;
  selectedNodeId: string | null;
  nodes: StoryNode[];
  global: StoryWorkflowGlobal;
  branchPolicy: StoryBranchPolicy;
  meta?: StoryWorkflowMeta;
  ui?: StoryWorkflowUi;
}

export interface EditorStateData {
  scenes: Record<SceneId, Scene>;
  beats: Record<BeatId, Beat>;
  characters: Record<CharacterId, Character>;
  assets: Record<AssetId, Asset>;
  clips: Record<ClipId, Clip>;
  timelineItems: Record<TimelineItemId, TimelineItem>;
  sceneOrder: SceneId[];
  ideaVersions?: IdeaVersion[];
  generationTasks?: GenerationTask[];
  activeIdeaVersionId?: IdeaVersionId;
  storyWorkflow?: StoryWorkflowState;
}
