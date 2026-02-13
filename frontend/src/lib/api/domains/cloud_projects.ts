import type { ProjectExportPayload, ProjectFeedItem, ProjectSummary } from "@/lib/api/types";
import { cloudApiClient } from "@/lib/api/cloudClient";

export const cloudProjectsApi = {
  enabled: () => typeof cloudApiClient.defaults.baseURL === "string" && cloudApiClient.defaults.baseURL.length > 0,
  getFeed: async (params?: { query?: string; tag?: string; sort?: "new" | "hot"; skip?: number; limit?: number }) => {
    const res = await cloudApiClient.get<ProjectFeedItem[]>("/projects/feed", { params });
    return res.data;
  },
  getMine: async (params?: { skip?: number; limit?: number }) => {
    const res = await cloudApiClient.get<ProjectSummary[]>("/projects", { params });
    return res.data;
  },
  getPublic: async (projectId: string) => {
    const res = await cloudApiClient.get<ProjectFeedItem>(`/projects/public/${projectId}`);
    return res.data;
  },
  exportProject: async (projectId: string, params?: { branch_name?: string }) => {
    const res = await cloudApiClient.get<ProjectExportPayload>(`/projects/${projectId}/export`, { params });
    return res.data;
  },
};
