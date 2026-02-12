import type { GenerateClipResult } from "@/lib/api";

export function validateGenerateClipResult(result: GenerateClipResult) {
  if (!result || typeof result !== "object") return { ok: false as const, error: "Empty result" };
  if (result.status !== "succeeded") {
    const err = typeof (result as any).error === "string" ? (result as any).error : "Task failed";
    return { ok: false as const, error: err };
  }
  if (!Array.isArray(result.clips) || result.clips.length === 0) return { ok: false as const, error: "No clips returned" };
  for (const clip of result.clips) {
    if (!clip) return { ok: false as const, error: "Invalid clip item" };
    if (typeof clip.video_url !== "string" || clip.video_url.length === 0) return { ok: false as const, error: "Clip missing video_url" };
  }
  return { ok: true as const };
}

