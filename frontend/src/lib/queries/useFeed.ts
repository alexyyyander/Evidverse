import { useQuery } from "@tanstack/react-query";
import { projectApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useFeed(params?: { query?: string; tag?: string; sort?: "new" | "hot"; skip?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.feed(params as any),
    queryFn: () => projectApi.getFeed(params),
  });
}
