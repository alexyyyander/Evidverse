import { post } from "@/lib/api/client";
import type { TaskStartResponse } from "@/lib/api/types";

export const generationApi = {
  generateClip: (data: { topic: string }) => post<TaskStartResponse>("/generate/clip", data),
  generateCharacter: (data: { prompt: string; anchor_id?: number | null }) =>
    post<TaskStartResponse>("/generate/character", data),
};
