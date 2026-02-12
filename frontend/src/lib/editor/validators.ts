import type { GenerateClipResult } from "@/lib/api";

export function validateGenerateClipResult(result: GenerateClipResult) {
  if (!result || typeof result !== "object") return { ok: false as const, error: "Empty result" };
  if (result.status !== "succeeded") {
    const err = typeof (result as any).error === "string" ? (result as any).error : "Task failed";
    return { ok: false as const, error: err };
  }
  if (!Array.isArray(result.clips) || result.clips.length === 0) return { ok: false as const, error: "No clips returned" };
  const issues: string[] = [];
  let usable = 0;
  for (let i = 0; i < result.clips.length; i += 1) {
    const clip: any = (result.clips as any[])[i];
    if (!clip || typeof clip !== "object") {
      issues.push(`clips[${i}] invalid item`);
      continue;
    }
    if (typeof clip.error === "string" && clip.error) issues.push(`clips[${i}] error: ${clip.error}`);
    if (typeof clip.video_url === "string" && clip.video_url.length > 0) usable += 1;
    else issues.push(`clips[${i}] missing video_url`);
  }
  if (usable === 0) return { ok: false as const, error: "No usable clips (video_url missing)", issues };
  return { ok: true as const, issues, usable };
}
