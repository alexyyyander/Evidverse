import { get, post, put } from "@/lib/api/client";
import type { ProjectDetail, ProjectFeedItem, ProjectGraph, ProjectSummary, TimelineWorkspace } from "@/lib/api/types";

export const projectApi = {
  create: (data: { name: string; description?: string }) => post<ProjectSummary>("/projects/", data),
  getAll: () => get<ProjectSummary[]>("/projects/"),
  get: (id: number) => get<ProjectDetail>(`/projects/${id}`),
  update: (id: number, data: { name?: string; description?: string | null }) =>
    put<ProjectSummary>(`/projects/${id}`, data),
  getGraph: (id: number) => get<ProjectGraph>(`/projects/${id}/graph`),
  getFeed: () => get<ProjectFeedItem[]>("/projects/feed"),
  toggleLike: (id: number) => post<boolean>(`/projects/${id}/like`),
  fork: (id: number, commitHash?: string) => post<ProjectSummary>(`/projects/${id}/fork`, { commit_hash: commitHash }),
  getUserProjects: (userId: number) => get<ProjectFeedItem[]>(`/users/${userId}/projects`),
  getWorkspace: async (projectId: number) => {
    const res = await get<ProjectDetail>(`/projects/${projectId}`);
    return res.workspace_data || null;
  },
  updateWorkspace: (projectId: number, workspace: TimelineWorkspace) =>
    put<ProjectDetail>(`/projects/${projectId}`, { workspace_data: workspace }),
};
