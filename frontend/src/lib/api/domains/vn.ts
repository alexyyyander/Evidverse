import { get, post } from "@/lib/api/client";
import type { ClipSegment, VNAsset, VNAssetType, VNParseJob } from "@/lib/api/types";

export const vnApi = {
  createAsset: (data: { project_id: string; branch_name?: string; type: VNAssetType; object_name: string; metadata?: any }) =>
    post<VNAsset>("/vn/assets", data),
  listAssets: (params: { project_id?: string; branch_name?: string; type?: VNAssetType | string }) => get<VNAsset[]>("/vn/assets", params),
  parsePreview: (data: { engine: "KIRIKIRI" | "RENPY"; script_text: string }) =>
    post<{ engine: string; events: any[] }>("/vn/parse-preview", data),
  createParseJob: (data: { project_id: string; branch_name?: string; engine: "KIRIKIRI" | "RENPY"; script_text?: string; asset_ids?: string[] }) =>
    post<VNParseJob>("/vn/parse-jobs", data),
  getParseJob: (jobId: string) => get<VNParseJob>(`/vn/parse-jobs/${jobId}`),
  getParseJobLogs: (jobId: string, params?: { offset?: number; limit?: number }) =>
    get<{ items: any[]; total: number; offset: number; limit: number }>(`/vn/parse-jobs/${jobId}/logs`, params),
  comicToVideo: (data: { project_id: string; branch_name?: string; title?: string; summary?: string; screenshot_asset_ids: string[]; prompt?: string }) =>
    post<ClipSegment>("/vn/comic-to-video", data),
};
