import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

describe("cn", () => {
  it("joins truthy classnames", () => {
    expect(cn("a", undefined, null, false, "b")).toBe("a b");
  });
});

