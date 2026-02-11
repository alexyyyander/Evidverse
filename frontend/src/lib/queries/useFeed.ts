import { useQuery } from "@tanstack/react-query";
import { projectApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useFeed() {
  return useQuery({
    queryKey: queryKeys.feed(),
    queryFn: projectApi.getFeed,
  });
}

