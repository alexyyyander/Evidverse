"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkflowPanel from "@/components/editor/WorkflowPanel";
import ComfyUIWorkflowPanel from "@/components/editor/ComfyUIWorkflowPanel";
import { useI18n } from "@/lib/i18nContext";
import StepNavigator from "@/components/editor/story/StepNavigator";

export default function CreatePanel() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"story" | "comfyui">("story");

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="story" className="flex-1">
              {t("editor.create.story")}
            </TabsTrigger>
            <TabsTrigger value="comfyui" className="flex-1">
              {t("editor.create.comfyui")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="border-b border-border p-3">
        <StepNavigator />
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === "story" ? <WorkflowPanel /> : null}
        {tab === "comfyui" ? <ComfyUIWorkflowPanel onRequestStoryTab={() => setTab("story")} /> : null}
      </div>
    </div>
  );
}
