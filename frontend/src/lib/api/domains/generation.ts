import { post } from "@/lib/api/client";
import type { TaskStartResponse } from "@/lib/api/types";

export const generationApi = {
  generateClip: (data: { topic: string }) => post<TaskStartResponse>("/generate/clip", data),
};

