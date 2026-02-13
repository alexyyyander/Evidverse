import type { ProjectFeedItem } from "@/lib/api/types";
import { cloudApiClient } from "@/lib/api/cloudClient";

export const cloudProjectsApi = {
  enabled: () => typeof cloudApiClient.defaults.baseURL === "string" && cloudApiClient.defaults.baseURL.length > 0,
  getFeed: async (params?: { query?: string; tag?: string; sort?: "new" | "hot"; skip?: number; limit?: number }) => {
    const res = await cloudApiClient.get<ProjectFeedItem[]>("/projects/feed", { params });
    return res.data;
  },
  getPublic: async (projectId: string) => {
    const res = await cloudApiClient.get<ProjectFeedItem>(`/projects/public/${projectId}`);
    return res.data;
  },
};

