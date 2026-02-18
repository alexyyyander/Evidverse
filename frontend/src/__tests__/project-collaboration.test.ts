import {
  buildProjectLoginRedirect,
  canCreateBranchInRepo,
  hasAuthToken,
  resolveCollabActionAvailability,
  resolveCollabActionReasonI18nKey,
  resolveCollabActionReasonCode,
  resolveCollabReasonBannerClass,
  resolveProjectCollabAccess,
} from "@/lib/projectCollaboration";
import { describe, expect, it } from "vitest";

describe("projectCollaboration", () => {
  it("resolves auth token presence safely", () => {
    expect(hasAuthToken("token-1")).toBe(true);
    expect(hasAuthToken("  ")).toBe(false);
    expect(hasAuthToken(null)).toBe(false);
    expect(hasAuthToken(undefined)).toBe(false);
  });

  it("allows branch creation for owner or public repository", () => {
    expect(canCreateBranchInRepo({ isOwner: true, isPublic: false })).toBe(true);
    expect(canCreateBranchInRepo({ isOwner: false, isPublic: true })).toBe(true);
    expect(canCreateBranchInRepo({ isOwner: false, isPublic: undefined })).toBe(true);
    expect(canCreateBranchInRepo({ isOwner: false, isPublic: false })).toBe(false);
  });

  it("builds stable login redirect for project preview", () => {
    expect(buildProjectLoginRedirect("project-1")).toBe("/login?next=%2Fproject%2Fproject-1");
  });

  it("resolves a stable collaboration snapshot", () => {
    const ownerSnapshot = resolveProjectCollabAccess(
      {
        owner: { id: "owner-1" },
        is_public: false,
      },
      "owner-1",
    );
    expect(ownerSnapshot.isOwner).toBe(true);
    expect(ownerSnapshot.canCreateBranch).toBe(true);
    expect(ownerSnapshot.canMoveBoundaryFromCommit).toBe(true);
    expect(ownerSnapshot.canForkDirectly).toBe(true);
    expect(ownerSnapshot.requiresForkRequest).toBe(false);

    const visitorSnapshot = resolveProjectCollabAccess(
      {
        owner_id: "owner-1",
        is_public: false,
      },
      "viewer-2",
    );
    expect(visitorSnapshot.isOwner).toBe(false);
    expect(visitorSnapshot.canCreateBranch).toBe(false);
    expect(visitorSnapshot.canMoveBoundaryFromCommit).toBe(false);
    expect(visitorSnapshot.canForkDirectly).toBe(false);
    expect(visitorSnapshot.requiresForkRequest).toBe(true);
    expect(visitorSnapshot.canForkFromCommit).toBe(true);
  });

  it("resolves action availability by permission/auth priority", () => {
    expect(
      resolveCollabActionAvailability({
        canUseAction: false,
        isAuthed: false,
        authReason: "login required",
        permissionReason: "permission denied",
      }),
    ).toEqual({
      disabled: true,
      reason: "permission denied",
      reasonType: "permission",
    });

    expect(
      resolveCollabActionAvailability({
        canUseAction: true,
        isAuthed: false,
        authReason: "login required",
      }),
    ).toEqual({
      disabled: true,
      reason: "login required",
      reasonType: "auth",
    });

    expect(
      resolveCollabActionAvailability({
        canUseAction: true,
        isAuthed: true,
        authReason: "login required",
      }),
    ).toEqual({ disabled: false });
  });

  it("resolves stable action reason code by action and reason type", () => {
    expect(resolveCollabActionReasonCode({ action: "fork", reasonType: "auth" })).toBe("auth_required_fork");
    expect(resolveCollabActionReasonCode({ action: "request_fork", reasonType: "auth" })).toBe("auth_required_fork");
    expect(resolveCollabActionReasonCode({ action: "create_branch", reasonType: "auth" })).toBe(
      "auth_required_create_branch",
    );
    expect(resolveCollabActionReasonCode({ action: "move_boundary", reasonType: "auth" })).toBe(
      "auth_required_move_boundary",
    );
    expect(resolveCollabActionReasonCode({ action: "fork", reasonType: "permission" })).toBe(
      "permission_denied_fork",
    );
    expect(resolveCollabActionReasonCode({ action: "create_branch", reasonType: "permission" })).toBe(
      "permission_denied_create_branch",
    );
    expect(resolveCollabActionReasonCode({ action: "move_boundary", reasonType: "permission" })).toBe(
      "permission_denied_move_boundary",
    );
    expect(resolveCollabActionReasonCode({ action: "move_boundary", reasonType: "pending" })).toBe(
      "mutation_pending",
    );
  });

  it("resolves i18n reason keys with surface-aware auth messaging", () => {
    expect(
      resolveCollabActionReasonI18nKey({
        action: "create_branch",
        reasonType: "permission",
        surface: "project_card",
      }),
    ).toBe("project.preview.collab.branchRequiresPublic");
    expect(
      resolveCollabActionReasonI18nKey({
        action: "create_branch",
        reasonType: "auth",
        surface: "project_preview",
      }),
    ).toBe("project.preview.collab.branchAuthRequired");
    expect(
      resolveCollabActionReasonI18nKey({
        action: "fork",
        reasonType: "auth",
        surface: "project_card",
      }),
    ).toBe("project.preview.collab.forkAuthRequired");
    expect(
      resolveCollabActionReasonI18nKey({
        action: "fork",
        reasonType: "auth",
        surface: "git_graph",
      }),
    ).toBe("graph.menu.authRequiredFork");
    expect(
      resolveCollabActionReasonI18nKey({
        action: "move_boundary",
        reasonType: "auth",
        surface: "editor_history",
      }),
    ).toBe("graph.menu.authRequiredBoundary");
  });

  it("maps reason type to stable banner class groups", () => {
    expect(resolveCollabReasonBannerClass("auth")).toContain("text-cyan");
    expect(resolveCollabReasonBannerClass("permission")).toContain("text-amber");
    expect(resolveCollabReasonBannerClass(undefined)).toContain("text-muted-foreground");
  });
});
