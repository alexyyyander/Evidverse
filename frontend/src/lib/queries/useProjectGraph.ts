import { useQuery } from "@tanstack/react-query";
import { projectApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useProjectGraph(projectId: string) {
  return useQuery({
    queryKey: queryKeys.graph(projectId),
    queryFn: () => projectApi.getGraph(projectId),
    enabled: typeof projectId === "string" && projectId.length > 0,
  });
}
