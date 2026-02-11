import { useQuery } from "@tanstack/react-query";
import { projectApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useProjectGraph(projectId: number) {
  return useQuery({
    queryKey: queryKeys.graph(projectId),
    queryFn: () => projectApi.getGraph(projectId),
    enabled: Number.isFinite(projectId) && projectId > 0,
  });
}

