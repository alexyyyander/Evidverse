export const queryKeys = {
  projects: () => ["projects"] as const,
  feed: (params?: Record<string, any>) => (params ? (["feed", params] as const) : (["feed"] as const)),
  graph: (projectId: string) => ["graph", projectId] as const,
  user: (userId: string) => ["user", userId] as const,
  userProjects: (userId: string) => ["userProjects", userId] as const,
  userSearch: (params: Record<string, any>) => ["userSearch", params] as const,
};
