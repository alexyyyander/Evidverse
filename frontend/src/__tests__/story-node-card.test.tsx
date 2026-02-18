import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StoryNodeCard from "@/components/editor/story/StoryNodeCard";
import { useEditorStore } from "@/store/editorStore";

vi.mock("@/lib/i18nContext", () => ({
  useI18n: () => ({
    lang: "en",
    setLang: () => {},
    t: (key: string) => key,
  }),
}));

function resetStore() {
  useEditorStore.setState({
    data: {
      scenes: {
        s1: { id: "s1", title: "Scene 1", summary: "", order: 0, beatIds: ["b1"] },
      },
      beats: {
        b1: {
          id: "b1",
          sceneId: "s1",
          narration: "narration",
          dialogue: "",
          cameraDescription: "camera background",
          suggestedDuration: 5,
          characterIds: ["c1", "c2"],
          status: "success",
          order: 0,
        },
      },
      characters: {
        c1: { id: "c1", name: "Role A", description: "" },
        c2: { id: "c2", name: "Role B", description: "" },
      },
      assets: {},
      clips: {},
      timelineItems: {},
      sceneOrder: ["s1"],
      ideaVersions: [],
      generationTasks: [],
      activeIdeaVersionId: undefined,
      storyWorkflow: {
        version: 1,
        activeStep: "step4",
        selectedNodeId: "node_1",
        global: {
          storyMode: "generate",
          storyStyle: "series",
          tone: "serious",
          llmProvider: "auto",
          scriptMode: "strict_screenplay",
          segmentLength: "medium",
          characterSeeds: [],
        },
        branchPolicy: { branchName: "main", lockBoundaryOrder: null, boundaryConfigured: true },
        nodes: [
          {
            id: "node_1",
            order: 0,
            title: "Node A",
            sceneId: "s1",
            beatIds: ["b1"],
            locked: false,
            step2: {
              status: "done",
              scriptMode: "strict_screenplay",
              segmentLength: "medium",
              summary: "sum",
              background: "bg",
              characterChanges: "",
              encounters: "",
            },
            step3: {
              status: "in_progress",
              provider: "comfyui",
              stylePrompt: "",
              characterAssetMap: { c1: "asset_1", c2: null } as any,
            },
            step4: {
              status: "todo",
              confirmed: false,
              provider: "comfyui",
              comfyuiTemplateId: "tpl_video_01",
              comfyuiParamsJson: "{\"seed\": 123}",
              assetBindings: { characterAssetIds: { c1: "asset_1", c2: null } },
            },
          },
        ],
      },
    },
    selection: {
      selectedBeatId: "b1",
      selectedTimelineItemId: null,
      selectedCharacterId: null,
      selectedAssetId: null,
      selectedStoryNodeId: "node_1",
      source: "story",
    },
    layout: {
      leftPanelWidth: 300,
      rightPanelWidth: 300,
      bottomPanelHeight: 300,
      leftPanelCollapsed: false,
      rightPanelCollapsed: false,
      bottomPanelCollapsed: false,
      activeLeftTab: "create",
      activeRightTab: "inspector",
      followSelection: true,
    },
    history: { undo: [], redo: [], recording: false, applying: false },
  } as any);
}

describe("StoryNodeCard", () => {
  it("shows step3 mapping ratio and missing mapping hint", async () => {
    resetStore();
    render(<StoryNodeCard nodeId="node_1" />);
    const ratio = await screen.findByText(/story\.step3\.mappingRatio/);
    expect(ratio).toBeInTheDocument();
    const nextAction = await screen.findByText(/story\.nextAction\.fix_step3/);
    expect(nextAction).toBeInTheDocument();
    const missingHint = await screen.findByText(/story\.step4\.mapping\.required/);
    expect(missingHint.textContent || "").toContain("Role B");
    expect(await screen.findByText("story.step4.image.required")).toBeInTheDocument();
    expect(await screen.findByText("story.step4.video.required")).toBeInTheDocument();
  });
});
