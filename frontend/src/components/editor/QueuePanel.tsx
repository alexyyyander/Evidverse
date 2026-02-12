"use client";

import { useMemo } from "react";
import type { GenerateClipResult, TaskResponse } from "@/lib/api";
import Badge from "@/components/ui/badge";
import Spinner from "@/components/ui/spinner";

export default function QueuePanel({
  taskId,
  task,
  busy,
}: {
  taskId: string | null;
  task: TaskResponse<GenerateClipResult> | null;
  busy: boolean;
}) {
  const status = useMemo(() => {
    if (!taskId) return null;
    if (busy) return "RUNNING";
    if (!task) return "UNKNOWN";
    return String(task.status || "UNKNOWN");
  }, [busy, task, taskId]);

  const clipsCount = useMemo(() => {
    if (!task?.result) return null;
    if (task.result.status !== "succeeded") return null;
    if (!Array.isArray(task.result.clips)) return 0;
    return task.result.clips.length;
  }, [task?.result]);

  if (!taskId) {
    return <div className="text-sm text-muted-foreground">No generation task yet.</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-border p-3">
        <div className="text-sm font-semibold">Task</div>
        <div className="mt-1 text-xs text-muted-foreground break-all">{taskId}</div>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="secondary">{status || "UNKNOWN"}</Badge>
          {busy ? <Spinner size={16} /> : null}
        </div>
        {typeof clipsCount === "number" ? (
          <div className="mt-2 text-xs text-muted-foreground">Clips: {clipsCount}</div>
        ) : null}
      </div>
    </div>
  );
}

