import type { AxiosError } from "axios";

export type FieldErrors = Record<string, string>;

export type ApiErrorShape = {
  message: string;
  status?: number;
  code?: string;
  fieldErrors?: FieldErrors;
};

export class ApiError extends Error {
  status?: number;
  code?: string;
  fieldErrors?: FieldErrors;

  constructor({ message, status, code, fieldErrors }: ApiErrorShape) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

function parseFastApiDetail(detail: unknown): { message?: string; fieldErrors?: FieldErrors } {
  if (typeof detail === "string") return { message: detail };

  if (Array.isArray(detail)) {
    const fieldErrors: FieldErrors = {};
    for (const item of detail) {
      const loc = (item as any)?.loc;
      const msg = (item as any)?.msg;
      if (!Array.isArray(loc) || typeof msg !== "string") continue;
      const path = loc.filter((p: any) => typeof p === "string" || typeof p === "number").join(".");
      if (path) fieldErrors[path] = msg;
    }
    return { message: "Validation error", fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined };
  }

  return {};
}

export function normalizeAxiosError(err: unknown): ApiError {
  const e = err as AxiosError<any>;
  const status = e?.response?.status;
  const data = e?.response?.data;

  const code =
    (typeof data?.code === "string" && data.code) ||
    (typeof data?.error === "string" && data.error) ||
    undefined;

  const { message: detailMessage, fieldErrors } = parseFastApiDetail(data?.detail);

  const message =
    detailMessage ||
    (typeof data?.message === "string" && data.message) ||
    (typeof data?.detail === "string" && data.detail) ||
    (typeof e?.message === "string" && e.message) ||
    "Request failed";

  return new ApiError({ message, status, code, fieldErrors });
}

