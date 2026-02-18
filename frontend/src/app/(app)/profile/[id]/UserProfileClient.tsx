"use client";

import { useEffect, useMemo } from "react";
import ProjectCard from "@/components/ProjectCard";
import { User } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import SectionHeader from "@/components/layout/SectionHeader";
import LoadingState from "@/components/states/LoadingState";
import EmptyState from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import FractalTree from "@/components/ui/fractal-tree";
import { useUserProfile } from "@/lib/queries/useUserProfile";
import { useMe } from "@/lib/queries/useMe";
import { useI18n } from "@/lib/i18nContext";
import { useQuery } from "@tanstack/react-query";
import { projectApi } from "@/lib/api";

export default function UserProfileClient({ userId }: { userId: string }) {
  const { t } = useI18n();
  const { userQuery, projectsQuery } = useUserProfile(userId);
  const meQuery = useMe();
  const branchParticipationsQuery = useQuery({
    queryKey: ["branchParticipations"],
    queryFn: () => projectApi.getBranchParticipations(),
    enabled: typeof meQuery.data?.id === "string" && meQuery.data.id.length > 0,
  });

  useEffect(() => {
    if (!userQuery.isError) return;
    const message = userQuery.error instanceof Error ? userQuery.error.message : t("profile.toast.loadFailed.title");
    toast({ title: t("profile.toast.loadFailed.title"), description: message, variant: "destructive" });
  }, [t, userQuery.error, userQuery.isError]);

  useEffect(() => {
    if (!projectsQuery.isError) return;
    const message = projectsQuery.error instanceof Error ? projectsQuery.error.message : t("profile.toast.projectsLoadFailed.title");
    toast({ title: t("profile.toast.projectsLoadFailed.title"), description: message, variant: "destructive" });
  }, [projectsQuery.error, projectsQuery.isError, t]);

  const user = userQuery.data || null;
  const projects = projectsQuery.data || [];
  const participatedBranchMap = useMemo(() => {
    const map = new Map<string, string[]>();
    (branchParticipationsQuery.data || []).forEach((item) => {
      const names = (item.participated_branch_names || []).filter((name) => typeof name === "string" && name.length > 0);
      if (names.length > 0) {
        map.set(item.id, names);
      }
    });
    return map;
  }, [branchParticipationsQuery.data]);

  if (userQuery.isLoading || projectsQuery.isLoading) {
    return <LoadingState label={t("profile.loading")} />;
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-64px)] py-8">
        <PageContainer>
          <EmptyState title={t("profile.notFound.title")} description={t("profile.notFound.desc")} />
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] py-8 relative">
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
      <PageContainer>
        <div className="mb-8">
          <SectionHeader title={user.full_name || user.email.split("@")[0]} subtitle={t("profile.creatorSubtitle")} />
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <User size={40} />
              </div>
              <div>
                <div className="text-lg font-semibold text-card-foreground">{t("profile.publicProjects.title")}</div>
                <div className="text-sm text-muted-foreground">{t("profile.publicProjects.desc")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {projects.length === 0 ? (
          <EmptyState
            title={t("profile.empty.title")}
            description={t("profile.empty.desc")}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                viewerId={meQuery.data?.id || null}
                participatedBranchNames={participatedBranchMap.get(project.id) || null}
              />
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
