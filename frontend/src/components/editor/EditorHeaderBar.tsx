"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { projectApi } from "@/lib/api";
import { useI18n } from "@/lib/i18nContext";
import { LANG_LABEL, type Lang } from "@/lib/i18n";
import { Check, Plus, Search, Edit2, ChevronLeft } from "lucide-react";
import Dialog from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMe } from "@/lib/queries/useMe";
import { useAuthToken } from "@/lib/auth/useAuthToken";
import { editorProjectAccessQueryKey } from "@/lib/queries/useProjectAccess";
import { useEditorStore } from "@/store/editorStore";
import {
  resolveNodeRecommendedAction,
  resolveStep4BlockBadgeClass,
  resolveStep4BlockNavigationByRawReason,
  summarizeNodeStep4ConfirmReadiness,
} from "@/lib/editor/storyProgress";
import StoryActionBadge from "@/components/editor/story/StoryActionBadge";
import {
  buildProjectLoginRedirect,
  hasAuthToken,
  resolveCollabActionAvailability,
  resolveCollabActionReasonI18nKey,
  resolveCollabActionReasonCode,
  resolveCollabReasonBannerClass,
  trackProjectCollabAction,
  type ProjectCollabAccessSnapshot,
} from "@/lib/projectCollaboration";

export default function EditorHeaderBar({
  projectId,
  collabAccess,
  projectAccess,
}: {
  projectId: string;
  collabAccess?: ProjectCollabAccessSnapshot;
  projectAccess?: {
    id?: string;
    name?: string;
    owner_id?: string | null;
    owner?: { id?: string | null } | null;
    is_public?: boolean;
    parent_project_id?: string | null;
  } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { lang, setLang, t } = useI18n();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const meQuery = useMe();
  const token = useAuthToken();
  const isAuthed = hasAuthToken(token) || !!meQuery.data?.id || !!collabAccess?.viewerId;
  const saveProject = useEditorStore((s) => s.saveProject);
  const setBranchBoundary = useEditorStore((s) => s.setBranchBoundary);
  const rewriteUnlockedNodesFromBoundary = useEditorStore((s) => s.rewriteUnlockedNodesFromBoundary);
  const setActiveStep = useEditorStore((s) => s.setActiveStep);
  const updateStoryUi = useEditorStore((s) => s.updateStoryUi);
  const updateLayout = useEditorStore((s) => s.updateLayout);
  const selectStoryNode = useEditorStore((s) => s.selectStoryNode);
  const storyWorkflow = useEditorStore((s) => s.data.storyWorkflow);
  const beats = useEditorStore((s) => s.data.beats);
  const characters = useEditorStore((s) => s.data.characters);
  const assets = useEditorStore((s) => s.data.assets);
  const selection = useEditorStore((s) => s.selection);
  const activeBranchName = ((search?.get("branch") || "main") as string).trim() || "main";

  // Branch management state
  const [searchBranch, setSearchBranch] = useState("");
  const [createBranchOpen, setCreateBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [boundaryDialogOpen, setBoundaryDialogOpen] = useState(false);
  const [boundaryInput, setBoundaryInput] = useState("0");

  const branchesQuery = useQuery({
    queryKey: ["projectBranches", projectId],
    queryFn: () => projectApi.getBranches(projectId),
  });

  useEffect(() => {
    const next = projectAccess?.name;
    if (typeof next === "string") setName(next);
  }, [projectAccess?.name]);

  const isOwner =
    collabAccess?.isOwner ??
    (!!meQuery.data?.id &&
      (meQuery.data.id === (projectAccess as any)?.owner_id ||
        meQuery.data.id === (projectAccess as any)?.owner?.id));
  const canCreateBranch = collabAccess?.canCreateBranch ?? true;
  const canMoveBoundaryFromCommit = collabAccess?.canMoveBoundaryFromCommit ?? true;
  const loginRedirect = buildProjectLoginRedirect(projectId);
  const createBranchPermissionReasonKey =
    resolveCollabActionReasonI18nKey({
      action: "create_branch",
      reasonType: "permission",
      surface: "editor_history",
    }) || "project.preview.collab.branchRequiresPublic";
  const createBranchAuthReasonKey =
    resolveCollabActionReasonI18nKey({
      action: "create_branch",
      reasonType: "auth",
      surface: "editor_history",
    }) || "project.preview.collab.branchAuthRequired";
  const moveBoundaryPermissionReasonKey =
    resolveCollabActionReasonI18nKey({
      action: "move_boundary",
      reasonType: "permission",
      surface: "editor_history",
    }) || "project.preview.collab.branchRequiresPublic";
  const moveBoundaryAuthReasonKey =
    resolveCollabActionReasonI18nKey({
      action: "move_boundary",
      reasonType: "auth",
      surface: "editor_history",
    }) || "graph.menu.authRequiredBoundary";
  const createBranchActionAvailability = useMemo(
    () =>
      resolveCollabActionAvailability({
        canUseAction: canCreateBranch,
        isAuthed,
        authReason: t(createBranchAuthReasonKey),
        permissionReason: t(createBranchPermissionReasonKey),
      }),
    [canCreateBranch, createBranchAuthReasonKey, createBranchPermissionReasonKey, isAuthed, t],
  );
  const moveBoundaryActionAvailability = useMemo(
    () =>
      resolveCollabActionAvailability({
        canUseAction: canMoveBoundaryFromCommit,
        isAuthed,
        authReason: t(moveBoundaryAuthReasonKey),
        permissionReason: t(moveBoundaryPermissionReasonKey),
      }),
    [canMoveBoundaryFromCommit, isAuthed, moveBoundaryAuthReasonKey, moveBoundaryPermissionReasonKey, t],
  );
  const canRename = useMemo(() => name.trim().length > 0 && name.trim() !== (projectAccess?.name || ""), [name, projectAccess?.name]);

  const renameMutation = useMutation({
    mutationFn: async (nextName: string) => projectApi.update(projectId, { name: nextName }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: editorProjectAccessQueryKey(projectId) });
      toast({ title: t("editor.saved"), description: t("editor.rename"), variant: "success" });
      setIsEditingName(false);
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : t("editor.saveFailed");
      toast({ title: t("editor.saveFailed"), description: message, variant: "destructive" });
      setName(projectAccess?.name || "");
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: async (branchName: string) => {
      return projectApi.forkBranch(projectId, {
        source_branch_name: activeBranchName,
        name: branchName,
      });
    },
    onSuccess: async (newBranch) => {
      trackProjectCollabAction({
        surface: "editor_history",
        action: "create_branch",
        decision_source: "access_snapshot",
        result: "success",
        projectId,
        branchName: newBranch.name,
        accessSnapshot: collabAccess,
      });
      await queryClient.invalidateQueries({ queryKey: ["projectBranches", projectId] });
      setCreateBranchOpen(false);
      setNewBranchName("");
      toast({
        title: t("editor.branch.toast.created"),
        description: t("editor.branch.toast.switched").replace("{name}", newBranch.name),
        variant: "success",
      });
      
      // Switch to new branch
      const params = new URLSearchParams(search?.toString() || "");
      params.set("branch", newBranch.name);
      router.replace(`${pathname}?${params.toString()}`);
    },
    onError: (e) => {
      trackProjectCollabAction({
        surface: "editor_history",
        action: "create_branch",
        decision_source: "access_snapshot",
        result: "error",
        projectId,
        reason: e instanceof Error ? e.message : "create_branch_failed",
        accessSnapshot: collabAccess,
      });
      const message = e instanceof Error ? e.message : t("editor.branch.toast.createFailed");
      toast({ title: t("editor.branch.toast.createFailed"), description: message, variant: "destructive" });
    },
  });
  const submitCreateBranch = (nextBranchName: string) => {
    if (createBranchActionAvailability.reasonType === "permission") {
      trackProjectCollabAction({
        surface: "editor_history",
        action: "create_branch",
        decision_source: "access_snapshot",
        result: "blocked",
        projectId,
        reason: resolveCollabActionReasonCode({ action: "create_branch", reasonType: "permission" }),
        accessSnapshot: collabAccess,
      });
      toast({
        title: t("editor.branch.toast.createFailed"),
        description: createBranchActionAvailability.reason || t(createBranchPermissionReasonKey),
        variant: "destructive",
      });
      return;
    }
    if (createBranchActionAvailability.reasonType === "auth") {
      trackProjectCollabAction({
        surface: "editor_history",
        action: "create_branch",
        decision_source: "access_snapshot",
        result: "redirect_login",
        projectId,
        reason: resolveCollabActionReasonCode({ action: "create_branch", reasonType: "auth" }),
        accessSnapshot: collabAccess,
      });
      router.push(loginRedirect);
      return;
    }
    createBranchMutation.mutate(nextBranchName);
  };
  const handleOpenCreateBranch = () => {
    if (createBranchActionAvailability.reasonType === "permission") {
      return;
    }
    if (createBranchActionAvailability.reasonType === "auth") {
      trackProjectCollabAction({
        surface: "editor_history",
        action: "create_branch",
        decision_source: "access_snapshot",
        result: "redirect_login",
        projectId,
        reason: resolveCollabActionReasonCode({ action: "create_branch", reasonType: "auth" }),
        accessSnapshot: collabAccess,
      });
      router.push(loginRedirect);
      return;
    }
    setCreateBranchOpen(true);
  };

  const visibilityMutation = useMutation({
    mutationFn: async (next: boolean) => projectApi.update(projectId, { is_public: next }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: editorProjectAccessQueryKey(projectId) });
      toast({ title: t("projects.visibilityUpdated"), description: "", variant: "success" });
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : t("editor.saveFailed");
      toast({ title: t("editor.saveFailed"), description: message, variant: "destructive" });
    },
  });

  const parentId = projectAccess?.parent_project_id || null;
  const isPublic = projectAccess?.is_public === true;
  const collaborationMode = useMemo(() => {
    if (parentId) {
      return {
        labelKey: "editor.collab.mode.fork",
        detail: `#${parentId}`,
        hintKey: "editor.collab.hint.fork",
      };
    }
    if (activeBranchName !== "main") {
      return {
        labelKey: "editor.collab.mode.branch",
        detail: activeBranchName,
        hintKey: "editor.collab.hint.branch",
      };
    }
    return {
      labelKey: "editor.collab.mode.main",
      detail: "main",
      hintKey: "editor.collab.hint.main",
    };
  }, [activeBranchName, parentId]);
  const branches = branchesQuery.data || [];
  const activeBranch = branches.find((b) => b.name === activeBranchName) || null;
  const selectedNode = useMemo(() => {
    if (!storyWorkflow) return null;
    const nodeId = selection.selectedStoryNodeId || storyWorkflow.selectedNodeId;
    if (!nodeId) return null;
    return storyWorkflow.nodes.find((n) => n.id === nodeId) || null;
  }, [selection.selectedStoryNodeId, storyWorkflow]);
  const recommendation = useMemo(() => {
    if (!selectedNode) return null;
    return resolveNodeRecommendedAction(selectedNode, { beats });
  }, [beats, selectedNode]);
  const step4Readiness = useMemo(() => {
    if (!selectedNode) return null;
    return summarizeNodeStep4ConfirmReadiness(selectedNode, {
      beats,
      characters,
      assets,
    });
  }, [assets, beats, characters, selectedNode]);
  const step4Blockers = step4Readiness?.blockReasons || [];
  const primaryStep4Blocker = step4Blockers[0] || null;
  const navigateToBlocker = (reason: unknown) => {
    if (!selectedNode) return false;
    const blockTarget = resolveStep4BlockNavigationByRawReason(reason, step4Blockers);
    if (!blockTarget) return false;
    selectStoryNode(selectedNode.id, "story");
    updateLayout({ activeLeftTab: "create" });
    updateStoryUi({ focusTarget: blockTarget.focusTarget });
    setActiveStep(blockTarget.targetStep);
    return true;
  };
  const currentBoundary = storyWorkflow?.branchPolicy.lockBoundaryOrder;

  const filteredBranches = useMemo(() => {
    const term = searchBranch.trim().toLowerCase();
    if (!term) return branches;
    return branches.filter((b) => b.name.toLowerCase().includes(term));
  }, [branches, searchBranch]);

  return (
    <>
      <div className="h-12 border-b border-border bg-background flex items-center gap-3 px-3">
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 pl-2 pr-3"
          onClick={() => router.push("/projects")}
          title={t("editor.exit")}
        >
          <ChevronLeft size={18} />
          {t("editor.exit")}
        </Button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                {activeBranchName}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[320px] p-0 overflow-hidden">
              <div className="p-2 border-b border-border bg-popover sticky top-0 z-10">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("editor.branch.search")}
                    value={searchBranch}
                    onChange={(e) => setSearchBranch(e.target.value)}
                    className="pl-8 h-9"
                    onKeyDown={(e) => e.stopPropagation()} // Prevent menu navigation
                  />
                </div>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto py-1">
                {filteredBranches.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">{t("editor.branch.notFound")}</div>
                ) : (
                  filteredBranches
                    .slice()
                    .sort((a, b) => (a.name === "main" ? -1 : b.name === "main" ? 1 : a.name.localeCompare(b.name)))
                    .map((b) => {
                      const isActive = b.name === activeBranchName;
                      return (
                        <DropdownMenuItem
                          key={b.id}
                          className={isActive ? "bg-secondary text-secondary-foreground mx-1" : "mx-1"}
                          onSelect={async () => {
                            if (b.name === activeBranchName) return;
                            try {
                              await saveProject(projectId, { silent: true, branchName: activeBranchName });
                            } catch {}
                            const params = new URLSearchParams(search?.toString() || "");
                            params.set("branch", b.name);
                            router.replace(`${pathname}?${params.toString()}`);
                          }}
                        >
                          <div className="flex items-start justify-between gap-3 w-full">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{b.name}</div>
                              {b.description ? (
                                <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{b.description}</div>
                              ) : null}
                              {Array.isArray(b.tags) && b.tags.length > 0 ? (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {b.tags.slice(0, 4).map((tag) => (
                                    <span
                                      key={tag}
                                      className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            {isActive ? <div className="text-xs text-muted-foreground">{t("editor.branch.active")}</div> : null}
                          </div>
                        </DropdownMenuItem>
                      );
                    })
                )}
              </div>

              <div className="p-2 border-t border-border bg-popover sticky bottom-0 z-10">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={handleOpenCreateBranch}
                  disabled={createBranchActionAvailability.reasonType === "permission"}
                  title={createBranchActionAvailability.reason || t("editor.branch.new")}
                >
                  <Plus size={14} />
                  {t("editor.branch.new")}
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="text-xs text-muted-foreground whitespace-nowrap">#{projectId}</div>
          
          <div className="flex items-center gap-1 flex-1 max-w-[520px]">
            {isEditingName ? (
              <>
                <Input
                  value={name}
                  onChange={(e) => {
                    if (!isOwner) return;
                    setName(e.target.value);
                  }}
                  placeholder={t("editor.projectName")}
                  className="h-9 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!isOwner) return;
                      const next = name.trim();
                      if (!next) return;
                      if (!canRename) return;
                      renameMutation.mutate(next);
                    } else if (e.key === "Escape") {
                      setIsEditingName(false);
                      setName(projectAccess?.name || "");
                    }
                  }}
                  autoFocus
                  onBlur={() => {
                    // Don't auto-save on blur, just cancel edit mode if user clicks away without saving
                    // Or keep it simple: blur cancels edit
                    if (!renameMutation.isPending) {
                      setIsEditingName(false);
                      setName(projectAccess?.name || "");
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-green-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 shrink-0"
                  onClick={() => {
                    if (canRename) renameMutation.mutate(name.trim());
                  }}
                  disabled={!canRename || renameMutation.isPending}
                  title={t("editor.save.tooltip")}
                  // Prevent blur from cancelling the edit when clicking save
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <Check size={16} />
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 group">
                <span className="font-semibold text-lg truncate max-w-[400px]">{projectAccess?.name || t("editor.project.untitled")}</span>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => {
                      setName(projectAccess?.name || "");
                      setIsEditingName(true);
                    }}
                    title={t("editor.rename.tooltip")}
                  >
                    <Edit2 size={18} />
                  </Button>
                )}
              </div>
            )}
          </div>

          {parentId ? (
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("project.parent")}:</span>
              <Link href={`/project/${parentId}`} className="hover:underline text-foreground">
                #{parentId}
              </Link>
            </div>
          ) : null}
          {activeBranch?.parent_branch_id ? (
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("editor.branch.parent")}:</span>
              <span className="text-foreground">{activeBranch.parent_branch_id}</span>
            </div>
          ) : null}
          <div
            className="hidden md:flex items-center gap-1 rounded-md border border-border/60 bg-secondary/30 px-2 py-1 text-[11px] text-muted-foreground"
            title={t(collaborationMode.hintKey)}
          >
            <span className="font-medium text-foreground">{t(collaborationMode.labelKey)}</span>
            <span className="font-mono text-[10px]">{collaborationMode.detail}</span>
          </div>
          <div
            className={`hidden md:flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${
              moveBoundaryActionAvailability.disabled
                ? resolveCollabReasonBannerClass(moveBoundaryActionAvailability.reasonType)
                : "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
            }`}
            title={
              moveBoundaryActionAvailability.reason || t("editor.collab.boundaryMovable")
            }
          >
            <span>
              {moveBoundaryActionAvailability.disabled ? t("editor.collab.boundaryLocked") : t("editor.collab.boundaryMovable")}
            </span>
          </div>
          {storyWorkflow ? (
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              {selectedNode && recommendation ? (
                <>
                  <span>{t("story.common.node")} #{selectedNode.order + 1}</span>
                  <StoryActionBadge action={recommendation.action} tone="soft" className="px-2 py-0.5 text-xs" />
                  {recommendation.action === "read_only" ? <span>{t("story.common.locked")}</span> : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      selectStoryNode(selectedNode.id, "story");
                      updateLayout({ activeLeftTab: "create" });
                      setActiveStep(recommendation.targetStep);
                    }}
                  >
                    {t("editor.header.goRecommended")}
                  </Button>
                  {!selectedNode.locked && step4Blockers.length > 0 ? (
                    <>
                      <span>{t("editor.header.blocked")}</span>
                      <span className="inline-flex items-center gap-1">
                        {step4Blockers.map((reason) => {
                          const primary = reason === primaryStep4Blocker;
                          return (
                            <button
                              key={`${selectedNode.id}-header-block-${reason}`}
                              type="button"
                              data-primary-blocker={primary ? "true" : "false"}
                              title={`${t(`story.step4.block.${reason}`)} · ${t("story.step4.block.fixHint")}`}
                              aria-label={`${t(`story.step4.block.${reason}`)} · ${t("story.step4.block.fixHint")}`}
                              onClick={() => {
                                navigateToBlocker(reason);
                              }}
                              className={`inline-flex items-center rounded border px-1 py-0.5 text-[10px] transition-opacity hover:opacity-100 ${resolveStep4BlockBadgeClass(reason)} ${primary ? "ring-1 ring-cyan-400/60 font-semibold" : "opacity-90"}`}
                            >
                              {t(`story.step4.block.${reason}`)}
                            </button>
                          );
                        })}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (navigateToBlocker(primaryStep4Blocker)) return;
                          selectStoryNode(selectedNode.id, "story");
                          updateLayout({ activeLeftTab: "create" });
                          setActiveStep("step4");
                        }}
                      >
                        {t("editor.header.fixBlocked")}
                      </Button>
                    </>
                  ) : null}
                </>
              ) : null}
              <span>{t("editor.boundary.label")}:</span>
              <span className="text-foreground">{typeof currentBoundary === "number" ? currentBoundary : t("editor.boundary.none")}</span>
              <Button
                size="sm"
                variant="secondary"
                disabled={moveBoundaryActionAvailability.reasonType === "permission"}
                title={moveBoundaryActionAvailability.reason || t("editor.boundary.set")}
                onClick={() => {
                  if (moveBoundaryActionAvailability.reasonType === "auth") {
                    trackProjectCollabAction({
                      surface: "editor_history",
                      action: "move_boundary",
                      decision_source: "access_snapshot",
                      result: "redirect_login",
                      projectId,
                      reason: resolveCollabActionReasonCode({ action: "move_boundary", reasonType: "auth" }),
                      accessSnapshot: collabAccess,
                    });
                    router.push(loginRedirect);
                    return;
                  }
                  const fallback = selectedNode?.order ?? currentBoundary ?? 0;
                  setBoundaryInput(String(fallback));
                  setBoundaryDialogOpen(true);
                }}
              >
                {t("editor.boundary.set")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={moveBoundaryActionAvailability.reasonType === "permission"}
                title={moveBoundaryActionAvailability.reason || t("editor.boundary.reset")}
                onClick={async () => {
                  if (moveBoundaryActionAvailability.reasonType === "auth") {
                    trackProjectCollabAction({
                      surface: "editor_history",
                      action: "move_boundary",
                      decision_source: "access_snapshot",
                      result: "redirect_login",
                      projectId,
                      reason: resolveCollabActionReasonCode({ action: "move_boundary", reasonType: "auth" }),
                      accessSnapshot: collabAccess,
                    });
                    router.push(loginRedirect);
                    return;
                  }
                  rewriteUnlockedNodesFromBoundary();
                  try {
                    await saveProject(projectId, { silent: true, branchName: activeBranchName });
                  } catch {}
                  toast({
                    title: t("editor.boundary.reset.toast.title"),
                    description: t("editor.boundary.reset.toast.desc"),
                    variant: "success",
                  });
                }}
              >
                {t("editor.boundary.reset")}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={visibilityMutation.isPending}
            disabled={!isOwner}
            onClick={() => visibilityMutation.mutate(!isPublic)}
          >
            {isPublic ? t("editor.visibility.public") : t("editor.visibility.private")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                {LANG_LABEL[lang]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["en", "zh", "ja"] as Lang[]).map((l) => (
                <DropdownMenuItem key={l} onSelect={() => setLang(l)}>
                  {LANG_LABEL[l]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog
        open={createBranchOpen}
        onOpenChange={setCreateBranchOpen}
        title={t("editor.branch.createTitle")}
        description={`${t("editor.branch.createDesc")} '${activeBranchName}'`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateBranchOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button 
              onClick={() => submitCreateBranch(newBranchName)}
              disabled={
                createBranchActionAvailability.reasonType === "permission" ||
                !newBranchName.trim() ||
                createBranchMutation.isPending
              }
              loading={createBranchMutation.isPending}
            >
              {t("editor.branch.create")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t("editor.branch.name")}
            </label>
            <Input
              placeholder={t("editor.branch.namePlaceholder")}
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newBranchName.trim()) {
                  submitCreateBranch(newBranchName);
                }
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {t("editor.branch.hint")}
            </p>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={boundaryDialogOpen}
        onOpenChange={setBoundaryDialogOpen}
        title={t("editor.boundary.dialog.title")}
        description={t("editor.boundary.dialog.desc")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setBoundaryDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={async () => {
                const parsed = Number(boundaryInput);
                if (!Number.isFinite(parsed) || parsed < 0) {
                  toast({
                    title: t("editor.boundary.invalid.title"),
                    description: t("editor.boundary.invalid.desc"),
                    variant: "destructive",
                  });
                  return;
                }
                setBranchBoundary(Math.floor(parsed));
                try {
                  await saveProject(projectId, { silent: true, branchName: activeBranchName });
                } catch {}
                setBoundaryDialogOpen(false);
                toast({
                  title: t("editor.boundary.updated.title"),
                  description: t("editor.boundary.updated.desc").replace("{order}", String(Math.floor(parsed))),
                  variant: "success",
                });
              }}
            >
              {t("editor.boundary.apply")}
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            {t("editor.boundary.selectedOrder")}: {selectedNode ? selectedNode.order : t("editor.boundary.none")}
          </div>
          <Input value={boundaryInput} onChange={(e) => setBoundaryInput(e.target.value)} placeholder={t("editor.boundary.placeholder")} />
        </div>
      </Dialog>
    </>
  );
}
