"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/layout/PageContainer";
import SectionHeader from "@/components/layout/SectionHeader";
import LoadingState from "@/components/states/LoadingState";
import EmptyState from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import Button from "@/components/ui/button";
import LinkButton from "@/components/ui/link-button";
import Textarea from "@/components/ui/textarea";
import Input from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { mergeRequestsApi, projectApi } from "@/lib/api";
import { usePublicProject } from "@/lib/queries/usePublicProject";
import { useMe } from "@/lib/queries/useMe";
import { useAuthToken } from "@/lib/auth/useAuthToken";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useI18n } from "@/lib/i18nContext";

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
      toast({ title: "Merge request created", description: mr.id, variant: "success" });
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : "Failed to create merge request";
      toast({ title: "Create MR failed", description: message, variant: "destructive" });
    },
  });

  const mergeMrMutation = useMutation({
    mutationFn: (mrId: string) => mergeRequestsApi.merge(mrId),
    onSuccess: async (mr) => {
      await queryClient.invalidateQueries({ queryKey: ["mergeRequests", projectId] });
      toast({ title: "Merged", description: mr.id, variant: "success" });
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : "Failed to merge";
      toast({ title: "Merge failed", description: message, variant: "destructive" });
    },
  });

  const closeMrMutation = useMutation({
    mutationFn: (mrId: string) => mergeRequestsApi.close(mrId),
    onSuccess: async (mr) => {
      await queryClient.invalidateQueries({ queryKey: ["mergeRequests", projectId] });
      toast({ title: "Closed", description: mr.id, variant: "success" });
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : "Failed to close";
      toast({ title: "Close failed", description: message, variant: "destructive" });
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

  return (
    <div className="min-h-[calc(100vh-64px)] py-8">
      <PageContainer>
        <div className="mb-8">
          <SectionHeader title={t("project.preview")} subtitle={project.name} />
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xl font-semibold text-card-foreground truncate">{project.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">{project.description || "-"}</div>
              </div>
              <div className="flex items-center gap-2">
                {isOwner ? (
                  <LinkButton href={`/editor/${project.id}`}>{t("project.openEditor")}</LinkButton>
                ) : typeof token === "string" && token.length > 0 ? (
                  <Button loading={forkMutation.isPending} onClick={() => forkMutation.mutate()}>
                    {t("project.forkEdit")}
                  </Button>
                ) : (
                  <LinkButton href={`/login?next=${encodeURIComponent(`/project/${project.id}`)}`} variant="secondary">
                    {t("auth.login")}
                  </LinkButton>
                )}
              </div>
            </div>

            {Array.isArray(project.tags) && project.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">{t("project.id")}</div>
                <div className="mt-1 font-medium text-foreground">#{project.id}</div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">{t("project.owner")}</div>
                <div className="mt-1 font-medium text-foreground">
                  {project.owner ? (
                    <Link href={`/profile/${project.owner.id}`} className="hover:underline">
                      {project.owner.full_name || project.owner.email.split("@")[0]}
                    </Link>
                  ) : (
                    "-"
                  )}
                </div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">{t("project.parent")}</div>
                <div className="mt-1 font-medium text-foreground">
                  {project.parent_project_id ? (
                    <Link href={`/project/${project.parent_project_id}`} className="hover:underline">
                      #{project.parent_project_id}
                    </Link>
                  ) : (
                    "-"
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {canLoadAuthedData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="text-sm font-medium text-foreground">Branches</div>
                {branchesQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                ) : branchesQuery.isError ? (
                  <div className="text-sm text-destructive">Failed to load branches</div>
                ) : branchOptions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No branches</div>
                ) : (
                  <div className="space-y-2">
                    {branchOptions.map((b) => (
                      <div key={b.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{b.name}</div>
                          {b.description ? <div className="text-xs text-muted-foreground truncate">{b.description}</div> : null}
                        </div>
                        {b.name !== "main" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setMrSourceBranch(b.name);
                              setMrTitle(`Merge ${b.name} → main`);
                            }}
                          >
                            Create MR
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="text-sm font-medium text-foreground">Merge Requests</div>

                <div className="space-y-2 rounded-md border border-border p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Source branch</div>
                      <Input value={mrSourceBranch} onChange={(e) => setMrSourceBranch(e.target.value)} placeholder="e.g. fork/you" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Target branch</div>
                      <Input value="main" disabled />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Title</div>
                    <Input value={mrTitle} onChange={(e) => setMrTitle(e.target.value)} placeholder="Optional title" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Description</div>
                    <Textarea value={mrDescription} onChange={(e) => setMrDescription(e.target.value)} placeholder="Optional description" className="min-h-[84px]" />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      loading={createMrMutation.isPending}
                      disabled={!mrSourceBranch.trim()}
                      onClick={() => createMrMutation.mutate()}
                    >
                      Create MR
                    </Button>
                  </div>
                </div>

                {mrsQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                ) : mrsQuery.isError ? (
                  <div className="text-sm text-destructive">Failed to load merge requests</div>
                ) : (mrsQuery.data || []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">No merge requests</div>
                ) : (
                  <div className="space-y-2">
                    {(mrsQuery.data || []).map((mr) => {
                      const status = String(mr.status || "").toLowerCase();
                      const canAct = isOwner && status === "open";
                      return (
                        <div key={mr.id} className="rounded-md border border-border p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs text-muted-foreground font-mono truncate">{mr.id}</div>
                              <div className="text-sm font-medium truncate">{mr.title || `${mr.source_branch_name} → ${mr.target_branch_name}`}</div>
                              {mr.description ? <div className="text-xs text-muted-foreground line-clamp-2">{mr.description}</div> : null}
                              <div className="mt-1 text-xs text-muted-foreground">
                                {mr.source_branch_name} → {mr.target_branch_name} · {status}
                              </div>
                            </div>
                            {canAct ? (
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="secondary" loading={mergeMrMutation.isPending} onClick={() => mergeMrMutation.mutate(mr.id)}>
                                  Merge
                                </Button>
                                <Button size="sm" variant="ghost" loading={closeMrMutation.isPending} onClick={() => closeMrMutation.mutate(mr.id)}>
                                  Close
                                </Button>
                              </div>
                            ) : null}
                          </div>
                          {Array.isArray(mr.merged_clip_ids) && mr.merged_clip_ids.length > 0 ? (
                            <div className="text-xs text-muted-foreground">merged clips: {mr.merged_clip_ids.length}</div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </PageContainer>
    </div>
  );
}
