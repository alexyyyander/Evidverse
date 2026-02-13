import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", async () => {
  return {
    get: vi.fn(async () => []),
    post: vi.fn(async () => ({})),
  };
});

import { mergeRequestsApi } from "@/lib/api/domains/merge_requests";
import { get, post } from "@/lib/api/client";

describe("mergeRequestsApi", () => {
  it("uses correct endpoints", async () => {
    await mergeRequestsApi.listByProject("p1");
    expect(get).toHaveBeenCalledWith("/projects/p1/merge-requests");

    await mergeRequestsApi.create("p1", { source_branch_name: "b1" });
    expect(post).toHaveBeenCalledWith("/projects/p1/merge-requests", { source_branch_name: "b1" });

    await mergeRequestsApi.get("mr1");
    expect(get).toHaveBeenCalledWith("/merge-requests/mr1");

    await mergeRequestsApi.merge("mr1");
    expect(post).toHaveBeenCalledWith("/merge-requests/mr1/merge");

    await mergeRequestsApi.close("mr1");
    expect(post).toHaveBeenCalledWith("/merge-requests/mr1/close");
  });
});

