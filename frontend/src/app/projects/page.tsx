"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import PageContainer from "@/components/layout/PageContainer";
import SectionHeader from "@/components/layout/SectionHeader";
import Button from "@/components/ui/button";
import LinkButton from "@/components/ui/link-button";
import Dialog from "@/components/ui/dialog";
import Input from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSourceId, setImportSourceId] = useState("");
  const [importing, setImporting] = useState(false);
  const [usingSampleData, setUsingSampleData] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get("/projects/");
      setProjects(res.data);
      setUsingSampleData(false);
    } catch (error) {
      console.error("Failed to fetch projects", error);
      setUsingSampleData(true);
      setProjects([
        { id: 1, name: "Cat Adventure", description: "A story about a cat", created_at: "2023-10-01" },
        { id: 2, name: "Space Sci-Fi", description: "Future world", created_at: "2023-10-02" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importSourceId) return;
    setImporting(true);
    try {
      // Assuming importSourceId is a Project ID for internal fork
      // For Git URL import, we would need a different endpoint or logic
      // Here we implement "Fork by Project ID" as requested
      const res = await api.post(`/projects/${importSourceId}/fork`, {});
      const newProject = res.data;
      router.push(`/editor/${newProject.id}`);
    } catch (error) {
      alert("Failed to import/fork project. Check ID or permissions.");
      console.error(error);
    } finally {
      setImporting(false);
      setShowImportModal(false);
    }
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

        {usingSampleData && (
          <div className="mb-6 rounded-xl border border-amber-900/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
            Showing sample data because the API request failed. Check backend availability and authentication.
          </div>
        )}

        <Dialog
          open={showImportModal}
          onOpenChange={(open) => {
            setShowImportModal(open);
            if (!open) {
              setImportSourceId("");
              setImporting(false);
            }
          }}
          title="Import Project"
          description="Enter the ID of the Vidgit project to fork."
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowImportModal(false)}>
                Cancel
              </Button>
              <Button loading={importing} onClick={handleImport}>
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

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/editor/${project.id}`}
                className="block"
              >
                <Card className="transition-colors hover:bg-card/70">
                  <CardContent>
                    <h5 className="mb-2 text-xl font-semibold tracking-tight text-card-foreground">{project.name}</h5>
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                    <p className="mt-4 text-xs text-muted-foreground">
                      {new Date(project.created_at).toLocaleDateString()}
                    </p>
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
