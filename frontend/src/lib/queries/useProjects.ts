import { useQuery } from "@tanstack/react-query";
import { projectApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects(),
    queryFn: projectApi.getAll,
  });
}

