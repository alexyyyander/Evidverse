import axios from "axios";
import { clearToken, getToken } from "@/lib/api/auth";
import { normalizeAxiosError } from "@/lib/api/errors";
import { toast } from "@/components/ui/toast";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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

export async function put<T>(url: string, body?: any) {
  const res = await apiClient.put<T>(url, body);
  return res.data;
}

export async function del<T>(url: string) {
  const res = await apiClient.delete<T>(url);
  return res.data;
}

