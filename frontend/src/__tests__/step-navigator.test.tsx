import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import StepNavigator from "@/components/editor/story/StepNavigator";
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
          narration: "n1",
          dialogue: "",
          cameraDescription: "bg1",
          suggestedDuration: 5,
          characterIds: ["c1"],
          status: "success",
          order: 0,
        },
      },
      characters: {
        c1: { id: "c1", name: "Role A", description: "" },
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
              summary: "summary",
              background: "background",
              characterChanges: "",
              encounters: "",
            },
            step3: {
              status: "in_progress",
              provider: "comfyui",
              stylePrompt: "",
              characterAssetMap: {},
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
      selectedBeatId: null,
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

describe("StepNavigator", () => {
  it("shows recommendation and routes to recommended step", () => {
    render(<StepNavigator />);
    expect(screen.getAllByText(/story\.nextAction\.fix_step3/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("story.step4.block.count").length).toBeGreaterThan(0);
    expect(screen.getAllByText("story.step4.block.mapping").length).toBeGreaterThan(0);
    expect(screen.getAllByText("story.step4.block.image").length).toBeGreaterThan(0);
    expect(screen.getAllByText("story.step4.block.video").length).toBeGreaterThan(0);

    const goButton = screen.getByRole("button", { name: "editor.header.goRecommended" });
    fireEvent.click(goButton);

    const state = useEditorStore.getState();
    expect(state.data.storyWorkflow?.activeStep).toBe("step3");
    expect(state.selection.selectedStoryNodeId).toBe("node_1");
  });

  it("prioritizes mapping blocker before other step4 blockers", () => {
    useEditorStore.setState((state: any) => {
      state.data.storyWorkflow.activeStep = "step2";
      return state;
    });

    render(<StepNavigator />);

    fireEvent.click(screen.getByText("story.step4.block.video"));
    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step3");
    expect(useEditorStore.getState().data.storyWorkflow?.ui?.focusTarget).toBe("step3_mapping");

    fireEvent.click(screen.getByText("story.step4.block.mapping"));
    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step3");
    expect(useEditorStore.getState().data.storyWorkflow?.ui?.focusTarget).toBe("step3_mapping");
  });

  it("routes to step2 when selected node is locked", () => {
    useEditorStore.setState((state: any) => {
      state.data.storyWorkflow.nodes[0].locked = true;
      state.data.storyWorkflow.activeStep = "step4";
      return state;
    });

    render(<StepNavigator />);
    expect(screen.getAllByText(/story\.nextAction\.read_only/).length).toBeGreaterThan(0);

    const goButton = screen.getByRole("button", { name: "editor.header.goRecommended" });
    fireEvent.click(goButton);

    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step2");
  });

  it("routes video blocker to params fix when params are invalid", () => {
    useEditorStore.setState((state: any) => {
      state.data.storyWorkflow.nodes[0].step3.status = "done";
      state.data.storyWorkflow.nodes[0].step3.characterAssetMap = { c1: "asset_1" };
      state.data.storyWorkflow.nodes[0].step4.provider = "comfyui";
      state.data.storyWorkflow.nodes[0].step4.comfyuiParamsJson = "{ invalid_json: true }";
      state.data.storyWorkflow.nodes[0].step4.assetBindings.characterAssetIds = { c1: "asset_1" };
      state.data.storyWorkflow.nodes[0].step4.assetBindings.backgroundAssetId = "asset_1";
      state.data.assets.asset_1 = {
        id: "asset_1",
        type: "image",
        url: "https://example.com/a.png",
        source: "generated",
        createdAt: new Date().toISOString(),
      };
      state.data.storyWorkflow.activeStep = "step2";
      return state;
    });

    render(<StepNavigator />);
    expect(screen.getAllByText("story.step4.block.params").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("story.step4.block.video"));
    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step4");
    expect(useEditorStore.getState().data.storyWorkflow?.ui?.focusTarget).toBe("step4_params");
  });
});
