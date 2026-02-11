import { useQuery } from "@tanstack/react-query";
import { tasksApi } from "@/lib/api";

export function useTask<TResult = unknown>(taskId: string | null) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: () => tasksApi.get<TResult>(taskId as string),
    enabled: typeof taskId === "string" && taskId.length > 0,
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status;
      if (status === "SUCCESS" || status === "FAILURE" || status === "REVOKED") return false;
      return 1000;
    },
  });
}

