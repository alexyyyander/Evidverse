import { get } from "@/lib/api/client";
import type { ClipSegment } from "@/lib/api/types";

export const clipsApi = {
  list: (params?: { project_id?: string; branch_name?: string }) => get<ClipSegment[]>("/clips", params),
  get: (clipId: string) => get<ClipSegment>(`/clips/${clipId}`),
};
