import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useUserSearch(params: { query: string; skip?: number; limit?: number }) {
  const enabled = typeof params.query === "string" && params.query.trim().length > 0;
  return useQuery({
    queryKey: queryKeys.userSearch(params as any),
    queryFn: () => userApi.search(params),
    enabled,
  });
}

