"use client";

import Link from "next/link";
import { projectApi, type ProjectFeedItem } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { Copy, Heart, GitFork, GitBranch, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import IconButton from "@/components/ui/icon-button";
import { Card } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useI18n } from "@/lib/i18nContext";
import { useAuthToken } from "@/lib/auth/useAuthToken";
import { sanitizeParticipatedBranchNames } from "@/lib/projectBranchSelection";
import ParticipatedBranchControl from "@/components/ParticipatedBranchControl";
import {
  buildProjectLoginRedirect,
  hasAuthToken,
  resolveCollabActionAvailability,
  resolveCollabActionReasonI18nKey,
  resolveCollabActionReasonCode,
  resolveCollabReasonBannerClass,
  resolveProjectCollabAccess,
  trackProjectCollabAction,
} from "@/lib/projectCollaboration";

interface ProjectCardProps {
  project: ProjectFeedItem;
  viewerId?: string | null;
  participatedBranchNames?: string[] | null;
}

type ForkMutationResult =
  | { mode: "forked"; forkedProjectId: string }
  | { mode: "requested" };

export default function ProjectCard({
  project: initialProject,
  viewerId,
  participatedBranchNames,
}: ProjectCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const token = useAuthToken();
  const [project, setProject] = useState(initialProject);
  const [selectedBranchName, setSelectedBranchName] = useState("");
  const queryClient = useQueryClient();
  const accessSnapshot = resolveProjectCollabAccess(project, viewerId);
  const isOwner = accessSnapshot.isOwner;
  const canCreateBranch = accessSnapshot.canCreateBranch;
  const loginRedirect = buildProjectLoginRedirect(project.id);
  const isAuthed = hasAuthToken(token);
  const branchPermissionReasonKey =
    resolveCollabActionReasonI18nKey({
      action: "create_branch",
      reasonType: "permission",
      surface: "project_card",
    }) || "project.preview.collab.branchRequiresPublic";
  const branchAuthReasonKey =
    resolveCollabActionReasonI18nKey({
      action: "create_branch",
      reasonType: "auth",
      surface: "project_card",
    }) || "project.preview.collab.branchAuthRequired";
  const forkAuthReasonKey =
    resolveCollabActionReasonI18nKey({
      action: isOwner ? "fork" : "request_fork",
      reasonType: "auth",
      surface: "project_card",
    }) || "project.preview.collab.forkAuthRequired";
  const branchActionAvailability = useMemo(
    () =>
      resolveCollabActionAvailability({
        canUseAction: canCreateBranch,
        isAuthed,
        authReason: t(branchAuthReasonKey),
        permissionReason: t(branchPermissionReasonKey),
      }),
    [branchAuthReasonKey, branchPermissionReasonKey, canCreateBranch, isAuthed, t],
  );
  const forkActionAvailability = useMemo(
    () =>
      resolveCollabActionAvailability({
        canUseAction: true,
        isAuthed,
        authReason: t(forkAuthReasonKey),
      }),
    [forkAuthReasonKey, isAuthed, t],
  );
  const primaryHref = `/project/${project.id}`;
  const myParticipatedBranches = useMemo(
    () => sanitizeParticipatedBranchNames(participatedBranchNames),
    [participatedBranchNames],
  );
  useEffect(() => {
    if (myParticipatedBranches.length === 0) {
      setSelectedBranchName("");
      return;
    }
    setSelectedBranchName((prev) =>
      myParticipatedBranches.includes(prev) ? prev : myParticipatedBranches[0],
    );
  }, [myParticipatedBranches]);
  const forkActionAriaLabel = isOwner ? t("project.card.forkProject") : t("project.card.requestForkProject");
  const forkActionTitle = isOwner ? t("project.card.forkThisProject") : t("project.card.requestForkThisProject");
  const branchActionAriaLabel = t("projects.createBranch");
  const branchActionTitle =
    branchActionAvailability.reason ||
    (canCreateBranch ? t("projects.createBranch") : t(branchPermissionReasonKey));

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: t("toast.copied"), description: `${label} ${t("toast.copied.desc")}`, variant: "success" });
    } catch {
      window.prompt(t("common.copyPrompt").replace("{label}", label), text);
    }
  };

  const likeMutation = useMutation({
    mutationFn: async () => projectApi.toggleLike(project.id),
    onMutate: async () => {
      const previousProject = project;
      setProject((prev) => {
        const nextLiked = !prev.is_liked;
        return {
          ...prev,
          is_liked: nextLiked,
          likes_count: nextLiked ? prev.likes_count + 1 : Math.max(0, prev.likes_count - 1),
        };
      });
      return { previousProject };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previousProject) setProject(ctx.previousProject);
      toast({ title: t("toast.likeFailed"), description: t("toast.tryAgain"), variant: "destructive" });
    },
    onSuccess: (isLikedNow) => {
      setProject((prev) => ({ ...prev, is_liked: isLikedNow }));
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      if (project.owner?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userProjects(project.owner.id) });
      }
    },
  });

  const forkMutation = useMutation<ForkMutationResult, Error, void>({
    mutationFn: async () => {
      if (accessSnapshot.canForkDirectly) {
        const forkedProject = await projectApi.fork(project.id);
        return { mode: "forked", forkedProjectId: forkedProject.id };
      }
      await projectApi.requestFork(project.id);
      return { mode: "requested" };
    },
    onSuccess: (result) => {
      trackProjectCollabAction({
        surface: "project_card",
        action: result.mode === "forked" ? "fork" : "request_fork",
        decision_source: "access_snapshot",
        result: "success",
        projectId: project.id,
        accessSnapshot,
      });
      if (result.mode === "forked") {
        toast({ title: t("toast.forked"), description: t("toast.forked.desc"), variant: "success" });
        queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
        router.push(`/editor/${result.forkedProjectId}`);
        return;
      }
      toast({ title: t("toast.forkRequested"), description: t("toast.forkRequested.desc"), variant: "success" });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    },
    onError: (error) => {
      trackProjectCollabAction({
        surface: "project_card",
        action: isOwner ? "fork" : "request_fork",
        decision_source: "access_snapshot",
        result: "error",
        reason: error instanceof Error ? error.message : "fork_failed",
        projectId: project.id,
        accessSnapshot,
      });
      const message = error instanceof Error ? error.message : t("toast.tryAgain");
      toast({ title: t("toast.forkFailed"), description: message, variant: "destructive" });
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: async () =>
      projectApi.forkBranch(project.id, {
        source_branch_name: "main",
      }),
    onSuccess: async (branch) => {
      trackProjectCollabAction({
        surface: "project_card",
        action: "create_branch",
        decision_source: "access_snapshot",
        result: "success",
        projectId: project.id,
        branchName: branch.name,
        accessSnapshot,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.projects() }),
        queryClient.invalidateQueries({ queryKey: ["branchParticipations"] }),
      ]);
      toast({
        title: t("editor.branch.toast.created"),
        description: t("editor.branch.toast.switched").replace("{name}", branch.name),
        variant: "success",
      });
      router.push(`/editor/${project.id}?branch=${encodeURIComponent(branch.name)}`);
    },
    onError: (error) => {
      trackProjectCollabAction({
        surface: "project_card",
        action: "create_branch",
        decision_source: "access_snapshot",
        result: "error",
        reason: error instanceof Error ? error.message : "create_branch_failed",
        projectId: project.id,
        accessSnapshot,
      });
      const message = error instanceof Error ? error.message : t("toast.tryAgain");
      toast({ title: t("editor.branch.toast.createFailed"), description: message, variant: "destructive" });
    },
  });

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (likeMutation.isPending) return;
    likeMutation.mutate();
  };

  const handleCreateBranch = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (createBranchMutation.isPending) {
      trackProjectCollabAction({
        surface: "project_card",
        action: "create_branch",
        decision_source: "access_snapshot",
        result: "blocked",
        reason: resolveCollabActionReasonCode({ action: "create_branch", reasonType: "pending" }),
        projectId: project.id,
        accessSnapshot,
      });
      return;
    }
    if (branchActionAvailability.reasonType === "permission") {
      trackProjectCollabAction({
        surface: "project_card",
        action: "create_branch",
        decision_source: "access_snapshot",
        result: "blocked",
        reason: resolveCollabActionReasonCode({ action: "create_branch", reasonType: "permission" }),
        projectId: project.id,
        accessSnapshot,
      });
      return;
    }
    if (branchActionAvailability.reasonType === "auth") {
      trackProjectCollabAction({
        surface: "project_card",
        action: "create_branch",
        decision_source: "access_snapshot",
        result: "redirect_login",
        reason: resolveCollabActionReasonCode({ action: "create_branch", reasonType: "auth" }),
        projectId: project.id,
        accessSnapshot,
      });
      router.push(loginRedirect);
      return;
    }
    createBranchMutation.mutate();
  };

  const handleFork = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (forkMutation.isPending) return;
    if (forkActionAvailability.reasonType === "auth") {
      const forkAction = isOwner ? "fork" : "request_fork";
      trackProjectCollabAction({
        surface: "project_card",
        action: forkAction,
        decision_source: "access_snapshot",
        result: "redirect_login",
        reason: resolveCollabActionReasonCode({ action: forkAction, reasonType: "auth" }),
        projectId: project.id,
        accessSnapshot,
      });
      router.push(loginRedirect);
      return;
    }
    const confirmKey = isOwner
      ? "project.card.forkConfirmOwner"
      : "project.card.forkConfirmRequest";
    if (!confirm(t(confirmKey).replace("{name}", project.name))) return;
    forkMutation.mutate();
  };

  return (
    <Card className="overflow-hidden transition-colors hover:bg-card/70">
      <div className="h-40 bg-secondary relative">
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <span className="text-4xl font-bold opacity-20">VID</span>
        </div>
      </div>

      <div className="p-6 pt-8">
        <div className="flex justify-between items-start mb-2">
          <Link href={primaryHref} className="hover:text-primary transition-colors min-w-0 flex-1" title={project.name}>
            <h3 className="font-semibold text-lg text-card-foreground truncate">{project.name}</h3>
          </Link>
        </div>

        <p className="text-sm text-muted-foreground mb-4 h-10 overflow-hidden line-clamp-2" title={project.description || ""}>
          {project.description || t("projects.desc.none")}
        </p>

        {Array.isArray(project.tags) && project.tags.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {project.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
        {myParticipatedBranches.length > 0 ? (
          <div className="mb-4 space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("projects.participation.myBranches")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {myParticipatedBranches.slice(0, 3).map((branchName) => (
                <span
                  key={branchName}
                  className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 font-mono text-[10px] text-secondary-foreground"
                >
                  {branchName}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <UserIcon size={14} className="shrink-0" />
            <span className="truncate" title={project.owner?.full_name || project.owner?.email || t("common.unknown")}>
              {project.owner?.full_name || project.owner?.email?.split("@")[0] || t("common.unknown")}
            </span>
            {project.parent_project_id ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  copyText(String(project.parent_project_id), t("project.card.parentProjectId"));
                }}
                className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:text-foreground shrink-0"
                aria-label={t("project.card.copyParentProjectId")}
                title={`${t("project.card.copyParentProjectId")}: ${project.parent_project_id}`}
              >
                <GitFork size={12} className="rotate-180" />
                <span>#{String(project.parent_project_id).slice(0, 6)}</span>
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <IconButton
              onClick={handleCreateBranch}
              loading={createBranchMutation.isPending}
              disabled={!canCreateBranch}
              aria-label={branchActionAriaLabel}
              title={branchActionTitle}
            >
              <GitBranch size={14} />
            </IconButton>
            {!isOwner && myParticipatedBranches.length > 0 ? (
              <ParticipatedBranchControl
                branchNames={myParticipatedBranches}
                selectedBranch={selectedBranchName}
                selectAriaLabel={t("projects.participation.branch")}
                onSelectedBranchChange={setSelectedBranchName}
                onSelectClick={(event) => event.stopPropagation()}
                containerClassName="flex items-center gap-1.5"
                selectClassName="h-7 rounded-md border border-border bg-background px-2 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                renderOpenControl={(effectiveBranch) => (
                  <Link
                    href={`/editor/${project.id}?branch=${encodeURIComponent(effectiveBranch)}`}
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
                    title={t("projects.participation.openBranch")}
                  >
                    {t("projects.participation.openBranch")}
                  </Link>
                )}
              />
            ) : null}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                copyText(String(project.id), t("project.card.projectId"));
              }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:text-foreground max-w-[100px]"
              aria-label={t("project.card.copyProjectId")}
              title={`${t("project.card.copyProjectId")}: ${project.id}`}
            >
              <span className="truncate">#{String(project.id).slice(0, 8)}</span>
              <Copy size={12} className="shrink-0" />
            </button>
            <button
              onClick={handleLike}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                project.is_liked ? "text-pink-500" : "hover:text-pink-500"
              }`}
              aria-label={t("project.card.likeProject")}
            >
              <Heart size={14} fill={project.is_liked ? "currentColor" : "none"} />
              <span>{project.likes_count}</span>
            </button>

            <IconButton
              onClick={handleFork}
              loading={forkMutation.isPending}
              aria-label={forkActionAriaLabel}
              title={forkActionTitle}
            >
              <GitFork size={14} />
            </IconButton>
          </div>
        </div>
        {!isOwner && branchActionAvailability.disabled && branchActionAvailability.reason ? (
          <div
            className={`mt-3 rounded-md border px-3 py-2 text-[11px] ${resolveCollabReasonBannerClass(
              branchActionAvailability.reasonType,
            )}`}
          >
            {branchActionAvailability.reason}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
