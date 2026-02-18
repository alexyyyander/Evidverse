export type ComfyuiParamsSummary = {
  valid: boolean;
  total: number;
  filled: number;
};

export type ComfyuiParamsFillState = "invalid" | "empty" | "partial" | "full";

function isFilledValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return false;
}

export function parseComfyuiParamsObject(raw: string | null | undefined): Record<string, unknown> | null {
  const text = String(raw || "").trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function summarizeComfyuiParams(raw: string | null | undefined): ComfyuiParamsSummary {
  const parsed = parseComfyuiParamsObject(raw);
  if (!parsed) return { valid: false, total: 0, filled: 0 };
  const values = Object.values(parsed);
  return {
    valid: true,
    total: values.length,
    filled: values.filter((value) => isFilledValue(value)).length,
  };
}

export function resolveComfyuiParamsFillState(summary: ComfyuiParamsSummary): ComfyuiParamsFillState {
  if (!summary.valid) return "invalid";
  if (summary.total <= 0) return "empty";
  if (summary.filled >= summary.total) return "full";
  return "partial";
}
