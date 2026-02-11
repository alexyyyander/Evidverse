export const queryKeys = {
  projects: () => ["projects"] as const,
  feed: () => ["feed"] as const,
  graph: (projectId: number) => ["graph", projectId] as const,
  user: (userId: number) => ["user", userId] as const,
  userProjects: (userId: number) => ["userProjects", userId] as const,
};

