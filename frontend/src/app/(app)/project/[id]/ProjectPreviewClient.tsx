"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/layout/PageContainer";
import LoadingState from "@/components/states/LoadingState";
import EmptyState from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import Button from "@/components/ui/button";
import LinkButton from "@/components/ui/link-button";
import Textarea from "@/components/ui/textarea";
import Input from "@/components/ui/input";
import Badge from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import FractalTree from "@/components/ui/fractal-tree";
import { mergeRequestsApi, projectApi } from "@/lib/api";
import { usePublicProject } from "@/lib/queries/usePublicProject";
import { useMe } from "@/lib/queries/useMe";
import { useAuthToken } from "@/lib/auth/useAuthToken";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useI18n } from "@/lib/i18nContext";
import GitGraph from "@/components/GitGraph";
import { GitFork, Heart, Play, User as UserIcon, Calendar, Info, GitMerge, GitBranch } from "lucide-react";
import { cn } from "@/lib/cn";
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

export default function ProjectPreviewClient({ projectId }: { projectId: string | null }) {
  const router = useRouter();
  const token = useAuthToken();
  const meQuery = useMe();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const projectQuery = usePublicProject(projectId);
  
  const [mrSourceBranch, setMrSourceBranch] = useState("");
  const [mrTitle, setMrTitle] = useState("");
  const [mrDescription, setMrDescription] = useState("");
  const [activeTab, setActiveTab] = useState("graph");
  const [showOnlyMyParticipatedBranches, setShowOnlyMyParticipatedBranches] = useState(false);
  const [selectedParticipatedBranch, setSelectedParticipatedBranch] = useState("");
  const hasToken = hasAuthToken(token);
  
  const canLoadAuthedData = hasToken && typeof projectId === "string" && projectId.length > 0;
  const viewerId = meQuery.data?.id || null;
  const accessSnapshot = resolveProjectCollabAccess(projectQuery.data || null, viewerId);
  const isOwner = accessSnapshot.isOwner;
  const canCreateBranchAction = accessSnapshot.canCreateBranch;
  const branchPermissionReasonKey =
    resolveCollabActionReasonI18nKey({
      action: "create_branch",
      reasonType: "permission",
      surface: "project_preview",
    }) || "project.preview.collab.branchRequiresPublic";
  const branchAuthReasonKey =
    resolveCollabActionReasonI18nKey({
      action: "create_branch",
      reasonType: "auth",
      surface: "project_preview",
    }) || "project.preview.collab.branchAuthRequired";
  const forkAuthReasonKey =
    resolveCollabActionReasonI18nKey({
      action: isOwner ? "fork" : "request_fork",
      reasonType: "auth",
      surface: "project_preview",
    }) || "project.preview.collab.forkAuthRequired";
  const moveBoundaryPermissionReasonKey =
    resolveCollabActionReasonI18nKey({
      action: "move_boundary",
      reasonType: "permission",
      surface: "project_preview",
    }) || "project.preview.collab.branchRequiresPublic";
  const branchActionAvailability = useMemo(
    () =>
      resolveCollabActionAvailability({
        canUseAction: canCreateBranchAction,
        isAuthed: hasToken,
        authReason: t(branchAuthReasonKey),
        permissionReason: t(branchPermissionReasonKey),
      }),
    [branchAuthReasonKey, branchPermissionReasonKey, canCreateBranchAction, hasToken, t],
  );
  const forkRequestAvailability = useMemo(
    () =>
      resolveCollabActionAvailability({
        canUseAction: true,
        isAuthed: hasToken,
        authReason: t(forkAuthReasonKey),
      }),
    [forkAuthReasonKey, hasToken, t],
  );
  const loginRedirect = typeof projectId === "string" ? buildProjectLoginRedirect(projectId) : "/login";

  const handleForkRequest = () => {
    if (forkRequestMutation.isPending) return;
    if (forkRequestAvailability.reasonType === "auth") {
      if (projectId) {
        const forkAction = isOwner ? "fork" : "request_fork";
        trackProjectCollabAction({
          surface: "project_preview",
          action: forkAction,
          decision_source: "access_snapshot",
          result: "redirect_login",
          reason: resolveCollabActionReasonCode({ action: forkAction, reasonType: "auth" }),
          projectId,
          accessSnapshot,
        });
      }
      router.push(loginRedirect);
      return;
    }
    forkRequestMutation.mutate();
  };

  const handleCreateBranch = () => {
    if (createBranchMutation.isPending) return;
    if (branchActionAvailability.reasonType === "permission") {
      if (projectId) {
        trackProjectCollabAction({
          surface: "project_preview",
          action: "create_branch",
          decision_source: "access_snapshot",
          result: "blocked",
          reason: resolveCollabActionReasonCode({ action: "create_branch", reasonType: "permission" }),
          projectId,
          accessSnapshot,
        });
      }
      return;
    }
    if (branchActionAvailability.reasonType === "auth") {
      if (projectId) {
        trackProjectCollabAction({
          surface: "project_preview",
          action: "create_branch",
          decision_source: "access_snapshot",
          result: "redirect_login",
          reason: resolveCollabActionReasonCode({ action: "create_branch", reasonType: "auth" }),
          projectId,
          accessSnapshot,
        });
      }
      router.push(loginRedirect);
      return;
    }
    createBranchMutation.mutate();
  };

  const forkRequestMutation = useMutation({
    mutationFn: async () => projectApi.requestFork(projectId as string),
    onSuccess: () => {
      if (projectId) {
        trackProjectCollabAction({
          surface: "project_preview",
          action: "request_fork",
          decision_source: "access_snapshot",
          result: "success",
          projectId,
          accessSnapshot,
        });
      }
      toast({ title: t("project.forkRequested.title"), description: t("project.forkRequested.desc"), variant: "success" });
    },
    onError: (e) => {
      if (projectId) {
        trackProjectCollabAction({
          surface: "project_preview",
          action: "request_fork",
          decision_source: "access_snapshot",
          result: "error",
          reason: e instanceof Error ? e.message : "request_fork_failed",
          projectId,
          accessSnapshot,
        });
      }
      const message = e instanceof Error ? e.message : t("project.forkFailed.title");
      toast({ title: t("project.forkFailed.title"), description: message, variant: "destructive" });
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: async () =>
      projectApi.forkBranch(projectId as string, {
        source_branch_name: "main",
      }),
    onSuccess: async (branch) => {
      if (projectId) {
        trackProjectCollabAction({
          surface: "project_preview",
          action: "create_branch",
          decision_source: "access_snapshot",
          result: "success",
          projectId,
          branchName: branch.name,
          accessSnapshot,
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projectBranches", projectId] }),
        queryClient.invalidateQueries({ queryKey: ["branchParticipations"] }),
      ]);
      toast({
        title: t("editor.branch.toast.created"),
        description: t("editor.branch.toast.switched").replace("{name}", branch.name),
        variant: "success",
      });
      router.push(`/editor/${projectId}?branch=${encodeURIComponent(branch.name)}`);
    },
    onError: (e) => {
      if (projectId) {
        trackProjectCollabAction({
          surface: "project_preview",
          action: "create_branch",
          decision_source: "access_snapshot",
          result: "error",
          reason: e instanceof Error ? e.message : "create_branch_failed",
          projectId,
          accessSnapshot,
        });
      }
      const message = e instanceof Error ? e.message : t("editor.branch.toast.createFailed");
      toast({ title: t("editor.branch.toast.createFailed"), description: message, variant: "destructive" });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => projectApi.toggleLike(projectId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.publicProject(projectId as string) });
    },
  });

  useEffect(() => {
    if (!projectQuery.isError) return;
    const message = projectQuery.error instanceof Error ? projectQuery.error.message : t("project.loadFailed.title");
    toast({ title: t("project.loadFailed.title"), description: message, variant: "destructive" });
  }, [projectQuery.error, projectQuery.isError, t]);

  const branchesQuery = useQuery({
    queryKey: ["projectBranches", projectId],
    queryFn: () => projectApi.getBranches(projectId as string),
    enabled: canLoadAuthedData,
  });

  const mrsQuery = useQuery({
    queryKey: ["mergeRequests", projectId],
    queryFn: () => mergeRequestsApi.listByProject(projectId as string),
    enabled: canLoadAuthedData,
    refetchInterval: (q) => {
      const items = (q.state.data || []) as any[];
      if (!Array.isArray(items) || items.length === 0) return false;
      return items.some((x) => String(x?.status || "").toLowerCase() === "open") ? 2500 : false;
    },
  });

  const branchParticipationsQuery = useQuery({
    queryKey: ["branchParticipations"],
    queryFn: () => projectApi.getBranchParticipations(),
    enabled: canLoadAuthedData && !isOwner,
  });

  const forkRequestsQuery = useQuery({
    queryKey: ["forkRequests", projectId, "pending"],
    queryFn: () => projectApi.listForkRequests(projectId as string, { status_filter: "pending" }),
    enabled: canLoadAuthedData && isOwner,
    refetchInterval: 5000,
  });

  const approveForkRequestMutation = useMutation({
    mutationFn: (requestId: string) => projectApi.approveForkRequest(projectId as string, requestId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["forkRequests", projectId, "pending"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projects() }),
      ]);
      toast({ title: t("project.forkRequests.toast.approved.title"), description: "", variant: "success" });
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : t("project.forkRequests.toast.approved.failed");
      toast({
        title: t("project.forkRequests.toast.approved.failed"),
        description: message,
        variant: "destructive",
      });
    },
  });

  const rejectForkRequestMutation = useMutation({
    mutationFn: (requestId: string) => projectApi.rejectForkRequest(projectId as string, requestId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["forkRequests", projectId, "pending"] });
      toast({ title: t("project.forkRequests.toast.rejected.title"), description: "", variant: "success" });
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : t("project.forkRequests.toast.rejected.failed");
      toast({
        title: t("project.forkRequests.toast.rejected.failed"),
        description: message,
        variant: "destructive",
      });
    },
  });

  // Try to fetch HEAD of main branch to get preview video
  const headQuery = useQuery({
    queryKey: ["projectHead", projectId],
    queryFn: () => projectApi.getWorkspace(projectId as string, { branch_name: "main" }), // Re-using getWorkspace as proxy or getHead if available
    enabled: !!projectId,
    retry: false
  });

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const branchOptions = useMemo(() => {
    const branches = branchesQuery.data || [];
    return branches
      .slice()
      .sort((a, b) => (a.name === "main" ? -1 : b.name === "main" ? 1 : a.name.localeCompare(b.name)));
  }, [branchesQuery.data]);

  const myParticipatedBranches = useMemo(() => {
    const projectIdValue = projectQuery.data?.id || null;
    if (!projectIdValue) return [] as string[];
    const all = branchParticipationsQuery.data || [];
    const entry = all.find((item) => item.id === projectIdValue);
    return sanitizeParticipatedBranchNames(entry?.participated_branch_names);
  }, [branchParticipationsQuery.data, projectQuery.data?.id]);
  const myParticipatedBranchSet = useMemo(() => new Set(myParticipatedBranches), [myParticipatedBranches]);
  const visibleBranchOptions = useMemo(() => {
    if (!showOnlyMyParticipatedBranches) return branchOptions;
    return branchOptions.filter((branch) => myParticipatedBranchSet.has(branch.name));
  }, [branchOptions, myParticipatedBranchSet, showOnlyMyParticipatedBranches]);

  useEffect(() => {
    if (isOwner || myParticipatedBranches.length === 0) {
      setShowOnlyMyParticipatedBranches(false);
    }
  }, [isOwner, myParticipatedBranches.length]);

  useEffect(() => {
    if (myParticipatedBranches.length === 0) {
      setSelectedParticipatedBranch("");
      return;
    }
    setSelectedParticipatedBranch((prev) =>
      myParticipatedBranches.includes(prev) ? prev : myParticipatedBranches[0],
    );
  }, [myParticipatedBranches]);

  const createMrMutation = useMutation({
    mutationFn: () =>
      mergeRequestsApi.create(projectId as string, {
        source_branch_name: mrSourceBranch.trim(),
        target_branch_name: "main",
        title: mrTitle.trim() || undefined,
        description: mrDescription.trim() || undefined,
      }),
    onSuccess: async (mr) => {
      await queryClient.invalidateQueries({ queryKey: ["mergeRequests", projectId] });
      setMrTitle("");
      setMrDescription("");
      toast({ title: t("mr.toast.created.title"), description: mr.id, variant: "success" });
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : t("mr.toast.createFailed.desc");
      toast({ title: t("mr.toast.createFailed.title"), description: message, variant: "destructive" });
    },
  });

  const handleCreateMr = () => {
    if (!mrSourceBranch.trim()) {
      toast({
        title: t("common.error"),
        description: t("project.preview.mr.sourceRequired"),
        variant: "destructive"
      });
      return;
    }
    createMrMutation.mutate();
  };

  const mergeMrMutation = useMutation({
    mutationFn: (mrId: string) => mergeRequestsApi.merge(mrId),
    onSuccess: async (mr) => {
      await queryClient.invalidateQueries({ queryKey: ["mergeRequests", projectId] });
      toast({ title: t("mr.toast.merged.title"), description: mr.id, variant: "success" });
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : t("mr.toast.mergeFailed.desc");
      toast({ title: t("mr.toast.mergeFailed.title"), description: message, variant: "destructive" });
    },
  });

  const closeMrMutation = useMutation({
    mutationFn: (mrId: string) => mergeRequestsApi.close(mrId),
    onSuccess: async (mr) => {
      await queryClient.invalidateQueries({ queryKey: ["mergeRequests", projectId] });
      toast({ title: t("mr.toast.closed.title"), description: mr.id, variant: "success" });
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : t("mr.toast.closeFailed.desc");
      toast({ title: t("mr.toast.closeFailed.title"), description: message, variant: "destructive" });
    },
  });

  const getMrStatusLabel = (status: string) => {
    if (status === "open") return t("mr.status.open");
    if (status === "merged") return t("mr.status.merged");
    if (status === "closed") return t("mr.status.closed");
    return status || t("common.unknown");
  };

  if (projectQuery.isLoading) return <LoadingState label={t("common.loading")} />;

  const project = projectQuery.data || null;
  if (!project) {
    return (
      <div className="min-h-[calc(100vh-64px)] py-8">
        <PageContainer>
          <EmptyState title={t("project.preview.notFound")} description={t("project.preview.notPublic")} />
        </PageContainer>
      </div>
    );
  }

  // Placeholder video logic - in real app, check commit assets
  const hasPreviewVideo = false; 

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background relative">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(153,255,234,0.08),transparent_36%),radial-gradient(circle_at_82%_84%,rgba(137,196,255,0.07),transparent_34%)]" />
        <FractalTree className="absolute -right-16 -top-12 opacity-60" />
        <FractalTree
          className="absolute -bottom-20 -left-20 opacity-40 [animation-duration:22s] -scale-x-100"
          stroke="rgba(191, 231, 255, 0.32)"
          glow="rgba(191, 231, 255, 0.08)"
          depth={7}
        />
      </div>
      {/* Hero Section */}
      <div className="border-b border-border bg-card/30">
        <PageContainer>
          <div className="py-8 flex flex-col md:flex-row gap-8">
            {/* Left: Preview */}
            <div className="w-full md:w-7/12 aspect-video bg-black/50 rounded-lg overflow-hidden relative shadow-lg border border-border/50 flex items-center justify-center group">
              {hasPreviewVideo ? (
                <div className="text-white">{t("project.preview.videoPlayerPlaceholder")}</div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors">
                  <div className="w-16 h-16 rounded-full bg-background/20 flex items-center justify-center backdrop-blur-sm">
                    <Play size={32} fill="currentColor" className="ml-1 opacity-80" />
                  </div>
                  <div className="text-sm font-medium">{t("project.preview.noVideo")}</div>
                </div>
              )}
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                 <div className="text-white/80 text-xs font-mono">{t("project.preview.headMain")}</div>
              </div>
            </div>

            {/* Right: Info */}
            <div className="w-full md:w-5/12 flex flex-col gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary/50">
                    <UserIcon size={14} />
                    <span className="font-medium text-foreground">
                      {project.owner?.full_name || project.owner?.email?.split("@")[0] || t("common.unknown")}
                    </span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>{mounted ? new Date(project.created_at).toLocaleDateString() : ""}</span>
                  </div>
                </div>
              </div>

              <p className="text-muted-foreground leading-relaxed line-clamp-4">
                {project.description || t("projects.desc.none")}
              </p>

              {/* Stats */}
              <div className="flex gap-4 py-2 mt-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background">
                  <Heart size={16} className={project.is_liked ? "text-pink-500 fill-current" : "text-muted-foreground"} />
                  <span className="font-semibold">{project.likes_count}</span>
                  <span className="text-xs text-muted-foreground">{t("project.preview.likes")}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background">
                  <GitFork size={16} className="text-muted-foreground" />
                  <span className="font-semibold">-</span>
                  <span className="text-xs text-muted-foreground">{t("project.preview.forks")}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background">
                  <GitBranch size={16} className="text-muted-foreground" />
                  <span className="font-semibold">{branchOptions.length}</span>
                  <span className="text-xs text-muted-foreground">{t("project.preview.branches")}</span>
                </div>
              </div>

              {/* Tags */}
              {Array.isArray(project.tags) && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {project.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="px-2 py-1">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 mt-auto pt-4">
                {isOwner ? (
                  <LinkButton href={`/editor/${project.id}`} size="lg" className="flex-1 min-w-[140px]">
                    {t("project.openEditor")}
                  </LinkButton>
                ) : (
                  <>
                    <Button 
                      size="lg" 
                      className="flex-1 min-w-[140px]"
                      loading={forkRequestMutation.isPending} 
                      onClick={handleForkRequest}
                    >
                      <GitFork size={16} className="mr-2" />
                      {t("project.fork.request")}
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="flex-1 min-w-[140px]"
                      loading={createBranchMutation.isPending}
                      disabled={!canCreateBranchAction}
                      onClick={handleCreateBranch}
                      title={
                        branchActionAvailability.reason ||
                        (canCreateBranchAction ? t("projects.createBranch") : t(branchPermissionReasonKey))
                      }
                    >
                      <GitBranch size={16} className="mr-2" />
                      {t("projects.createBranch")}
                    </Button>
                    <ParticipatedBranchControl
                      branchNames={myParticipatedBranches}
                      selectedBranch={selectedParticipatedBranch}
                      selectAriaLabel={t("projects.participation.branch")}
                      onSelectedBranchChange={setSelectedParticipatedBranch}
                      containerClassName="flex flex-1 min-w-[140px] gap-2"
                      selectClassName="h-12 min-w-0 flex-1 border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      renderOpenControl={(effectiveBranch) => (
                        <LinkButton
                          href={`/editor/${project.id}?branch=${encodeURIComponent(effectiveBranch)}`}
                          size="lg"
                          variant="secondary"
                          className="flex-1 min-w-[140px]"
                        >
                          {t("projects.participation.openBranch")}
                        </LinkButton>
                      )}
                    />
                    {!hasToken && (
                      <LinkButton href={loginRedirect} variant="secondary" size="lg" className="flex-1 min-w-[100px]">
                        {t("auth.login")}
                      </LinkButton>
                    )}
                  </>
                )}
                <Button 
                  size="lg" 
                  variant="outline" 
                  className={cn("px-4 shrink-0", project.is_liked && "border-pink-500/50 bg-pink-500/5 text-pink-500")}
                  onClick={() => likeMutation.mutate()}
                  disabled={!token}
                >
                  <Heart size={20} fill={project.is_liked ? "currentColor" : "none"} />
                </Button>
              </div>
              {!isOwner && branchActionAvailability.disabled && branchActionAvailability.reason ? (
                <div
                  className={`rounded-md border px-3 py-2 text-[11px] ${resolveCollabReasonBannerClass(
                    branchActionAvailability.reasonType,
                  )}`}
                >
                  {branchActionAvailability.reason}
                </div>
              ) : null}
              {!isOwner ? (
                <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2 text-[11px] text-muted-foreground">
                  <div>{t("project.preview.collab.forkHint")}</div>
                  <div className="mt-1">{t("project.preview.collab.branchHint")}</div>
                </div>
              ) : null}
              {!isOwner && myParticipatedBranches.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
                  <span>{t("projects.participation.myBranches")}:</span>
                  {myParticipatedBranches.slice(0, 3).map((branchName) => (
                    <span
                      key={branchName}
                      className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 font-mono text-[11px] text-secondary-foreground"
                    >
                      {branchName}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </PageContainer>
      </div>

      {/* Content Tabs */}
      <PageContainer className="py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="graph" className="gap-2">
                <GitMerge size={14} />
                {t("project.preview.tab.graph")}
              </TabsTrigger>
              <TabsTrigger value="overview" className="gap-2">
                <Info size={14} />
                {t("project.preview.tab.overview")}
              </TabsTrigger>
              <TabsTrigger value="branches" className="gap-2">
                <GitBranch size={14} />
                {t("project.preview.tab.branches")}
              </TabsTrigger>
              {canLoadAuthedData && isOwner && (
                <TabsTrigger value="fork_requests" className="gap-2">
                  <GitFork size={14} />
                  {t("project.preview.tab.forkRequests")}
                </TabsTrigger>
              )}
              {canLoadAuthedData && (
                <TabsTrigger value="mrs" className="gap-2">
                  <GitMerge size={14} className="rotate-180" />
                  {t("project.preview.tab.mrs")}
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="graph">
            <div className="h-[600px] rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              {projectId && (
                <GitGraph
                  projectId={projectId}
                  canForkFromCommit={accessSnapshot.canForkFromCommit}
                  canMoveBoundaryFromCommit={accessSnapshot.canMoveBoundaryFromCommit}
                  moveBoundaryDeniedReason={
                    accessSnapshot.canMoveBoundaryFromCommit
                      ? undefined
                      : t(moveBoundaryPermissionReasonKey)
                  }
                  actionSurface="project_preview"
                  accessSnapshot={accessSnapshot}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="overview">
            <Card>
              <CardContent className="pt-6">
                <div className="prose dark:prose-invert max-w-none">
                  <h3>{t("project.preview.details.title")}</h3>
                  <p>{project.description || t("projects.desc.none")}</p>
                  
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">{t("project.preview.info.title")}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-1 border-b border-border/50 gap-4">
                          <span className="text-muted-foreground shrink-0">{t("project.id")}</span>
                          <span className="font-mono truncate">{project.id}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/50 gap-4">
                          <span className="text-muted-foreground shrink-0">{t("project.preview.created")}</span>
                          <span className="truncate">{mounted ? new Date(project.created_at).toLocaleString() : ""}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/50 gap-4">
                          <span className="text-muted-foreground shrink-0">{t("projects.visibility")}</span>
                          <span className="truncate">{project.is_public ? t("projects.public") : t("projects.private")}</span>
                        </div>
                      </div>
                    </div>
                    
                    {project.parent_project_id && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">{t("project.preview.forkedFrom")}</h4>
                        <Link 
                          href={`/project/${project.parent_project_id}`}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                        >
                          <div className="bg-secondary p-2 rounded-md">
                            <GitFork size={20} />
                          </div>
                          <div>
                            <div className="font-medium">{t("project.preview.originalProject")}</div>
                            <div className="text-xs text-muted-foreground font-mono">#{project.parent_project_id.slice(0, 8)}</div>
                          </div>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branches">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{t("project.preview.activeBranches")}</h3>
                    <div className="flex items-center gap-2">
                      {!isOwner && myParticipatedBranches.length > 0 ? (
                        <Button
                          size="sm"
                          variant={showOnlyMyParticipatedBranches ? "primary" : "secondary"}
                          onClick={() => setShowOnlyMyParticipatedBranches((prev) => !prev)}
                        >
                          {showOnlyMyParticipatedBranches
                            ? t("project.preview.showAllBranches")
                            : t("project.preview.showMyBranchesOnly")}
                        </Button>
                      ) : null}
                      <Badge variant="outline">
                        {t("project.preview.branchesCount").replace("{count}", String(visibleBranchOptions.length))}
                      </Badge>
                    </div>
                  </div>
                  
                  {branchesQuery.isLoading ? (
                    <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>
                  ) : visibleBranchOptions.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      {showOnlyMyParticipatedBranches
                        ? t("project.preview.myBranchesEmpty")
                        : t("mr.branches.empty")}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {visibleBranchOptions.map((b) => (
                        <div key={b.id} className="flex flex-col gap-0 rounded-lg border border-border bg-card overflow-hidden hover:bg-secondary/10 transition-colors">
                          <div className="flex items-center justify-between p-4 pb-2">
                            <div className="flex items-center gap-3">
                              <GitBranch size={18} className="text-muted-foreground" />
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {b.name}
                                  {b.name === "main" && <Badge className="text-[10px] h-5">{t("project.preview.defaultBranch")}</Badge>}
                                  {myParticipatedBranchSet.has(b.name) ? (
                                    <Badge variant="outline" className="text-[10px] h-5 border-primary/40 text-primary">
                                      {t("project.preview.myBranch")}
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {b.description || t("projects.desc.none")}
                                </div>
                                {/* Branch Tags & Stats */}
                                <div className="flex flex-wrap gap-2 mt-1.5">
                                  {(b.tags || []).map(tag => (
                                    <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-primary/20 text-primary">
                                      {tag}
                                    </Badge>
                                  ))}
                                  <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 bg-secondary/30 px-1.5 rounded">
                                    <span>{t("project.preview.coverage")}:</span>
                                    <span className="font-bold text-foreground">{(b as any).project_percent}%</span>
                                  </div>
                                  <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 bg-secondary/30 px-1.5 rounded">
                                    <span>{t("project.preview.commits")}:</span>
                                    <span className="font-bold text-foreground">{(b as any).commit_count}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {myParticipatedBranchSet.has(b.name) ? (
                                <LinkButton
                                  href={`/editor/${project.id}?branch=${encodeURIComponent(b.name)}`}
                                  size="sm"
                                  variant="secondary"
                                  className="h-8 px-2 text-xs"
                                >
                                  {t("project.preview.openBranch")}
                                </LinkButton>
                              ) : null}
                              {canLoadAuthedData && b.name !== "main" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setMrSourceBranch(b.name);
                                    setMrTitle(`${t("mr.titlePrefix")} ${b.name} → main`);
                                    setActiveTab("mrs");
                                  }}
                                >
                                  {t("mr.create")}
                                </Button>
                              )}
                              <div className="text-xs font-mono text-muted-foreground px-2 py-1 bg-secondary rounded">
                                {b.head_commit_id ? b.head_commit_id.slice(0, 7) : t("project.preview.noCommits")}
                              </div>
                            </div>
                          </div>
                          {/* Contributors Stats */}
                          {(b as any).contributors && (b as any).contributors.length > 0 && (
                            <div className="mt-1 px-4 pb-4">
                              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                <span>{t("project.preview.topContributors")}</span>
                                <div className="h-px flex-1 bg-border/50" />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {(b as any).contributors.slice(0, 12).map((c: any) => (
                                  <div key={c.name} className="flex items-center gap-2 text-xs group/contrib bg-secondary/10 p-2 rounded border border-border/30 hover:border-primary/20 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 border border-primary/20">
                                      {c.name.slice(0, 1).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-center mb-0.5">
                                        <span className="font-medium truncate mr-1" title={c.name}>{c.name}</span>
                                        <span className="text-muted-foreground font-mono text-[10px]">{c.percent}%</span>
                                      </div>
                                      <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-500" 
                                          style={{ width: `${c.percent}%` }} 
                                        />
                                      </div>
                                      <div className="text-[10px] text-muted-foreground mt-1 flex justify-between">
                                        <span>{t("project.preview.commitsShort").replace("{count}", String(c.count))}</span>
                                        <span>{t("project.preview.pointsShort").replace("{count}", String(Math.floor(c.score)))}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {canLoadAuthedData && isOwner && (
            <TabsContent value="fork_requests">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{t("project.forkRequests.title")}</h3>
                      <Badge variant="outline">
                        {t("project.forkRequests.pendingCount").replace(
                          "{count}",
                          String((forkRequestsQuery.data || []).length),
                        )}
                      </Badge>
                    </div>

                    {forkRequestsQuery.isLoading ? (
                      <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>
                    ) : forkRequestsQuery.isError ? (
                      <div className="py-8 text-center text-destructive">
                        {forkRequestsQuery.error instanceof Error
                          ? forkRequestsQuery.error.message
                          : t("project.forkRequests.loadFailed")}
                      </div>
                    ) : (forkRequestsQuery.data || []).length === 0 ? (
                      <EmptyState
                        title={t("project.forkRequests.empty.title")}
                        description={t("project.forkRequests.empty.desc")}
                        icon={<GitFork size={48} className="text-muted-foreground opacity-50" />}
                      />
                    ) : (
                      <div className="space-y-3">
                        {(forkRequestsQuery.data || []).map((request) => (
                          <div
                            key={request.id}
                            className="rounded-lg border border-border p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                          >
                            <div className="min-w-0 space-y-1.5">
                              <div className="text-xs text-muted-foreground font-mono">#{request.id.slice(0, 8)}</div>
                              <div className="text-sm">
                                {t("project.forkRequests.requester")}:{" "}
                                <span className="font-mono text-foreground">{request.requester_id}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {t("project.forkRequests.commit")}:{" "}
                                <span className="font-mono text-foreground">
                                  {request.commit_hash ? request.commit_hash.slice(0, 12) : t("project.forkRequests.head")}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => approveForkRequestMutation.mutate(request.id)}
                                loading={approveForkRequestMutation.isPending}
                                disabled={rejectForkRequestMutation.isPending}
                              >
                                {t("project.forkRequests.approve")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => rejectForkRequestMutation.mutate(request.id)}
                                loading={rejectForkRequestMutation.isPending}
                                disabled={approveForkRequestMutation.isPending}
                              >
                                {t("project.forkRequests.reject")}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {canLoadAuthedData && (
            <TabsContent value="mrs">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{t("mr.title")}</h3>
                        </div>

                        {mrsQuery.isLoading ? (
                          <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>
                        ) : (mrsQuery.data || []).length === 0 ? (
                          <EmptyState 
                            title={t("mr.empty")} 
                            description={t("project.preview.mr.emptyDesc")}
                            icon={<GitMerge size={48} className="text-muted-foreground opacity-50" />}
                          />
                        ) : (
                          <div className="space-y-3">
                            {(mrsQuery.data || []).map((mr) => {
                              const status = String(mr.status || "").toLowerCase();
                              const canAct = isOwner && status === "open";
                              return (
                                <div key={mr.id} className="group rounded-lg border border-border p-4 hover:border-primary/50 transition-colors">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge variant={status === "open" ? "default" : status === "merged" ? "secondary" : "outline"}>
                                          {getMrStatusLabel(status)}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground font-mono">#{mr.id.slice(0,8)}</span>
                                      </div>
                                      <h4 className="text-base font-medium truncate">{mr.title || t("project.preview.mr.untitled")}</h4>
                                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                        <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-xs">{mr.source_branch_name}</span>
                                        <span>→</span>
                                        <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-xs">{mr.target_branch_name}</span>
                                      </div>
                                    </div>
                                    
                                    {canAct && (
                                      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="sm" variant="primary" loading={mergeMrMutation.isPending} onClick={() => mergeMrMutation.mutate(mr.id)}>
                                          {t("mr.merge")}
                                        </Button>
                                        <Button size="sm" variant="ghost" loading={closeMrMutation.isPending} onClick={() => closeMrMutation.mutate(mr.id)}>
                                          {t("mr.close")}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <h3 className="font-semibold text-sm">{t("mr.create")}</h3>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">{t("mr.form.source")}</label>
                          <Input value={mrSourceBranch} onChange={(e) => setMrSourceBranch(e.target.value)} placeholder={t("mr.form.sourcePlaceholder")} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">{t("mr.form.title")}</label>
                          <Input value={mrTitle} onChange={(e) => setMrTitle(e.target.value)} placeholder={t("mr.form.titlePlaceholder")} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">{t("mr.form.desc")}</label>
                          <Textarea
                            value={mrDescription}
                            onChange={(e) => setMrDescription(e.target.value)}
                            placeholder={t("mr.form.descPlaceholder")}
                            className="min-h-[100px]"
                          />
                        </div>
                        <Button
                          className="w-full"
                          loading={createMrMutation.isPending}
                          disabled={!mrSourceBranch.trim()}
                          onClick={handleCreateMr}
                        >
                          {t("mr.create")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </PageContainer>
    </div>
  );
}
