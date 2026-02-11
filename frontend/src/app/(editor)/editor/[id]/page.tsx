"use client";

import LinkButton from "@/components/ui/link-button";
import EditorShell from "@/components/editor/EditorShell";

export default function EditorPage({ params }: { params: { id: string } }) {
  const projectId = Number(params.id);

  if (!Number.isFinite(projectId)) {
    return (
      <div className="h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">Invalid Project</h1>
          <p className="mt-2 text-sm text-muted-foreground">The project id in the URL is not valid.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <LinkButton href="/editor/new">Create Project</LinkButton>
            <LinkButton href="/projects" variant="secondary">
              Back to Projects
            </LinkButton>
          </div>
        </div>
      </div>
    );
  }

  return <EditorShell projectId={projectId} />;
}
