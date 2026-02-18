"use client";

import { useQuery } from "@tanstack/react-query";
import { projectApi } from "@/lib/api";
import { isApiError } from "@/lib/api/errors";

export function editorProjectAccessQueryKey(projectId: string) {
  return ["editorProjectAccess", projectId] as const;
}

export async function fetchProjectAccess(projectId: string) {
  try {
    return await projectApi.getPublic(projectId);
  } catch (error) {
    if (isApiError(error) && error.status === 404) {
      return await projectApi.get(projectId);
    }
    throw error;
  }
}

export function useProjectAccess(projectId: string | null | undefined, enabled = true) {
  const normalizedProjectId = typeof projectId === "string" ? projectId.trim() : "";
  return useQuery({
    queryKey: editorProjectAccessQueryKey(normalizedProjectId),
    queryFn: () => fetchProjectAccess(normalizedProjectId),
    enabled: enabled && normalizedProjectId.length > 0,
  });
}

