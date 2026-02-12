"use client";

import { useEffect } from "react";
import LinkButton from "@/components/ui/link-button";
import Button from "@/components/ui/button";

export default function EditorError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="h-screen flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold text-foreground">Editor crashed</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try reloading the editor. If it keeps happening, go back to Projects.</p>
        <div className="mt-4 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground break-words">
          {error.message || "Unknown error"}
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <LinkButton href="/projects" variant="secondary">
            Back to Projects
          </LinkButton>
          <Button onClick={() => reset()}>Reload Editor</Button>
        </div>
      </div>
    </div>
  );
}

