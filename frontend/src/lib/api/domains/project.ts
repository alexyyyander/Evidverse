import { get, post, put } from "@/lib/api/client";
import type {
  Branch,
  ForkRequest,
  ProjectDetail,
  ProjectExportPayload,
  ProjectFeedItem,
  ProjectGraph,
  ProjectSummary,
  TimelineWorkspace,
} from "@/lib/api/types";

export const projectApi = {
  create: (data: { name: string; description?: string; tags?: string[]; is_public?: boolean }) =>
    post<ProjectSummary>("/projects", data),
  getAll: () => get<ProjectSummary[]>("/projects"),
  getBranchParticipations: () => get<ProjectSummary[]>("/projects/branch-participations"),
  get: (id: string) => get<ProjectDetail>(`/projects/${id}`),
  getPublic: (id: string) => get<ProjectFeedItem>(`/projects/public/${id}`),
  update: (id: string, data: { name?: string; description?: string | null; tags?: string[] | null; is_public?: boolean }) =>
    put<ProjectSummary>(`/projects/${id}`, data),
  delete: (id: string, confirm: { confirm_project_id: string; confirm_nickname: string }) =>
    post<ProjectSummary>(`/projects/${id}/delete`, confirm),
  getGraph: (id: string) => get<ProjectGraph>(`/projects/${id}/graph`),
  getBranches: (id: string) => get<Branch[]>(`/projects/${id}/branches`),
  getFeed: (params?: { query?: string; tag?: string; sort?: "new" | "hot"; skip?: number; limit?: number }) =>
    get<ProjectFeedItem[]>("/projects/feed", params),
  toggleLike: (id: string) => post<boolean>(`/projects/${id}/like`),
  fork: (id: string, commitHash?: string) => post<ProjectSummary>(`/projects/${id}/fork`, { commit_hash: commitHash }),
  requestFork: (id: string, commitHash?: string) =>
    post<ForkRequest>(`/projects/${id}/fork-requests`, { commit_hash: commitHash }),
  listForkRequests: (id: string, params?: { status_filter?: string }) =>
    get<ForkRequest[]>(`/projects/${id}/fork-requests`, params),
  approveForkRequest: (id: string, requestId: string) => post<ForkRequest>(`/projects/${id}/fork-requests/${requestId}/approve`, {}),
  rejectForkRequest: (id: string, requestId: string) => post<ForkRequest>(`/projects/${id}/fork-requests/${requestId}/reject`, {}),
  forkBranch: (id: string, data?: { source_branch_name?: string; from_commit_hash?: string; name?: string; description?: string; tags?: string[] }) =>
    post<Branch>(`/projects/${id}/fork-branch`, data || {}),
  getUserProjects: (userId: string) => get<ProjectFeedItem[]>(`/users/${userId}/projects`),
  getWorkspace: async (projectId: string, params?: { branch_name?: string }) => {
    return get<TimelineWorkspace>(`/projects/${projectId}/workspace`, params);
  },
  updateWorkspace: (projectId: string, workspace: TimelineWorkspace, params?: { branch_name?: string }) =>
    put<TimelineWorkspace>(`/projects/${projectId}/workspace`, workspace as any, params),
  importFromCloud: (payload: ProjectExportPayload) => post<ProjectSummary>("/projects/import", payload as any),
};
