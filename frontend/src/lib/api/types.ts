import type { TimelineEffect, TimelineRow } from "@xzdarcy/timeline-engine";
import type { EditorStateData } from "@/lib/editor/types";
import type { LayoutState, SelectionState } from "@/lib/editor/ui";

export type ID = string;
export type InternalID = number;

export type ISODateTime = string;

export type UserPublic = {
  id: ID;
  email: string;
  full_name?: string | null;
};

export type PublishAccount = {
  id: ID;
  platform: "bilibili" | "douyin";
  label?: string | null;
  status?: string | null;
  last_checked_at?: ISODateTime | null;
  last_error?: string | null;
};

export type PublishJob = {
  id: ID;
  platform: "bilibili" | "douyin";
  account_id: ID;
  project_id?: ID | null;
  branch_name?: string | null;
  video_url: string;
  title?: string | null;
  description?: string | null;
  tags?: string[] | null;
  bilibili_tid?: number | null;
  cover_url?: string | null;
  scheduled_publish_at?: ISODateTime | null;
  multi_part?: boolean | null;
  input_artifacts?: any;
  attempts?: number | null;
  task_id?: string | null;
  status: string;
  result?: any;
  logs?: any;
  error?: string | null;
};

export type PresignedUrlResponse = {
  url: string;
  object_name: string;
  storage_url?: string;
};

export type VNAssetType = "SCREENSHOT" | "VN_SCRIPT" | "VN_TEXT" | "VN_JSON" | "CHARACTER_SHEET" | "OTHER";

export type VNAsset = {
  id: ID;
  project_id: ID;
  branch_name?: string | null;
  type: VNAssetType;
  object_name: string;
  storage_url: string;
  metadata?: any;
  created_at?: ISODateTime | null;
};

export type VNParseJob = {
  id: ID;
  project_id: ID;
  branch_name?: string | null;
  engine?: "KIRIKIRI" | "RENPY" | string | null;
  status: string;
  task_id?: string | null;
  attempts?: number | null;
  result?: any;
  logs?: any;
  error?: string | null;
};

export type ClipSegment = {
  id: ID;
  project_id: ID;
  branch_name?: string | null;
  title?: string | null;
  summary?: string | null;
  input_artifacts?: any;
  assets_ref?: any;
  task_id?: string | null;
  status: string;
  result?: any;
  error?: string | null;
  created_at?: ISODateTime | null;
};

export type UserMe = {
  id: ID;
  email: string;
  full_name?: string | null;
  is_active: boolean;
};

export type ProjectSummary = {
  id: ID;
  name: string;
  description?: string | null;
  tags?: string[] | null;
  owner_id?: ID;
  parent_project_id?: ID | null;
  participated_branch_names?: string[] | null;
  created_at: ISODateTime;
  is_public?: boolean;
};

export type ForkRequest = {
  id: ID;
  project_id: ID;
  requester_id: ID;
  commit_hash?: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled" | string;
  approved_project_id?: ID | null;
  reviewer_id?: ID | null;
  created_at: ISODateTime;
  reviewed_at?: ISODateTime | null;
};

export type ProjectFeedItem = ProjectSummary & {
  owner: UserPublic | null;
  likes_count: number;
  is_liked: boolean;
};

export type ProjectExportPayload = {
  source: {
    cloud_project_id: ID;
    cloud_branch_name: string;
    cloud_origin?: string | null;
  };
  project: {
    name: string;
    description?: string | null;
    tags?: string[] | null;
  };
  branch: {
    name: string;
    description?: string | null;
    tags?: string[] | null;
    workspace_data?: any;
  };
  head_commit?: {
    message?: string | null;
    video_assets?: any;
  } | null;
};

export type Branch = {
  id: ID;
  name: string;
  head_commit_id?: string | null;
  description?: string | null;
  tags?: string[] | null;
  parent_branch_id?: ID | null;
};

export type MergeRequestStatus = "open" | "merged" | "closed" | string;

export type MergeRequest = {
  id: ID;
  project_id: ID;
  source_branch_name: string;
  target_branch_name: string;
  title?: string | null;
  description?: string | null;
  clip_ids?: ID[] | null;
  merged_clip_ids?: ID[] | null;
  status: MergeRequestStatus;
  merged_by?: ID | null;
  merged_at?: ISODateTime | null;
  created_at?: ISODateTime | null;
  extra?: any;
};

export type Commit = {
  id: string;
  message: string;
  created_at: ISODateTime;
  parent_hash?: string | null;
};

export type ProjectGraph = {
  commits: Commit[];
  branches: Branch[];
};

export type TimelineWorkspace = {
  editorData: TimelineRow[];
  effects: Record<string, TimelineEffect>;
  editorState?: EditorStateData;
  editorUi?: {
    layout: LayoutState;
    selection: SelectionState;
    storyWorkflow?: {
      activeStep?: "step1" | "step2" | "step3" | "step4";
      selectedNodeId?: string | null;
      step4AutoFillEnabled?: boolean;
      assetsImageFilter?: "all" | "node" | "character";
      previewPreferCard?: boolean;
    };
  };
};

export type ProjectDetail = ProjectSummary & {
  workspace_data?: TimelineWorkspace | null;
};

export type TaskStatus = "PENDING" | "STARTED" | "SUCCESS" | "FAILURE" | "RETRY" | "REVOKED";

export type TaskStartResponse = {
  task_id: string;
};

export type ComfyUIBinding = {
  node_id: string;
  path: string;
  param: string;
};

export type ComfyUITemplateSummary = {
  id: ID;
  name: string;
  description?: string | null;
};

export type ComfyUITemplate = {
  id: ID;
  name: string;
  description?: string | null;
  workflow: Record<string, any>;
  bindings?: ComfyUIBinding[] | null;
};

export type ComfyUIRenderResult = {
  status: "succeeded" | "failed";
  image_url?: string;
  video_url?: string;
  object_name?: string;
  output_url?: string;
  outputs?: Array<{
    filename?: string;
    object_name?: string;
    output_url?: string;
    media_kind?: "image" | "video" | "audio" | "file" | string;
    comfyui_type?: string;
    comfyui_bucket?: string;
  }>;
  error?: string;
};

export type ComfyUIHealth = {
  host: string;
  use_local_models: boolean;
  reachable: boolean;
  detail?: string | null;
};

export type ComfyUIUploadResponse = {
  object_name: string;
  storage_url: string;
  comfyui_image: string;
  content_type?: string | null;
  filename: string;
};

export type ComfyUIWorkflowRunResult = {
  status: "succeeded" | "failed";
  output_url?: string;
  object_name?: string;
  filename?: string;
  comfyui_type?: string;
  error?: string;
};

export type TaskResponse<TResult = unknown> = {
  task_id: string;
  status: TaskStatus | string;
  result: TResult;
};

export type TokenResponse = {
  access_token: string;
  token_type: "bearer" | string;
};

export type GenerateClipResultSuccessItem = {
  scene_number?: number;
  narration?: string;
  image_url?: string;
  video_url?: string;
  scene?: unknown;
  error?: string;
};

export type GenerateClipResult = {
  status: "succeeded" | "failed";
  clips?: GenerateClipResultSuccessItem[];
  error?: string;
};

export type StoryboardScene = {
  scene_number?: number;
  narration?: string;
  visual_description?: string;
  [key: string]: any;
};

export type GenerateStoryboardRequest = {
  topic: string;
  stage?: "step1_story" | "step2_outline";
  llm_provider?: "auto" | "ollama" | "vllm" | "sglang" | "openai_compatible";
  story_mode?: "generate" | "create" | "edit";
  story_style?: "record" | "science" | "series" | "short_drama" | "animation";
  tone?: "humorous" | "serious" | "warm" | "cold";
  script_mode?: "strict_screenplay" | "stage_play" | "dance_drama" | "narrative";
  segment_length?: "long" | "medium" | "short";
  character_seed?: Array<{
    id?: string;
    name?: string;
    identity?: string;
    personality?: string;
    appearance?: string;
    fate_keywords?: string[];
    reference_image_url?: string;
    reference_asset_id?: string;
    linked_character_id?: string;
  }>;
  existing_outline?: Record<string, any> | null;
};

export type StoryboardRequestedProvider = "auto" | "ollama" | "vllm" | "sglang" | "openai_compatible";
export type StoryboardResolvedProvider = "ollama" | "vllm" | "sglang" | "openai_compatible" | "cloud";

export type GenerateStoryboardResponse = {
  storyboard: StoryboardScene[];
  meta?: {
    requested_provider?: StoryboardRequestedProvider;
    resolved_provider?: StoryboardResolvedProvider;
    fallback_used?: boolean;
    warnings?: string[];
  };
};

export type GenerateSegmentResult = {
  status: "succeeded" | "failed";
  narration?: string;
  image_url?: string;
  video_url?: string;
  error?: string;
};
