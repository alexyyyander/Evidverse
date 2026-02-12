"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { projectApi } from "@/lib/api";
import PageContainer from "@/components/layout/PageContainer";
import SectionHeader from "@/components/layout/SectionHeader";
import Button from "@/components/ui/button";
import LinkButton from "@/components/ui/link-button";
import Dialog from "@/components/ui/dialog";
import Input from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import ErrorState from "@/components/ui/error-state";
import { toast } from "@/components/ui/toast";
import { useProjects } from "@/lib/queries/useProjects";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import IconButton from "@/components/ui/icon-button";
import { Copy, Pencil } from "lucide-react";

export default function ProjectsClient() {
  const router = useRouter();
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSourceId, setImportSourceId] = useState("");
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameProjectId, setRenameProjectId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useProjects();

  const forkMutation = useMutation({
    mutationFn: async (projectId: number) => projectApi.fork(projectId),
    onSuccess: (newProject) => {
      toast({ title: "Forked", description: "Opening editor...", variant: "success" });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      router.push(`/editor/${newProject.id}`);
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : "Failed to fork project";
      toast({ title: "Fork failed", description: message, variant: "destructive" });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async (payload: { projectId: number; name: string }) =>
      projectApi.update(payload.projectId, { name: payload.name }),
    onSuccess: () => {
      toast({ title: "Renamed", description: "Project name updated.", variant: "success" });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      setShowRenameModal(false);
      setRenameProjectId(null);
      setRenameValue("");
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : "Failed to rename project";
      toast({ title: "Rename failed", description: message, variant: "destructive" });
    },
  });

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: `${label} copied to clipboard.`, variant: "success" });
    } catch {
      window.prompt(`Copy ${label}:`, text);
    }
  };

  const handleImport = async () => {
    if (!importSourceId) return;
    forkMutation.mutate(Number(importSourceId));
    setShowImportModal(false);
  };

  const openRename = (projectId: number, currentName: string) => {
    setRenameProjectId(projectId);
    setRenameValue(currentName);
    setShowRenameModal(true);
  };

  const handleRename = async () => {
    if (!renameProjectId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    renameMutation.mutate({ projectId: renameProjectId, name: trimmed });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] py-8">
      <PageContainer className="h-full flex flex-col">
        <div className="mb-8">
          <SectionHeader
            title="My Projects"
            subtitle="Manage your projects and jump into the editor."
            right={
              <>
                <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                  Import / Fork
                </Button>
                <LinkButton href="/editor/new">Create Project</LinkButton>
              </>
            }
          />
        </div>

        {isError ? (
          <div className="mb-6">
            <ErrorState
              title="Projects unavailable"
              description={error instanceof Error ? error.message : "Failed to load projects"}
            />
          </div>
        ) : null}

        <Dialog
          open={showImportModal}
          onOpenChange={(open) => {
            setShowImportModal(open);
            if (!open) {
              setImportSourceId("");
            }
          }}
          title="Import Project"
          description="Enter the ID of the Vidgit project to fork."
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowImportModal(false)}>
                Cancel
              </Button>
              <Button loading={forkMutation.isPending} onClick={handleImport}>
                Fork Project
              </Button>
            </div>
          }
        >
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Source Project ID</div>
            <Input
              type="number"
              placeholder="e.g. 123"
              value={importSourceId}
              onChange={(e) => setImportSourceId(e.target.value)}
            />
          </div>
        </Dialog>

        <Dialog
          open={showRenameModal}
          onOpenChange={(open) => {
            setShowRenameModal(open);
            if (!open) {
              setRenameProjectId(null);
              setRenameValue("");
            }
          }}
          title="Rename Project"
          description="Update your project name."
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowRenameModal(false)}>
                Cancel
              </Button>
              <Button loading={renameMutation.isPending} onClick={handleRename}>
                Save
              </Button>
            </div>
          }
        >
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Project Name</div>
            <Input
              placeholder="Enter a new name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
            />
          </div>
        </Dialog>

        <div className="flex-1">
          {isLoading ? (
            <div className="min-h-[calc(100vh-64px-8rem)] flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : (data || []).length === 0 ? (
            <div className="min-h-[calc(100vh-64px-8rem)] flex items-center justify-center">
              <EmptyState
                title="No projects yet"
                description="Create a project to start editing."
                action={<LinkButton href="/editor/new">Create Project</LinkButton>}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(data || []).map((project) => (
                <Link key={project.id} href={`/editor/${project.id}`} className="block">
                  <Card className="transition-colors hover:bg-card/70">
                    <CardContent>
                      <div className="flex items-start justify-between gap-3">
                        <h5 className="mb-2 text-xl font-semibold tracking-tight text-card-foreground truncate">
                          {project.name}
                        </h5>
                        <IconButton
                          aria-label="Rename project"
                          title="Rename"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openRename(project.id, project.name);
                          }}
                        >
                          <Pencil size={16} />
                        </IconButton>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description || "No description provided."}
                      </p>
                      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>#{project.id}</span>
                          <IconButton
                            aria-label="Copy project ID"
                            title="Copy ID"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              copyText(String(project.id), "Project ID");
                            }}
                          >
                            <Copy size={14} />
                          </IconButton>
                        </div>
                        <span>{new Date(project.created_at).toLocaleDateString()}</span>
                      </div>
                      {project.parent_project_id ? (
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Parent #{project.parent_project_id}</span>
                          <IconButton
                            aria-label="Copy parent project ID"
                            title="Copy Parent ID"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              copyText(String(project.parent_project_id), "Parent Project ID");
                            }}
                          >
                            <Copy size={14} />
                          </IconButton>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}
