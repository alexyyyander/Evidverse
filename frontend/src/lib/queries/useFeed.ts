import { useQuery } from "@tanstack/react-query";
import { cloudProjectsApi, projectApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useFeed(params?: { query?: string; tag?: string; sort?: "new" | "hot"; skip?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.feed(params as any),
    queryFn: () => (cloudProjectsApi.enabled() ? cloudProjectsApi.getFeed(params) : projectApi.getFeed(params)),
  });
}
