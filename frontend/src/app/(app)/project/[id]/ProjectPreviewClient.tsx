"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/layout/PageContainer";
import SectionHeader from "@/components/layout/SectionHeader";
import LoadingState from "@/components/states/LoadingState";
import EmptyState from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import Button from "@/components/ui/button";
import LinkButton from "@/components/ui/link-button";
import { toast } from "@/components/ui/toast";
import { projectApi } from "@/lib/api";
import { usePublicProject } from "@/lib/queries/usePublicProject";
import { useMe } from "@/lib/queries/useMe";
import { useAuthToken } from "@/lib/auth/useAuthToken";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useI18n } from "@/lib/i18nContext";

export default function ProjectPreviewClient({ projectId }: { projectId: string | null }) {
  const router = useRouter();
  const token = useAuthToken();
  const meQuery = useMe();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const projectQuery = usePublicProject(projectId);

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
      </PageContainer>
    </div>
  );
}
