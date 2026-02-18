import { del, get, post, apiClient } from "@/lib/api/client";
import type {
  ComfyUIBinding,
  ComfyUIHealth,
  ComfyUITemplate,
  ComfyUITemplateSummary,
  ComfyUIUploadResponse,
  TaskStartResponse,
} from "@/lib/api/types";

export const comfyuiApi = {
  health: () => get<ComfyUIHealth>("/comfyui/health"),
  objectInfo: (nodeClass?: string) =>
    get<Record<string, any>>(nodeClass ? `/comfyui/object-info/${encodeURIComponent(nodeClass)}` : "/comfyui/object-info"),
  systemStats: () => get<Record<string, any>>("/comfyui/system-stats"),
  queue: () => get<Record<string, any>>("/comfyui/queue"),
  listTemplates: () => get<ComfyUITemplateSummary[]>("/comfyui/templates"),
  getTemplate: (id: string) => get<ComfyUITemplate>(`/comfyui/templates/${id}`),
  createTemplate: (data: { name: string; description?: string | null; workflow: any; bindings?: ComfyUIBinding[] | null }) =>
    post<ComfyUITemplate>("/comfyui/templates", data),
  deleteTemplate: (id: string) => del<{ ok: true }>(`/comfyui/templates/${id}`),
  renderTemplate: (id: string, params: Record<string, any>) =>
    post<TaskStartResponse>(`/comfyui/templates/${id}/render`, { params }),
  executeWorkflow: (data: {
    workflow: Record<string, any>;
    bindings?: ComfyUIBinding[] | null;
    params?: Record<string, any> | null;
    uploads?: Array<{ param: string; url: string }> | null;
  }) => post<TaskStartResponse>("/comfyui/workflows/execute", data),
  uploadImage: async (file: File, overwrite = false) => {
    const form = new FormData();
    form.append("file", file);
    const res = await apiClient.post<ComfyUIUploadResponse>("/comfyui/upload-image", form, {
      params: { overwrite },
    });
    return res.data;
  },
};
