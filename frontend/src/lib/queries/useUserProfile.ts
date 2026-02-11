import { useQuery } from "@tanstack/react-query";
import { projectApi, userApi } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export function useUserProfile(userId: number) {
  const userQuery = useQuery({
    queryKey: queryKeys.user(userId),
    queryFn: () => userApi.get(userId),
    enabled: Number.isFinite(userId) && userId > 0,
  });

  const projectsQuery = useQuery({
    queryKey: queryKeys.userProjects(userId),
    queryFn: () => projectApi.getUserProjects(userId),
    enabled: Number.isFinite(userId) && userId > 0,
  });

  return { userQuery, projectsQuery };
}

