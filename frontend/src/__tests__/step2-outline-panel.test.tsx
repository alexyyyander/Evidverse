import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Step2OutlinePanel from "@/components/editor/story/Step2OutlinePanel";
import { useEditorStore } from "@/store/editorStore";

const translate = (key: string) => key;

vi.mock("@/lib/i18nContext", () => ({
  useI18n: () => ({
    lang: "en",
    setLang: () => {},
    t: translate,
  }),
}));

vi.mock("@/lib/api", () => ({
  generationApi: {
    generateStoryboard: vi.fn(),
  },
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
        activeStep: "step2",
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
              summary: "summary",
              background: "background",
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
              provider: "segment",
              comfyuiParamsJson: "{}",
              assetBindings: { characterAssetIds: {} },
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

beforeEach(() => {
  resetStore();
});

describe("Step2OutlinePanel", () => {
  it("shows step3 mapping ratio badge in node list", async () => {
    render(<Step2OutlinePanel />);
    const nodeButton = await screen.findByRole("button", { name: /Node A/i });
    expect(nodeButton.textContent || "").toContain("story.step3.mappingRatio");
    expect(nodeButton.textContent || "").toContain("story.nextAction.fix_step3");
    expect(nodeButton.textContent || "").toContain("story.step4.block.count");
    expect(nodeButton.textContent || "").toContain("story.step4.block.mapping");
    expect(nodeButton.textContent || "").toContain("story.step4.block.image");
    expect(nodeButton.textContent || "").toContain("story.step4.block.video");
  });

  it("routes node click to step3 when mapping is incomplete", async () => {
    render(<Step2OutlinePanel />);
    const nodeButton = await screen.findByRole("button", { name: /Node A/i });
    fireEvent.click(nodeButton);
    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step3");
  });

  it("prioritizes mapping blocker before other step4 blockers", async () => {
    render(<Step2OutlinePanel />);
    const nodeButton = await screen.findByRole("button", { name: /Node A/i });
    const videoBlocker = nodeButton.querySelector("[data-story-block-reason=\"video\"]");
    expect(videoBlocker).toBeTruthy();
    fireEvent.click(videoBlocker as Element);
    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step3");
    expect(useEditorStore.getState().data.storyWorkflow?.ui?.focusTarget).toBe("step3_mapping");
  });

  it("routes node click to step4 when mapping and step3 are complete", async () => {
    useEditorStore.setState((state: any) => {
      state.data.storyWorkflow.nodes[0].step3.status = "done";
      state.data.storyWorkflow.nodes[0].step3.characterAssetMap = {
        c1: "asset_1",
        c2: "asset_2",
      };
      state.data.assets.asset_1 = {
        id: "asset_1",
        type: "image",
        url: "https://example.com/1.png",
        source: "generated",
        createdAt: new Date().toISOString(),
      };
      state.data.assets.asset_2 = {
        id: "asset_2",
        type: "image",
        url: "https://example.com/2.png",
        source: "generated",
        createdAt: new Date().toISOString(),
      };
      state.data.storyWorkflow.nodes[0].step4.assetBindings.characterAssetIds = {
        c1: "asset_1",
        c2: "asset_2",
      };
      state.data.storyWorkflow.nodes[0].step4.assetBindings.backgroundAssetId = "asset_1";
      return state;
    });

    render(<Step2OutlinePanel />);
    const nodeButton = await screen.findByRole("button", { name: /Node A/i });
    expect(nodeButton.textContent || "").toContain("story.step4.block.video");
    expect(nodeButton.textContent || "").not.toContain("story.step4.block.mapping");
    expect(nodeButton.textContent || "").not.toContain("story.step4.block.image");
    const videoBlocker = nodeButton.querySelector("[data-story-block-reason=\"video\"]");
    expect(videoBlocker).toBeTruthy();
    fireEvent.click(videoBlocker as Element);
    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step4");
    expect(useEditorStore.getState().data.storyWorkflow?.ui?.focusTarget).toBe("step4_video_confirm");

    fireEvent.click(nodeButton);
    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step4");
  });

  it("routes video blocker to params fix when comfyui params are invalid", async () => {
    useEditorStore.setState((state: any) => {
      state.data.storyWorkflow.nodes[0].step3.status = "done";
      state.data.storyWorkflow.nodes[0].step3.characterAssetMap = {
        c1: "asset_1",
        c2: "asset_2",
      };
      state.data.assets.asset_1 = {
        id: "asset_1",
        type: "image",
        url: "https://example.com/1.png",
        source: "generated",
        createdAt: new Date().toISOString(),
      };
      state.data.assets.asset_2 = {
        id: "asset_2",
        type: "image",
        url: "https://example.com/2.png",
        source: "generated",
        createdAt: new Date().toISOString(),
      };
      state.data.storyWorkflow.nodes[0].step4.provider = "comfyui";
      state.data.storyWorkflow.nodes[0].step4.comfyuiParamsJson = "{ invalid_json: true }";
      state.data.storyWorkflow.nodes[0].step4.assetBindings.characterAssetIds = {
        c1: "asset_1",
        c2: "asset_2",
      };
      state.data.storyWorkflow.nodes[0].step4.assetBindings.backgroundAssetId = "asset_1";
      return state;
    });

    render(<Step2OutlinePanel />);
    const nodeButton = await screen.findByRole("button", { name: /Node A/i });
    expect(nodeButton.textContent || "").toContain("story.step4.block.params");
    const videoBlocker = nodeButton.querySelector("[data-story-block-reason=\"video\"]");
    expect(videoBlocker).toBeTruthy();
    fireEvent.click(videoBlocker as Element);
    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step4");
    expect(useEditorStore.getState().data.storyWorkflow?.ui?.focusTarget).toBe("step4_params");
  });
});
