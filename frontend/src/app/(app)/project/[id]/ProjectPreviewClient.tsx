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
import { mergeRequestsApi, projectApi } from "@/lib/api";
import { usePublicProject } from "@/lib/queries/usePublicProject";
import { useMe } from "@/lib/queries/useMe";
import { useAuthToken } from "@/lib/auth/useAuthToken";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useI18n } from "@/lib/i18nContext";
import GitGraph from "@/components/GitGraph";
import { GitFork, Heart, Eye, Play, User as UserIcon, Calendar, Info, GitMerge, GitBranch } from "lucide-react";
import { cn } from "@/lib/cn";

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
  
  const canLoadAuthedData = typeof token === "string" && token.length > 0 && typeof projectId === "string" && projectId.length > 0;

  const forkMutation = useMutation({
    mutationFn: async () => projectApi.fork(projectId as string),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      toast({ title: t("project.forked.title"), description: t("project.forked.desc"), variant: "success" });
      router.push(`/editor/${newProject.id}`);
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : "Failed to fork project";
      toast({ title: t("project.forkFailed.title"), description: message, variant: "destructive" });
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
    const message = projectQuery.error instanceof Error ? projectQuery.error.message : "Failed to load project";
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

  // Try to fetch HEAD of main branch to get preview video
  const headQuery = useQuery({
    queryKey: ["projectHead", projectId],
    queryFn: () => projectApi.getWorkspace(projectId as string, { branch_name: "main" }), // Re-using getWorkspace as proxy or getHead if available
    enabled: !!projectId,
    retry: false
  });

  const branchOptions = useMemo(() => {
    const branches = branchesQuery.data || [];
    return branches
      .slice()
      .sort((a, b) => (a.name === "main" ? -1 : b.name === "main" ? 1 : a.name.localeCompare(b.name)));
  }, [branchesQuery.data]);

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

  const viewerId = meQuery.data?.id || null;
  const isOwner = typeof viewerId === "string" && !!project.owner?.id && project.owner.id === viewerId;

  // Placeholder video logic - in real app, check commit assets
  const hasPreviewVideo = false; 

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      {/* Hero Section */}
      <div className="border-b border-border bg-card/30">
        <PageContainer>
          <div className="py-8 flex flex-col md:flex-row gap-8">
            {/* Left: Preview */}
            <div className="w-full md:w-7/12 aspect-video bg-black/50 rounded-lg overflow-hidden relative shadow-lg border border-border/50 flex items-center justify-center group">
              {hasPreviewVideo ? (
                <div className="text-white">Video Player Placeholder</div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors">
                  <div className="w-16 h-16 rounded-full bg-background/20 flex items-center justify-center backdrop-blur-sm">
                    <Play size={32} fill="currentColor" className="ml-1 opacity-80" />
                  </div>
                  <div className="text-sm font-medium">No preview video available</div>
                </div>
              )}
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                 <div className="text-white/80 text-xs font-mono">HEAD: main</div>
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
                      {project.owner?.full_name || project.owner?.email?.split("@")[0] || "Unknown"}
                    </span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
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
                  <span className="text-xs text-muted-foreground">Likes</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background">
                  <GitFork size={16} className="text-muted-foreground" />
                  <span className="font-semibold">-</span>
                  <span className="text-xs text-muted-foreground">Forks</span>
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
              <div className="flex gap-3 mt-auto pt-4">
                {isOwner ? (
                  <LinkButton href={`/editor/${project.id}`} size="lg" className="flex-1">
                    {t("project.openEditor")}
                  </LinkButton>
                ) : (
                  <>
                    <Button 
                      size="lg" 
                      className="flex-1"
                      loading={forkMutation.isPending} 
                      onClick={() => forkMutation.mutate()}
                      disabled={!token}
                    >
                      <GitFork size={16} className="mr-2" />
                      {t("project.forkEdit")}
                    </Button>
                    {!token && (
                      <LinkButton href={`/login?next=${encodeURIComponent(`/project/${project.id}`)}`} variant="secondary" size="lg">
                        {t("auth.login")}
                      </LinkButton>
                    )}
                  </>
                )}
                <Button 
                  size="lg" 
                  variant="outline" 
                  className={cn("px-4", project.is_liked && "border-pink-500/50 bg-pink-500/5 text-pink-500")}
                  onClick={() => likeMutation.mutate()}
                  disabled={!token}
                >
                  <Heart size={20} fill={project.is_liked ? "currentColor" : "none"} />
                </Button>
              </div>
            </div>
          </div>
        </PageContainer>
      </div>

      {/* Content Tabs */}
      <PageContainer className="py-8">
        <Tabs defaultValue="graph">
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="graph" className="gap-2">
                <GitMerge size={14} />
                History & Graph
              </TabsTrigger>
              <TabsTrigger value="overview" className="gap-2">
                <Info size={14} />
                Overview
              </TabsTrigger>
              <TabsTrigger value="branches" className="gap-2">
                <GitBranch size={14} />
                Branches
              </TabsTrigger>
              {canLoadAuthedData && (
                <TabsTrigger value="mrs" className="gap-2">
                  <GitMerge size={14} className="rotate-180" />
                  Merge Requests
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="graph">
            <div className="h-[600px] rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              {projectId && <GitGraph projectId={projectId} />}
            </div>
          </TabsContent>

          <TabsContent value="overview">
            <Card>
              <CardContent className="pt-6">
                <div className="prose dark:prose-invert max-w-none">
                  <h3>Project Details</h3>
                  <p>{project.description || "No description provided."}</p>
                  
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Project Info</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">ID</span>
                          <span className="font-mono">{project.id}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Created</span>
                          <span>{new Date(project.created_at).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Visibility</span>
                          <span>{project.is_public ? "Public" : "Private"}</span>
                        </div>
                      </div>
                    </div>
                    
                    {project.parent_project_id && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Forked From</h4>
                        <Link 
                          href={`/project/${project.parent_project_id}`}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                        >
                          <div className="bg-secondary p-2 rounded-md">
                            <GitFork size={20} />
                          </div>
                          <div>
                            <div className="font-medium">Original Project</div>
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
                    <h3 className="font-semibold">Active Branches</h3>
                    <Badge variant="outline">{branchOptions.length} branches</Badge>
                  </div>
                  
                  {branchesQuery.isLoading ? (
                    <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>
                  ) : branchOptions.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">{t("mr.branches.empty")}</div>
                  ) : (
                    <div className="grid gap-3">
                      {branchOptions.map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-secondary/20 transition-colors">
                          <div className="flex items-center gap-3">
                            <GitBranch size={18} className="text-muted-foreground" />
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {b.name}
                                {b.name === "main" && <Badge className="text-[10px] h-5">Default</Badge>}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {b.description || "No description"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {canLoadAuthedData && b.name !== "main" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setMrSourceBranch(b.name);
                                  setMrTitle(`${t("mr.titlePrefix")} ${b.name} → main`);
                                  const tabTrigger = document.querySelector('[value="mrs"]') as HTMLButtonElement;
                                  if(tabTrigger) tabTrigger.click();
                                }}
                              >
                                Create MR
                              </Button>
                            )}
                            <div className="text-xs font-mono text-muted-foreground px-2 py-1 bg-secondary rounded">
                              {b.head_commit_id ? b.head_commit_id.slice(0, 7) : "No commits"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {canLoadAuthedData && (
            <TabsContent value="mrs">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Merge Requests</h3>
                        </div>

                        {mrsQuery.isLoading ? (
                          <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>
                        ) : (mrsQuery.data || []).length === 0 ? (
                          <EmptyState 
                            title={t("mr.empty")} 
                            description="Create a merge request to merge changes from one branch to another."
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
                                          {status}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground font-mono">#{mr.id.slice(0,8)}</span>
                                      </div>
                                      <h4 className="text-base font-medium truncate">{mr.title || "Untitled Merge Request"}</h4>
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
                          <Input value={mrSourceBranch} onChange={(e) => setMrSourceBranch(e.target.value)} placeholder="e.g. feature/new-scene" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">{t("mr.form.title")}</label>
                          <Input value={mrTitle} onChange={(e) => setMrTitle(e.target.value)} placeholder="Short title" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">{t("mr.form.desc")}</label>
                          <Textarea
                            value={mrDescription}
                            onChange={(e) => setMrDescription(e.target.value)}
                            placeholder="Describe changes..."
                            className="min-h-[100px]"
                          />
                        </div>
                        <Button
                          className="w-full"
                          loading={createMrMutation.isPending}
                          disabled={!mrSourceBranch.trim()}
                          onClick={() => createMrMutation.mutate()}
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
