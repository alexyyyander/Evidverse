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
  parent_project_id?: ID | null;
  created_at: ISODateTime;
  is_public?: boolean;
};

export type ProjectFeedItem = ProjectSummary & {
  owner: UserPublic | null;
  likes_count: number;
  is_liked: boolean;
};

export type Branch = {
  id: ID;
  name: string;
  head_commit_id?: string | null;
  description?: string | null;
  tags?: string[] | null;
  parent_branch_id?: ID | null;
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
  };
};

export type ProjectDetail = ProjectSummary & {
  workspace_data?: TimelineWorkspace | null;
};

export type TaskStatus = "PENDING" | "STARTED" | "SUCCESS" | "FAILURE" | "RETRY" | "REVOKED";

export type TaskStartResponse = {
  task_id: string;
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

export type GenerateStoryboardResponse = {
  storyboard: StoryboardScene[];
};

export type GenerateSegmentResult = {
  status: "succeeded" | "failed";
  narration?: string;
  image_url?: string;
  video_url?: string;
  error?: string;
};
