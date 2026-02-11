"use client";

import { useEffect, useState } from "react";
import { projectApi } from "@/lib/api";
import ProjectCard from "@/components/ProjectCard";
import PageContainer from "@/components/layout/PageContainer";
import SectionHeader from "@/components/layout/SectionHeader";
import LoadingState from "@/components/states/LoadingState";
import EmptyState from "@/components/ui/empty-state";

export default function DiscoverPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await projectApi.getFeed();
        setProjects(res.data);
      } catch (err) {
        console.error("Failed to load feed", err);
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
