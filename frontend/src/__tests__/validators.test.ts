import { describe, expect, it } from "vitest";
import { validateGenerateClipResult } from "@/lib/editor/validators";

describe("validateGenerateClipResult", () => {
  it("accepts succeeded result with clips", () => {
    const result: any = { status: "succeeded", clips: [{ video_url: "http://x", narration: "n" }] };
    expect(validateGenerateClipResult(result).ok).toBe(true);
  });

  it("rejects failed status", () => {
    const result: any = { status: "failed", error: "boom" };
    const r = validateGenerateClipResult(result);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("boom");
  });

  it("rejects missing clips", () => {
    const result: any = { status: "succeeded", clips: [] };
    expect(validateGenerateClipResult(result).ok).toBe(false);
  });

  it("rejects missing video_url", () => {
    const result: any = { status: "succeeded", clips: [{ video_url: "" }] };
    expect(validateGenerateClipResult(result).ok).toBe(false);
  });
});

