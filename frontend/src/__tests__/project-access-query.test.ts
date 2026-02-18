import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { editorProjectAccessQueryKey, fetchProjectAccess } from "@/lib/queries/useProjectAccess";
import { projectApi } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  projectApi: {
    getPublic: vi.fn(),
    get: vi.fn(),
  },
}));

describe("useProjectAccess helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses shared editor access query key", () => {
    expect(editorProjectAccessQueryKey("proj_1")).toEqual(["editorProjectAccess", "proj_1"]);
  });

  it("resolves access via public endpoint by default", async () => {
    vi.mocked(projectApi.getPublic).mockResolvedValueOnce({ id: "proj_1", owner_id: "owner_1", is_public: true } as any);

    const result = await fetchProjectAccess("proj_1");
    expect(result.id).toBe("proj_1");
    expect(projectApi.getPublic).toHaveBeenCalledWith("proj_1");
    expect(projectApi.get).not.toHaveBeenCalled();
  });

  it("falls back to private endpoint when public endpoint returns 404", async () => {
    vi.mocked(projectApi.getPublic).mockRejectedValueOnce(
      new ApiError({ message: "not found", status: 404 }),
    );
    vi.mocked(projectApi.get).mockResolvedValueOnce({ id: "proj_1", owner_id: "owner_1", is_public: false } as any);

    const result = await fetchProjectAccess("proj_1");
    expect(result.is_public).toBe(false);
    expect(projectApi.getPublic).toHaveBeenCalledWith("proj_1");
    expect(projectApi.get).toHaveBeenCalledWith("proj_1");
  });
});

