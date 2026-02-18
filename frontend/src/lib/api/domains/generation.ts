import { post } from "@/lib/api/client";
import type {
  ComfyUIBinding,
  GenerateStoryboardRequest,
  GenerateStoryboardResponse,
  TaskStartResponse,
} from "@/lib/api/types";

export const generationApi = {
  generateClip: (data: { topic: string }) => post<TaskStartResponse>("/generate/clip", data),
  generateStoryboard: (data: GenerateStoryboardRequest) => post<GenerateStoryboardResponse>("/generate/storyboard", data),
  generateCharacter: (data: { prompt: string; anchor_id?: number | null }) =>
    post<TaskStartResponse>("/generate/character", data),
  generateSegment: (data: { narration: string; visual_description: string; image_url?: string | null }) =>
    post<TaskStartResponse>("/generate/segment", data),
  generateComfyUI: (data: {
    workflow: Record<string, any>;
    bindings?: ComfyUIBinding[] | null;
    params?: Record<string, any> | null;
    uploads?: Array<{ param: string; url: string }> | null;
    output?: "image" | "video";
  }) => post<TaskStartResponse>("/generate/comfyui", data),
};
