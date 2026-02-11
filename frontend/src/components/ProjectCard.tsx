"use client";

import Link from "next/link";
import { projectApi } from "@/lib/api";
import { useState } from "react";
import { Heart, GitFork, User as UserIcon } from "lucide-react";

interface Project {
  id: number;
  name: string;
  description?: string;
  owner: { id: number; email: string; full_name?: string };
  likes_count: number;
  is_liked: boolean;
  created_at: string;
}

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project: initialProject }: ProjectCardProps) {
  const [project, setProject] = useState(initialProject);
  const [loading, setLoading] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    
    setLoading(true);
    try {
        const res = await projectApi.toggleLike(project.id);
        const isLikedNow = res.data;
        setProject(prev => ({
            ...prev,
            is_liked: isLikedNow,
            likes_count: isLikedNow ? prev.likes_count + 1 : prev.likes_count - 1
        }));
    } catch (err) {
        console.error("Failed to like project", err);
    } finally {
        setLoading(false);
    }
  };

  const handleFork = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if(!confirm(`Fork project "${project.name}"?`)) return;
      
      try {
          const res = await projectApi.fork(project.id);
          window.location.href = `/editor/${res.data.id}`;
      } catch (err) {
          alert("Failed to fork project");
      }
  };

  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-800 hover:border-indigo-500 transition-all group">
      {/* Thumbnail Placeholder */}
      <div className="h-40 bg-slate-800 relative">
         <div className="absolute inset-0 flex items-center justify-center text-slate-600">
            <span className="text-4xl font-bold opacity-20">VID</span>
         </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
            <Link href={`/editor/${project.id}`} className="hover:text-indigo-400 transition-colors">
                <h3 className="font-bold text-lg text-white truncate">{project.name}</h3>
            </Link>
        </div>
        
        <p className="text-sm text-slate-400 mb-4 h-10 overflow-hidden line-clamp-2">
            {project.description || "No description provided."}
        </p>

        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800 pt-3">
            <div className="flex items-center space-x-2">
                 <UserIcon size={14} />
                 <span>{project.owner.full_name || project.owner.email.split('@')[0]}</span>
            </div>
            
            <div className="flex items-center space-x-3">
                 <button 
                    onClick={handleLike}
                    className={`flex items-center space-x-1 transition-colors ${project.is_liked ? "text-pink-500" : "hover:text-pink-500"}`}
                 >
                    <Heart size={14} fill={project.is_liked ? "currentColor" : "none"} />
                    <span>{project.likes_count}</span>
                 </button>
                 
                 <button 
                    onClick={handleFork}
                    className="flex items-center space-x-1 hover:text-indigo-500 transition-colors"
                    title="Fork this project"
                 >
                    <GitFork size={14} />
                 </button>
            </div>
        </div>
      </div>
    </div>
  );
}
