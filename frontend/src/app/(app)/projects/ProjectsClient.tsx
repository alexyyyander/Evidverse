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

export default function ProjectsClient() {
  const router = useRouter();
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSourceId, setImportSourceId] = useState("");
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

  const handleImport = async () => {
    if (!importSourceId) return;
    forkMutation.mutate(Number(importSourceId));
    setShowImportModal(false);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] py-8">
      <PageContainer>
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

        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (data || []).length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create a project to start editing."
            action={<LinkButton href="/editor/new">Create Project</LinkButton>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(data || []).map((project) => (
              <Link key={project.id} href={`/editor/${project.id}`} className="block">
                <Card className="transition-colors hover:bg-card/70">
                  <CardContent>
                    <h5 className="mb-2 text-xl font-semibold tracking-tight text-card-foreground">{project.name}</h5>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description || "No description provided."}
                    </p>
                    <p className="mt-4 text-xs text-muted-foreground">{new Date(project.created_at).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}

