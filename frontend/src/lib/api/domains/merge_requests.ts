import { get, post } from "@/lib/api/client";
import type { MergeRequest } from "@/lib/api/types";

export const mergeRequestsApi = {
  create: (
    projectId: string,
    data: { source_branch_name: string; target_branch_name?: string; title?: string; description?: string; clip_ids?: string[] }
  ) => post<MergeRequest>(`/projects/${projectId}/merge-requests`, data),
  listByProject: (projectId: string) => get<MergeRequest[]>(`/projects/${projectId}/merge-requests`),
  get: (mrId: string) => get<MergeRequest>(`/merge-requests/${mrId}`),
  merge: (mrId: string) => post<MergeRequest>(`/merge-requests/${mrId}/merge`),
  close: (mrId: string) => post<MergeRequest>(`/merge-requests/${mrId}/close`),
};
