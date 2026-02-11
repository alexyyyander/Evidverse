"use client";

import { useEffect, useState } from "react";
import { projectApi, userApi } from "@/lib/api";
import ProjectCard from "@/components/ProjectCard";
import { Loader2, User } from "lucide-react";
import { useParams } from "next/navigation";

export default function UserProfilePage() {
  const { id } = useParams();
  const userId = Number(id);
  
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        const [userRes, projectsRes] = await Promise.all([
            userApi.get(userId),
            projectApi.getUserProjects(userId)
        ]);
        setUser(userRes.data);
        setProjects(projectsRes.data);
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (!user) {
      return (
          <div className="text-center py-20 text-slate-500">
              User not found.
          </div>
      )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center space-x-4 mb-8 p-6 bg-slate-900 rounded-lg border border-slate-800">
         <div className="h-20 w-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
            <User size={40} />
         </div>
         <div>
            <h1 className="text-2xl font-bold text-white">{user.full_name || user.email.split('@')[0]}</h1>
            <p className="text-slate-400">Vidgit Creator</p>
         </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Public Projects</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-lg border border-slate-800 border-dashed">
            <p className="text-slate-500">No public projects found.</p>
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
