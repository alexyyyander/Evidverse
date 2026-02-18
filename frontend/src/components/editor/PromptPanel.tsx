"use client";

import { useMemo, useState } from "react";
import Textarea from "@/components/ui/textarea";
import Button from "@/components/ui/button";
import { Film } from "lucide-react";
import { generationApi, type GenerateClipResult, type TaskResponse } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18nContext";

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
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => prompt.trim().length > 0 && !submitting && !busy,
    [prompt, submitting, busy]
  );

  const statusLabel = useMemo(() => {
    if (!task) return null;
    const status = String(task.status);
    if (status === "PENDING") return t("prompt.status.queued");
    if (status === "STARTED") return t("prompt.status.generating");
    if (status === "SUCCESS") return t("prompt.status.completed");
    if (status === "FAILURE") return t("prompt.status.failed");
    return status;
  }, [task, t]);

  const handleGenerate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { task_id } = await generationApi.generateClip({ topic: prompt.trim() });
      toast({ title: t("prompt.toast.taskStarted.title"), description: `Task: ${task_id}`, variant: "success" });
      onTaskStarted(task_id);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("prompt.toast.generateFailed.title");
      toast({ title: t("prompt.toast.generateFailed.title"), description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="text-sm font-medium text-foreground">{t("prompt.topic")}</div>
      <div className="mt-2 flex-1">
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={t("prompt.placeholder")}
          className="min-h-[160px]"
        />
      </div>

      {statusLabel ? <div className="mt-3 text-xs text-muted-foreground">{t("prompt.status.label")}: {statusLabel}</div> : null}

      <div className="mt-4">
        <Button onClick={handleGenerate} disabled={!canSubmit} loading={submitting || busy} className="w-full">
          <Film size={18} />
          {busy ? t("prompt.generating") : t("prompt.generateVideo")}
        </Button>
      </div>
    </div>
  );
}
