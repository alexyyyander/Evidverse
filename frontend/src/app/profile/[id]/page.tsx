"use client";

import { useEffect } from "react";
import ProjectCard from "@/components/ProjectCard";
import { User } from "lucide-react";
import PageContainer from "@/components/layout/PageContainer";
import SectionHeader from "@/components/layout/SectionHeader";
import LoadingState from "@/components/states/LoadingState";
import EmptyState from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { useUserProfile } from "@/lib/queries/useUserProfile";

export default function UserProfilePage({ params }: { params: { id: string } }) {
  const userId = Number(params.id);
  
  const { userQuery, projectsQuery } = useUserProfile(userId);

  useEffect(() => {
    if (!userQuery.isError) return;
    const message = userQuery.error instanceof Error ? userQuery.error.message : "Failed to load profile";
    toast({ title: "Failed to load profile", description: message, variant: "destructive" });
  }, [userQuery.error, userQuery.isError]);

  useEffect(() => {
    if (!projectsQuery.isError) return;
    const message = projectsQuery.error instanceof Error ? projectsQuery.error.message : "Failed to load projects";
    toast({ title: "Failed to load projects", description: message, variant: "destructive" });
  }, [projectsQuery.error, projectsQuery.isError]);

  if (userQuery.isLoading || projectsQuery.isLoading) {
    return <LoadingState label="Loading profile..." />;
  }

  const user = userQuery.data || null;
  const projects = projectsQuery.data || [];

  if (!user) {
      return (
          <div className="min-h-[calc(100vh-64px)] py-8">
            <PageContainer>
              <EmptyState title="User not found" description="This profile does not exist or is not accessible." />
            </PageContainer>
          </div>
      )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] py-8">
      <PageContainer>
      <div className="mb-8">
        <SectionHeader
          title={user.full_name || user.email.split("@")[0]}
          subtitle="Vidgit Creator"
        />
      </div>

      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              <User size={40} />
            </div>
            <div>
              <div className="text-lg font-semibold text-card-foreground">Public Projects</div>
              <div className="text-sm text-muted-foreground">Projects shared by this creator.</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {projects.length === 0 ? (
        <EmptyState title="No public projects found" description="When this user shares projects, they will show up here." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
      </PageContainer>
    </div>
  );
}
