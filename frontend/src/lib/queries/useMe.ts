import { useQuery } from "@tanstack/react-query";
import { useAuthToken } from "@/lib/auth/useAuthToken";
import { userApi } from "@/lib/api";

export function useMe() {
  const token = useAuthToken();
  return useQuery({
    queryKey: ["me"],
    queryFn: userApi.me,
    enabled: typeof token === "string" && token.length > 0,
    staleTime: 30_000,
  });
}
