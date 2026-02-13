import axios from "axios";
import { clearToken, getToken } from "@/lib/api/auth";
import { normalizeAxiosError } from "@/lib/api/errors";
import { toast } from "@/components/ui/toast";

function normalizeApiBase(input?: string) {
  const raw = String(input || "").trim();
  if (!raw) return "/api/v1";
  if (raw.startsWith("/")) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    const trimmed = raw.replace(/\/+$/, "");
    return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
  }
  return "/api/v1";
}

export const apiClient = axios.create({
  baseURL: normalizeApiBase(process.env.NEXT_PUBLIC_API_URL),
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    const headersAny: any = config.headers || {};
    if (!config.headers) config.headers = headersAny;
    if (typeof headersAny.set === "function") {
      headersAny.set("Authorization", `Bearer ${token}`);
    } else {
      headersAny.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const normalized = normalizeAxiosError(err);
    if (normalized.status === 401) {
      clearToken();
      toast({
        title: "Authentication expired",
        description: "Please log in again.",
        variant: "destructive",
      });
    }
    throw normalized;
  }
);

export async function get<T>(url: string, params?: Record<string, any>) {
  const res = await apiClient.get<T>(url, params ? { params } : undefined);
  return res.data;
}

export async function post<T>(url: string, body?: any) {
  const res = await apiClient.post<T>(url, body);
  return res.data;
}

export async function put<T>(url: string, body?: any, params?: Record<string, any>) {
  const res = await apiClient.put<T>(url, body, params ? { params } : undefined);
  return res.data;
}

export async function del<T>(url: string) {
  const res = await apiClient.delete<T>(url);
  return res.data;
}
