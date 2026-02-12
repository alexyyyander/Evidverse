import { apiClient } from "@/lib/api/client";
import type { PresignedUrlResponse } from "@/lib/api/types";

export const filesApi = {
  getPresignedUrl: async (filename: string) => {
    const res = await apiClient.post<PresignedUrlResponse>("/files/presigned-url", undefined, { params: { filename } });
    return res.data;
  },
};
