import { useQuery } from "@tanstack/react-query";
import { cloudProjectsApi, projectApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function usePublicProject(projectId: string | null) {
  const enabled = typeof projectId === "string" && projectId.length > 0;
  return useQuery({
    queryKey: queryKeys.publicProject(projectId as string),
    queryFn: () => (cloudProjectsApi.enabled() ? cloudProjectsApi.getPublic(projectId as string) : projectApi.getPublic(projectId as string)),
    enabled,
  });
}
