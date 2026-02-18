import axios from "axios";
import { normalizeAxiosError } from "@/lib/api/errors";
import { getCloudToken } from "@/lib/api/cloudAuth";

function normalizeApiBase(input?: string) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  if (raw.startsWith("/")) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    const trimmed = raw.replace(/\/+$/, "");
    return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
  }
  return null;
}

function getRuntimeCloudApiBase() {
  if (typeof window === "undefined") return null;
  try {
    const raw = String(localStorage.getItem("evidverse_cloud_api_base_url") || "").trim();
    return raw ? raw : null;
  } catch {
    return null;
  }
}

const cloudBaseURL = normalizeApiBase(process.env.NEXT_PUBLIC_CLOUD_API_URL || process.env.NEXT_PUBLIC_CLOUD_API_ORIGIN);

export const cloudApiClient = axios.create({
  baseURL: cloudBaseURL || undefined,
  headers: {
    "Content-Type": "application/json",
  },
});

cloudApiClient.interceptors.request.use((config) => {
  const runtimeBase = getRuntimeCloudApiBase();
  if (runtimeBase) {
    config.baseURL = normalizeApiBase(runtimeBase) || undefined;
  }
  const token = getCloudToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

cloudApiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    throw normalizeAxiosError(err);
  }
);
