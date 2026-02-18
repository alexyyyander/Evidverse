export function hasAuthToken(token?: string | null): boolean {
  return typeof token === "string" && token.trim().length > 0;
}

export type ProjectCollabAccessSnapshot = {
  viewerId: string | null;
  ownerId: string | null;
  isOwner: boolean;
  isPublic: boolean;
  canCreateBranch: boolean;
  canMoveBoundaryFromCommit: boolean;
  canForkDirectly: boolean;
  requiresForkRequest: boolean;
  canForkFromCommit: boolean;
};

export type ProjectCollabActionSurface =
  | "project_card"
  | "project_preview"
  | "git_graph"
  | "editor_history";

export type ProjectCollabActionName =
  | "fork"
  | "request_fork"
  | "create_branch"
  | "move_boundary";

export type ProjectCollabActionResult = "success" | "blocked" | "redirect_login" | "error";

export type CollabActionDisableReasonType = "auth" | "permission";

export type CollabActionAvailability = {
  disabled: boolean;
  reason?: string;
  reasonType?: CollabActionDisableReasonType;
};

export type CollabActionReasonCode =
  | "auth_required_fork"
  | "auth_required_create_branch"
  | "auth_required_move_boundary"
  | "permission_denied_fork"
  | "permission_denied_create_branch"
  | "permission_denied_move_boundary"
  | "mutation_pending";

export type CollabActionReasonI18nKey =
  | "project.preview.collab.branchRequiresPublic"
  | "project.preview.collab.branchAuthRequired"
  | "project.preview.collab.forkAuthRequired"
  | "graph.menu.authRequiredFork"
  | "graph.menu.authRequiredBoundary";

type ResolveAccessInput = {
  owner_id?: string | null;
  owner?: {
    id?: string | null;
  } | null;
  is_public?: boolean | null;
};

export function getProjectOwnerId(project?: ResolveAccessInput | null): string | null {
  if (!project) return null;
  if (typeof project.owner_id === "string" && project.owner_id.length > 0) return project.owner_id;
  if (typeof project.owner?.id === "string" && project.owner.id.length > 0) return project.owner.id;
  return null;
}

export function resolveProjectCollabAccess(
  project?: ResolveAccessInput | null,
  viewerId?: string | null,
): ProjectCollabAccessSnapshot {
  const ownerId = getProjectOwnerId(project);
  const normalizedViewerId = typeof viewerId === "string" && viewerId.length > 0 ? viewerId : null;
  const isOwner = !!normalizedViewerId && !!ownerId && normalizedViewerId === ownerId;
  // Treat undefined as public-compatible to preserve existing behavior.
  const isPublic = project?.is_public !== false;
  const canCreateBranch = isOwner || isPublic;
  const canMoveBoundaryFromCommit = canCreateBranch;
  const canForkDirectly = isOwner;
  const requiresForkRequest = !isOwner;
  const canForkFromCommit = canForkDirectly || requiresForkRequest;
  return {
    viewerId: normalizedViewerId,
    ownerId,
    isOwner,
    isPublic,
    canCreateBranch,
    canMoveBoundaryFromCommit,
    canForkDirectly,
    requiresForkRequest,
    canForkFromCommit,
  };
}

export function canCreateBranchInRepo(input: { isOwner: boolean; isPublic?: boolean | null }): boolean {
  return input.isOwner || input.isPublic !== false;
}

export function resolveCollabActionAvailability(input: {
  canUseAction: boolean;
  isAuthed: boolean;
  authReason: string;
  permissionReason?: string;
}): CollabActionAvailability {
  if (!input.canUseAction) {
    return {
      disabled: true,
      reason: input.permissionReason,
      reasonType: "permission",
    };
  }
  if (!input.isAuthed) {
    return {
      disabled: true,
      reason: input.authReason,
      reasonType: "auth",
    };
  }
  return { disabled: false };
}

export function resolveCollabActionReasonCode(input: {
  action: ProjectCollabActionName;
  reasonType: CollabActionDisableReasonType | "pending";
}): CollabActionReasonCode {
  if (input.reasonType === "pending") return "mutation_pending";
  if (input.reasonType === "auth") {
    if (input.action === "create_branch") return "auth_required_create_branch";
    if (input.action === "move_boundary") return "auth_required_move_boundary";
    return "auth_required_fork";
  }
  if (input.action === "create_branch") return "permission_denied_create_branch";
  if (input.action === "move_boundary") return "permission_denied_move_boundary";
  return "permission_denied_fork";
}

export function resolveCollabActionReasonI18nKey(input: {
  action: ProjectCollabActionName;
  reasonType: CollabActionDisableReasonType;
  surface?: ProjectCollabActionSurface;
}): CollabActionReasonI18nKey | null {
  if (input.reasonType === "permission") {
    if (input.action === "create_branch" || input.action === "move_boundary") {
      return "project.preview.collab.branchRequiresPublic";
    }
    return null;
  }

  if (input.action === "create_branch") {
    return "project.preview.collab.branchAuthRequired";
  }

  if (input.action === "move_boundary") {
    if (input.surface === "git_graph" || input.surface === "editor_history") {
      return "graph.menu.authRequiredBoundary";
    }
    return "project.preview.collab.branchAuthRequired";
  }

  if (input.surface === "git_graph" || input.surface === "editor_history") {
    return "graph.menu.authRequiredFork";
  }
  return "project.preview.collab.forkAuthRequired";
}

export function resolveCollabReasonBannerClass(reasonType?: CollabActionDisableReasonType): string {
  if (reasonType === "auth") {
    return "border-cyan-500/35 bg-cyan-500/10 text-cyan-100";
  }
  if (reasonType === "permission") {
    return "border-amber-500/35 bg-amber-500/10 text-amber-200";
  }
  return "border-border bg-background/40 text-muted-foreground";
}

export function buildProjectLoginRedirect(projectId: string): string {
  return `/login?next=${encodeURIComponent(`/project/${projectId}`)}`;
}

export function trackProjectCollabAction(input: {
  surface: ProjectCollabActionSurface;
  action: ProjectCollabActionName;
  decision_source: "access_snapshot";
  result: ProjectCollabActionResult;
  projectId: string;
  commitId?: string | null;
  branchName?: string | null;
  reason?: string;
  accessSnapshot?: ProjectCollabAccessSnapshot;
}): void {
  if (typeof window === "undefined") return;
  const payload = {
    ...input,
    at: new Date().toISOString(),
  };
  window.dispatchEvent(
    new CustomEvent("evidverse:project-collab-action", {
      detail: payload,
    }),
  );
  if (process.env.NODE_ENV === "development") {
    console.debug("[collab-action]", payload);
  }
}
