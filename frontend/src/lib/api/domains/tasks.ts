import { get } from "@/lib/api/client";
import type { TaskResponse } from "@/lib/api/types";

export const tasksApi = {
  get: <TResult = unknown>(taskId: string) => get<TaskResponse<TResult>>(`/tasks/${taskId}`),
};

