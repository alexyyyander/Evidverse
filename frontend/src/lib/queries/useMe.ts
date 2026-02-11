import { useQuery } from "@tanstack/react-query";
import { getToken } from "@/lib/api/auth";
import { userApi } from "@/lib/api";

export function useMe() {
  const token = getToken();
  return useQuery({
    queryKey: ["me"],
    queryFn: userApi.me,
    enabled: typeof token === "string" && token.length > 0,
    staleTime: 30_000,
  });
}

