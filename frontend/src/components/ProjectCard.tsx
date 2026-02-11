"use client";

import Link from "next/link";
import { projectApi } from "@/lib/api";
import { useState } from "react";
import { Heart, GitFork, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import IconButton from "@/components/ui/icon-button";
import { Card } from "@/components/ui/card";

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
  const router = useRouter();
  const { toast } = useToast();
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
        toast({ title: "Like failed", description: "Please try again.", variant: "destructive" });
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
          toast({ title: "Forked", description: "Opening editor...", variant: "success" });
          router.push(`/editor/${res.data.id}`);
      } catch (err) {
          toast({ title: "Fork failed", description: "Check permissions and try again.", variant: "destructive" });
      }
  };

  return (
    <Card className="overflow-hidden transition-colors hover:bg-card/70">
      <div className="h-40 bg-secondary relative">
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <span className="text-4xl font-bold opacity-20">VID</span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <Link href={`/editor/${project.id}`} className="hover:text-primary transition-colors">
            <h3 className="font-semibold text-lg text-card-foreground truncate">{project.name}</h3>
          </Link>
        </div>

        <p className="text-sm text-muted-foreground mb-4 h-10 overflow-hidden line-clamp-2">
          {project.description || "No description provided."}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
          <div className="flex items-center space-x-2">
            <UserIcon size={14} />
            <span>{project.owner.full_name || project.owner.email.split("@")[0]}</span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={handleLike}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
                project.is_liked ? "text-pink-500" : "hover:text-pink-500"
              }`}
              aria-label="Like project"
            >
              <Heart size={14} fill={project.is_liked ? "currentColor" : "none"} />
              <span>{project.likes_count}</span>
            </button>

            <IconButton onClick={handleFork} aria-label="Fork project" title="Fork this project">
              <GitFork size={14} />
            </IconButton>
          </div>
        </div>
      </div>
    </Card>
  );
}
