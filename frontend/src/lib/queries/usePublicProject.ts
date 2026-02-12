import { useQuery } from "@tanstack/react-query";
import { projectApi } from "@/lib/api";

export function usePublicProject(projectId: string | null) {
  const enabled = typeof projectId === "string" && projectId.length > 0;
  return useQuery({
    queryKey: ["publicProject", projectId],
    queryFn: () => projectApi.getPublic(projectId as string),
    enabled,
  });
}
