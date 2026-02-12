"use client";

import { useEditorStore } from "@/store/editorStore";
import { cn } from "@/lib/cn";
import { FileText, Users, Image as ImageIcon, GitBranch } from "lucide-react";
import IconButton from "@/components/ui/icon-button";
import WorkflowPanel from "@/components/editor/WorkflowPanel";
import CharactersPanel from "@/components/editor/CharactersPanel";
import AssetsGrid from "@/components/editor/AssetsGrid";
import dynamic from "next/dynamic";
import Spinner from "@/components/ui/spinner";

const GitGraph = dynamic(() => import("@/components/GitGraph"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[240px] flex items-center justify-center">
      <Spinner size={20} />
    </div>
  ),
});

interface LeftSidebarProps {
  projectId: string;
  assetsProps?: any;
}

export default function LeftSidebar({ projectId, assetsProps }: LeftSidebarProps) {
  const activeTab = useEditorStore((state) => state.layout.activeLeftTab);
  const updateLayout = useEditorStore((state) => state.updateLayout);

  const tabs = [
    { id: "script", icon: FileText, label: "Script" },
    { id: "characters", icon: Users, label: "Characters" },
    { id: "assets", icon: ImageIcon, label: "Assets" },
    { id: "history", icon: GitBranch, label: "History" },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-background border-r border-border overflow-hidden">
      <div className="flex items-center border-b border-border p-2 gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <IconButton
            key={tab.id}
            onClick={() => updateLayout({ activeLeftTab: tab.id })}
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

      <div className="flex-1 overflow-y-auto">
        {activeTab === "script" ? <WorkflowPanel /> : null}
        {activeTab === "characters" ? <CharactersPanel /> : null}
        {activeTab === "assets" && (
          <div className="h-full p-4">
            {assetsProps ? <AssetsGrid {...assetsProps} /> : <div className="text-sm text-muted-foreground">No clips yet.</div>}
          </div>
        )}
        {activeTab === "history" && (
          <div className="h-full p-4">
            <GitGraph projectId={projectId} />
          </div>
        )}
      </div>
    </div>
  );
}
