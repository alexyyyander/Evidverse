"use client";

import { useMemo, useState } from "react";
import Textarea from "@/components/ui/textarea";
import Button from "@/components/ui/button";
import { Film } from "lucide-react";
import { generationApi, type GenerateClipResult, type TaskResponse } from "@/lib/api";
import { toast } from "@/components/ui/toast";

export default function PromptPanel({
  prompt,
  onPromptChange,
  onTaskStarted,
  task,
  busy,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onTaskStarted: (taskId: string) => void;
  task: TaskResponse<GenerateClipResult> | null;
  busy: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => prompt.trim().length > 0 && !submitting && !busy,
    [prompt, submitting, busy]
  );

  const statusLabel = useMemo(() => {
    if (!task) return null;
    const status = String(task.status);
    if (status === "PENDING") return "Queued";
    if (status === "STARTED") return "Generating";
    if (status === "SUCCESS") return "Completed";
    if (status === "FAILURE") return "Failed";
    return status;
  }, [task]);

  const handleGenerate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { task_id } = await generationApi.generateClip({ topic: prompt.trim() });
      toast({ title: "Task started", description: `Task: ${task_id}`, variant: "success" });
      onTaskStarted(task_id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Generation failed";
      toast({ title: "Generation failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="text-sm font-medium text-foreground">Topic / Prompt</div>
      <div className="mt-2 flex-1">
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Describe your video story..."
          className="min-h-[160px]"
        />
      </div>

      {statusLabel ? <div className="mt-3 text-xs text-muted-foreground">Status: {statusLabel}</div> : null}

      <div className="mt-4">
        <Button onClick={handleGenerate} disabled={!canSubmit} loading={submitting || busy} className="w-full">
          <Film size={18} />
          {busy ? "Generating..." : "Generate Video"}
        </Button>
      </div>
    </div>
  );
}
