import type { TimelineEffect, TimelineRow } from "@xzdarcy/timeline-engine";

export type ID = number;

export type ISODateTime = string;

export type UserPublic = {
  id: ID;
  email: string;
  full_name?: string | null;
};

export type UserMe = {
  id: ID;
  email: string;
  is_active: boolean;
};

export type ProjectSummary = {
  id: ID;
  name: string;
  description?: string | null;
  created_at: ISODateTime;
};

export type ProjectFeedItem = ProjectSummary & {
  owner: UserPublic;
  likes_count: number;
  is_liked: boolean;
};

export type Branch = {
  id?: ID;
  name: string;
  head_commit_id: string;
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
