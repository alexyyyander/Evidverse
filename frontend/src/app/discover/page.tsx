"use client";

import { useEffect, useState } from "react";
import { projectApi, type ProjectFeedItem } from "@/lib/api";
import ProjectCard from "@/components/ProjectCard";
import PageContainer from "@/components/layout/PageContainer";
import SectionHeader from "@/components/layout/SectionHeader";
import LoadingState from "@/components/states/LoadingState";
import EmptyState from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";

export default function DiscoverPage() {
  const [projects, setProjects] = useState<ProjectFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await projectApi.getFeed();
        setProjects(res);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load feed";
        toast({ title: "Failed to load discover", description: message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, []);

  if (loading) {
    return <LoadingState label="Loading Discover..." />;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] py-8">
      <PageContainer>
        <div className="mb-8">
          <SectionHeader title="Discover" subtitle="Explore projects from the Vidgit community." />
        </div>

        {projects.length === 0 ? (
          <EmptyState title="It&apos;s quiet here..." description="Be the first to share a project!" />
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
