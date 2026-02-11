"use client";

import { useEffect, useState } from "react";
import { projectApi } from "@/lib/api";
import ProjectCard from "@/components/ProjectCard";
import { Loader2 } from "lucide-react";

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
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Discover</h1>
        <p className="text-slate-400">Explore projects from the Vidgit community.</p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-slate-900 rounded-lg border border-slate-800">
            <h3 className="text-xl text-slate-300 mb-2">It's quiet here...</h3>
            <p className="text-slate-500">Be the first to share a project!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
            ))}
        </div>
      )}
    </div>
  );
}
