"use client";

import Button from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useEditorStore } from "@/store/editorStore";

export default function CharactersPanel() {
  const { workspace, addCharacter, selectCharacter } = useEditorStore();
  const selectedId = workspace.selection.selectedCharacterId || null;

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={() => addCharacter()} className="w-full">
        Add Character
      </Button>

      {workspace.characters.length === 0 ? (
        <div className="text-sm text-muted-foreground">No characters yet.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {workspace.characters.map((c) => {
            const active = selectedId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                className={cn(
                  "w-full text-left rounded-md border border-border px-3 py-2 hover:bg-secondary transition-colors",
                  active ? "ring-2 ring-ring" : ""
                )}
                onClick={() => selectCharacter(c.id)}
              >
                <div className="text-sm font-medium truncate">{c.name}</div>
                {c.description ? <div className="text-xs text-muted-foreground truncate">{c.description}</div> : null}
              </button>
            );
          })}
          {selectedId ? (
            <button
              type="button"
              className="text-xs text-muted-foreground underline text-left"
              onClick={() => selectCharacter(null)}
            >
              Clear selection
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

