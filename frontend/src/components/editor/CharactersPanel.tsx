"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { generationApi } from "@/lib/api";
import { useTask } from "@/lib/queries/useTask";
import { toast } from "@/components/ui/toast";
import { useEditorStore } from "@/store/editorStore";
import type { TaskResponse } from "@/lib/api";
import { cn } from "@/lib/cn";
import Dialog from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18nContext";

export default function CharactersPanel() {
  const { t } = useI18n();
  const characters = useEditorStore((s) => Object.values(s.data.characters));
  const beats = useEditorStore((s) => s.data.beats);
  const selectedCharacterId = useEditorStore((s) => s.selection.selectedCharacterId);
  const selectedBeatId = useEditorStore((s) => s.selection.selectedBeatId);
  const selectCharacter = useEditorStore((s) => s.selectCharacter);
  const updateCharacter = useEditorStore((s) => s.updateCharacter);
  const beginHistoryGroup = useEditorStore((s) => s.beginHistoryGroup);
  const endHistoryGroup = useEditorStore((s) => s.endHistoryGroup);
  const deleteCharacter = useEditorStore((s) => s.deleteCharacter);
  const mergeCharacter = useEditorStore((s) => s.mergeCharacter);
  const addGenerationTask = useEditorStore((s) => s.addGenerationTask);
  const updateGenerationTask = useEditorStore((s) => s.updateGenerationTask);
  const applyCharacterTaskResult = useEditorStore((s) => s.applyCharacterTaskResult);

  const [activeTask, setActiveTask] = useState<{ taskId: string; characterId: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; characterId: string | null }>({ open: false, characterId: null });
  const [mergeDialog, setMergeDialog] = useState<{ open: boolean; fromId: string | null; toId: string | null }>({
    open: false,
    fromId: null,
    toId: null,
  });
  const taskQuery = useTask<any>(activeTask?.taskId || null);
  const task = (taskQuery.data || null) as TaskResponse<any> | null;

  useEffect(() => {
    if (!activeTask) return;
    if (!task) return;
    updateGenerationTask(activeTask.taskId, { status: String(task.status) as any, result: task.result as any });
    if (String(task.status) === "SUCCESS") {
      applyCharacterTaskResult({ taskId: activeTask.taskId, characterId: activeTask.characterId as any, result: task.result });
    }
    if (String(task.status) === "FAILURE") {
      updateGenerationTask(activeTask.taskId, { error: (task.result as any)?.error || "Task failed" });
    }
  }, [activeTask, task, updateGenerationTask, applyCharacterTaskResult]);

  const ordered = useMemo(() => {
    const baseList = (() => {
      if (!selectedBeatId) return characters;
      const beat = beats[selectedBeatId as any];
      if (!beat) return characters;
      const ids = new Set(beat.characterIds);
      return characters.filter((c) => ids.has(c.id as any));
    })();
    const list = [...baseList];
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [characters, beats, selectedBeatId]);

  const handleGenerateRef = async (characterId: string) => {
    const character = ordered.find((c) => c.id === characterId);
    if (!character) return;
    const prompt = `${character.name}\n${character.description || ""}`.trim();
    if (!prompt) return;
    try {
      const { task_id } = await generationApi.generateCharacter({ prompt, anchor_id: null });
      addGenerationTask({
        id: task_id,
        type: "character",
        status: "PENDING",
        createdAt: new Date().toISOString(),
        input: { prompt, characterId },
        refIds: { characterId },
      });
      setActiveTask({ taskId: task_id, characterId });
      toast({ title: "Task started", description: `Task: ${task_id}`, variant: "success" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Generation failed";
      toast({ title: "Generation failed", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((s) => ({ ...s, open }))}
        title={t("characters.delete")}
        description={t("characters.deleteDesc")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteDialog({ open: false, characterId: null })}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteDialog.characterId) deleteCharacter(deleteDialog.characterId as any);
                setDeleteDialog({ open: false, characterId: null });
              }}
            >
              {t("characters.delete")}
            </Button>
          </div>
        }
      >
        <div className="text-sm text-muted-foreground">{t("characters.undo")}</div>
      </Dialog>

      <Dialog
        open={mergeDialog.open}
        onOpenChange={(open) => setMergeDialog((s) => ({ ...s, open }))}
        title={t("characters.merge")}
        description={t("characters.mergeDesc")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setMergeDialog({ open: false, fromId: null, toId: null })}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (mergeDialog.fromId && mergeDialog.toId) mergeCharacter(mergeDialog.fromId as any, mergeDialog.toId as any);
                setMergeDialog({ open: false, fromId: null, toId: null });
              }}
              disabled={!mergeDialog.fromId || !mergeDialog.toId}
            >
              {t("characters.merge")}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">{t("characters.merge.target")}</div>
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
            value={mergeDialog.toId || ""}
            onChange={(e) => setMergeDialog((s) => ({ ...s, toId: e.target.value || null }))}
          >
            <option value="" disabled>
              {t("characters.merge.select")}
            </option>
            {ordered
              .filter((c) => c.id !== mergeDialog.fromId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.id}
                </option>
              ))}
          </select>
        </div>
      </Dialog>

      <div className="p-4 border-b border-border">
        <div className="text-sm font-medium text-foreground">{t("characters.title")}</div>
        <div className="mt-1 text-xs text-muted-foreground">{t("characters.help")}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {ordered.length === 0 ? <div className="text-sm text-muted-foreground">{t("characters.empty")}</div> : null}
        {ordered.map((c) => {
          const selected = c.id === selectedCharacterId;
          return (
            <div key={c.id} className={cn("rounded-lg border border-border p-3", selected ? "ring-2 ring-ring" : "")}>
              <button type="button" className="w-full text-left" onClick={() => selectCharacter(c.id, "script")}>
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">{c.name || "Unnamed"}</div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGenerateRef(c.id); }}>
                      {t("characters.genRef")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMergeDialog({ open: true, fromId: c.id, toId: null });
                      }}
                    >
                      {t("characters.merge")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteDialog({ open: true, characterId: c.id });
                      }}
                    >
                      {t("characters.delete")}
                    </Button>
                  </div>
                </div>
              </button>

              <div className="mt-3 grid gap-2">
                <Input
                  value={c.name}
                  onChange={(e) => updateCharacter(c.id, { name: e.target.value })}
                  onFocus={() => beginHistoryGroup()}
                  onBlur={() => endHistoryGroup()}
                  placeholder={t("characters.placeholder.name")}
                />
                <Textarea
                  value={c.description || ""}
                  onChange={(e) => updateCharacter(c.id, { description: e.target.value })}
                  onFocus={() => beginHistoryGroup()}
                  onBlur={() => endHistoryGroup()}
                  placeholder={t("characters.placeholder.desc")}
                  className="min-h-[80px]"
                />
                {c.avatarUrl ? (
                  <a href={c.avatarUrl} target="_blank" className="text-xs text-primary underline">
                    {t("characters.viewRef")}
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
