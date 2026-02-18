import { describe, expect, it } from "vitest";
import {
  parseComfyuiParamsObject,
  resolveComfyuiParamsFillState,
  summarizeComfyuiParams,
} from "@/lib/editor/comfyuiParams";

describe("comfyui params helpers", () => {
  it("parses valid params object and summarizes filled ratio", () => {
    const parsed = parseComfyuiParamsObject(
      JSON.stringify({
        seed: 1,
        prompt: "hello",
        negative_prompt: "",
        enabled: true,
      }),
    );
    expect(parsed).toBeTruthy();

    const summary = summarizeComfyuiParams(
      JSON.stringify({
        seed: 1,
        prompt: "hello",
        negative_prompt: "",
        enabled: true,
      }),
    );
    expect(summary.valid).toBe(true);
    expect(summary.total).toBe(4);
    expect(summary.filled).toBe(3);
    expect(resolveComfyuiParamsFillState(summary)).toBe("partial");
  });

  it("returns invalid state for malformed json", () => {
    const summary = summarizeComfyuiParams("{ invalid_json: true }");
    expect(summary.valid).toBe(false);
    expect(resolveComfyuiParamsFillState(summary)).toBe("invalid");
  });

  it("returns full state when all params are filled", () => {
    const summary = summarizeComfyuiParams(JSON.stringify({ seed: 123, prompt: "run" }));
    expect(resolveComfyuiParamsFillState(summary)).toBe("full");
  });
});
