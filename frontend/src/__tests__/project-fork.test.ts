import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { forkFromCommitBestEffort } from "@/lib/projectFork";

const mocked = vi.hoisted(() => ({
  fork: vi.fn(),
  requestFork: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  projectApi: {
    fork: (...args: any[]) => mocked.fork(...args),
    requestFork: (...args: any[]) => mocked.requestFork(...args),
  },
}));

describe("forkFromCommitBestEffort", () => {
  beforeEach(() => {
    mocked.fork.mockReset();
    mocked.requestFork.mockReset();
  });

  it("returns forked mode when direct fork succeeds", async () => {
    mocked.fork.mockResolvedValue({ id: "new-project-1" });

    await expect(forkFromCommitBestEffort("project-1", "commit-a")).resolves.toEqual({
      mode: "forked",
      projectId: "new-project-1",
    });

    expect(mocked.requestFork).not.toHaveBeenCalled();
  });

  it("falls back to request fork when direct fork returns 403", async () => {
    mocked.fork.mockRejectedValue(new ApiError({ message: "forbidden", status: 403 }));
    mocked.requestFork.mockResolvedValue({ id: "fork-request-1" });

    await expect(forkFromCommitBestEffort("project-2", "commit-b")).resolves.toEqual({
      mode: "requested",
    });

    expect(mocked.requestFork).toHaveBeenCalledWith("project-2", "commit-b");
  });

  it("rethrows non-403 API errors", async () => {
    mocked.fork.mockRejectedValue(new ApiError({ message: "boom", status: 500 }));

    await expect(forkFromCommitBestEffort("project-3", "commit-c")).rejects.toBeInstanceOf(ApiError);
    expect(mocked.requestFork).not.toHaveBeenCalled();
  });
});

