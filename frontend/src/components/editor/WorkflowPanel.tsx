"use client";

import Step1StoryPanel from "@/components/editor/story/Step1StoryPanel";
import Step2OutlinePanel from "@/components/editor/story/Step2OutlinePanel";
import Step3CharacterPanel from "@/components/editor/story/Step3CharacterPanel";
import Step4NodeRenderPanel from "@/components/editor/story/Step4NodeRenderPanel";
import { useEditorStore } from "@/store/editorStore";
import { useI18n } from "@/lib/i18nContext";

export default function WorkflowPanel() {
  const { t } = useI18n();
  const workflow = useEditorStore((s) => s.data.storyWorkflow);

  if (!workflow) {
    return <div className="p-4 text-sm text-muted-foreground">{t("story.workflow.initializing")}</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      {workflow.activeStep === "step1" ? <Step1StoryPanel /> : null}
      {workflow.activeStep === "step2" ? <Step2OutlinePanel /> : null}
      {workflow.activeStep === "step3" ? <Step3CharacterPanel /> : null}
      {workflow.activeStep === "step4" ? <Step4NodeRenderPanel /> : null}
    </div>
  );
}
