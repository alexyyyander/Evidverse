import { describe, expect, it } from "vitest";
import {
  resolveParticipatedBranch,
  sanitizeParticipatedBranchNames,
} from "@/lib/projectBranchSelection";

describe("projectBranchSelection", () => {
  it("sanitizes and deduplicates participated branch names", () => {
    expect(
      sanitizeParticipatedBranchNames([" feature/a ", "", "feature/a", "feature/b", "   ", "feature/b"]),
    ).toEqual(["feature/a", "feature/b"]);
  });

  it("returns first branch when selected branch is missing", () => {
    expect(resolveParticipatedBranch(["branch-a", "branch-b"], "branch-x")).toBe("branch-a");
  });

  it("returns selected branch when selected branch is valid", () => {
    expect(resolveParticipatedBranch(["branch-a", "branch-b"], "branch-b")).toBe("branch-b");
  });
});

