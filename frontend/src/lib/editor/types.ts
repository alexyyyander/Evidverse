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
  type: "clip" | "character";
  status: TaskStatus;
  createdAt: string;
  input: Record<string, any>;
  refIds?: Record<string, string>;
  error?: string;
  result?: Record<string, any>;
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
}
