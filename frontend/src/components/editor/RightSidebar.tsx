"use client";

import { useEditorStore } from "@/store/editorStore";
import { cn } from "@/lib/cn";
import { Settings, ListVideo } from "lucide-react";
import IconButton from "@/components/ui/icon-button";
import InspectorPanel from "@/components/editor/InspectorPanel";
import GenerationQueuePanel from "@/components/editor/GenerationQueuePanel";
import { useI18n } from "@/lib/i18nContext";

export default function RightSidebar() {
  const { t } = useI18n();
  const activeTab = useEditorStore((state) => state.layout.activeRightTab);
  const updateLayout = useEditorStore((state) => state.updateLayout);

  const tabs = [
    { id: "inspector", icon: Settings, label: t("editor.right.inspector") },
    { id: "queue", icon: ListVideo, label: t("editor.right.queue") },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-background border-l border-border overflow-hidden">
      <div className="flex items-center border-b border-border p-2 gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <IconButton
            key={tab.id}
            onClick={() => updateLayout({ activeRightTab: tab.id })}
            className={cn(
              "flex-shrink-0 w-8 h-8",
              activeTab === tab.id ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            title={tab.label}
          >
            <tab.icon size={16} />
          </IconButton>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "inspector" ? <InspectorPanel /> : null}
        {activeTab === "queue" ? <GenerationQueuePanel /> : null}
      </div>
    </div>
  );
}
