"use client";

import Link from "next/link";
import { projectApi, type ProjectFeedItem } from "@/lib/api";
import { useState } from "react";
import { Copy, Heart, GitFork, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import IconButton from "@/components/ui/icon-button";
import { Card } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useI18n } from "@/lib/i18nContext";

interface ProjectCardProps {
  project: ProjectFeedItem;
  viewerId?: string | null;
}

export default function ProjectCard({ project: initialProject, viewerId }: ProjectCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [project, setProject] = useState(initialProject);
  const queryClient = useQueryClient();
  const isOwner = typeof viewerId === "string" && !!project.owner?.id && project.owner.id === viewerId;
  const primaryHref = isOwner ? `/editor/${project.id}` : `/project/${project.id}`;

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: `${label} copied to clipboard.`, variant: "success" });
    } catch {
      window.prompt(`Copy ${label}:`, text);
    }
  };

  const likeMutation = useMutation({
    mutationFn: async () => projectApi.toggleLike(project.id),
    onMutate: async () => {
      const previousProject = project;
      setProject((prev) => {
        const nextLiked = !prev.is_liked;
        return {
          ...prev,
          is_liked: nextLiked,
          likes_count: nextLiked ? prev.likes_count + 1 : Math.max(0, prev.likes_count - 1),
        };
      });
      return { previousProject };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previousProject) setProject(ctx.previousProject);
      toast({ title: "Like failed", description: "Please try again.", variant: "destructive" });
    },
    onSuccess: (isLikedNow) => {
      setProject((prev) => ({ ...prev, is_liked: isLikedNow }));
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      if (project.owner?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userProjects(project.owner.id) });
      }
    },
  });

  const forkMutation = useMutation({
    mutationFn: async () => projectApi.forkBranch(project.id),
    onSuccess: (newBranch) => {
      toast({ title: "Forked", description: "Opening editor...", variant: "success" });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      const branch = encodeURIComponent(newBranch.name);
      router.push(`/editor/${project.id}?branch=${branch}`);
    },
    onError: () => {
      toast({ title: "Fork failed", description: "Check permissions and try again.", variant: "destructive" });
    },
  });

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (likeMutation.isPending) return;
    likeMutation.mutate();
  };

  const handleFork = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if(!confirm(`Fork project "${project.name}"?`)) return;
      
      if (forkMutation.isPending) return;
      forkMutation.mutate();
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
          <Link href={primaryHref} className="hover:text-primary transition-colors">
            <h3 className="font-semibold text-lg text-card-foreground truncate">{project.name}</h3>
          </Link>
        </div>

        <p className="text-sm text-muted-foreground mb-4 h-10 overflow-hidden line-clamp-2">
          {project.description || "No description provided."}
        </p>

        {Array.isArray(project.tags) && project.tags.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {project.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
          <div className="flex items-center space-x-2">
            <UserIcon size={14} />
            <span>{project.owner?.full_name || project.owner?.email?.split("@")[0] || t("common.unknown")}</span>
            {project.parent_project_id ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  copyText(String(project.parent_project_id), "Parent Project ID");
                }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:text-foreground"
                aria-label="Copy parent project ID"
                title="Copy Parent ID"
              >
                <span>Parent #{project.parent_project_id}</span>
                <Copy size={14} />
              </button>
            ) : null}
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                copyText(String(project.id), "Project ID");
              }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:text-foreground"
              aria-label="Copy project ID"
              title="Copy ID"
            >
              <span>#{project.id}</span>
              <Copy size={14} />
            </button>
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
