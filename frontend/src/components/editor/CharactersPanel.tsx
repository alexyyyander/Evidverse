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

export default function CharactersPanel() {
  const characters = useEditorStore((s) => Object.values(s.data.characters));
  const selectedCharacterId = useEditorStore((s) => s.selection.selectedCharacterId);
  const selectCharacter = useEditorStore((s) => s.selectCharacter);
  const updateCharacter = useEditorStore((s) => s.updateCharacter);
  const addGenerationTask = useEditorStore((s) => s.addGenerationTask);
  const updateGenerationTask = useEditorStore((s) => s.updateGenerationTask);
  const applyCharacterTaskResult = useEditorStore((s) => s.applyCharacterTaskResult);

  const [activeTask, setActiveTask] = useState<{ taskId: string; characterId: string } | null>(null);
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
    const list = [...characters];
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [characters]);

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
      <div className="p-4 border-b border-border">
        <div className="text-sm font-medium text-foreground">人物</div>
        <div className="mt-1 text-xs text-muted-foreground">为每个角色生成参考图，后续视频生成可复用</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {ordered.length === 0 ? <div className="text-sm text-muted-foreground">还没有人物。可以先在剧本里点击“提取人物”。</div> : null}
        {ordered.map((c) => {
          const selected = c.id === selectedCharacterId;
          return (
            <div key={c.id} className={cn("rounded-lg border border-border p-3", selected ? "ring-2 ring-ring" : "")}>
              <button type="button" className="w-full text-left" onClick={() => selectCharacter(c.id, "script")}>
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">{c.name || "Unnamed"}</div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGenerateRef(c.id); }}>
                      生成参考图
                    </Button>
                  </div>
                </div>
              </button>

              <div className="mt-3 grid gap-2">
                <Input value={c.name} onChange={(e) => updateCharacter(c.id, { name: e.target.value })} placeholder="角色名" />
                <Textarea
                  value={c.description || ""}
                  onChange={(e) => updateCharacter(c.id, { description: e.target.value })}
                  placeholder="外观/服装/关键词/禁用词..."
                  className="min-h-[80px]"
                />
                {c.avatarUrl ? (
                  <a href={c.avatarUrl} target="_blank" className="text-xs text-primary underline">
                    查看参考图
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

