import { post } from "@/lib/api/client";
import type { GenerateStoryboardResponse, TaskStartResponse } from "@/lib/api/types";

export const generationApi = {
  generateClip: (data: { topic: string }) => post<TaskStartResponse>("/generate/clip", data),
  generateStoryboard: (data: { topic: string }) => post<GenerateStoryboardResponse>("/generate/storyboard", data),
  generateCharacter: (data: { prompt: string; anchor_id?: number | null }) =>
    post<TaskStartResponse>("/generate/character", data),
  generateSegment: (data: { narration: string; visual_description: string; image_url?: string | null }) =>
    post<TaskStartResponse>("/generate/segment", data),
};
