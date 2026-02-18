import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Step2OutlinePanel from "@/components/editor/story/Step2OutlinePanel";
import Step3CharacterPanel from "@/components/editor/story/Step3CharacterPanel";
import Step4NodeRenderPanel from "@/components/editor/story/Step4NodeRenderPanel";
import {
  resolveStep4BlockNavigationByRawReason,
  summarizeNodeStep4ConfirmReadiness,
} from "@/lib/editor/storyProgress";
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
    generateCharacter: vi.fn(),
    generateSegment: vi.fn(),
  },
  comfyuiApi: {
    listTemplates: vi.fn().mockResolvedValue([]),
    getTemplate: vi.fn(),
    renderTemplate: vi.fn(),
  },
  filesApi: {
    getPresignedUrl: vi.fn(),
  },
}));

vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
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
        ui: { focusTarget: null },
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
              provider: "placeholder",
              stylePrompt: "",
              characterAssetMap: { c1: null, c2: null },
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
  vi.clearAllMocks();
});

describe("story blocker focus flow", () => {
  it("passes focus target from step2 blocker click to step3 panel and clears it", async () => {
    render(<Step2OutlinePanel />);

    const nodeButton = await screen.findByRole("button", { name: /Node A/i });
    const videoBlocker = nodeButton.querySelector("[data-story-block-reason=\"video\"]");
    expect(videoBlocker).toBeTruthy();

    fireEvent.click(videoBlocker as Element);

    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step3");
    expect(useEditorStore.getState().data.storyWorkflow?.ui?.focusTarget).toBe("step3_mapping");

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Step3CharacterPanel />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(useEditorStore.getState().data.storyWorkflow?.ui?.focusTarget).toBeNull();
    });
  });

  it("supports store-driven step4 blocker routing and focus consumption without timeline mount", async () => {
    useEditorStore.setState((state: any) => {
      state.data.storyWorkflow.nodes[0].step3.status = "done";
      state.data.storyWorkflow.nodes[0].step3.characterAssetMap = { c1: "asset_1", c2: "asset_2" };
      state.data.storyWorkflow.nodes[0].step4.assetBindings.characterAssetIds = {
        c1: "asset_1",
        c2: "asset_2",
      };
      state.data.storyWorkflow.nodes[0].step4.assetBindings.backgroundAssetId = "asset_1";
      state.data.storyWorkflow.nodes[0].step4.provider = "segment";
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
      return state;
    });

    const stateBefore = useEditorStore.getState();
    const workflow = stateBefore.data.storyWorkflow!;
    const node = workflow.nodes[0];
    const readiness = summarizeNodeStep4ConfirmReadiness(node, stateBefore.data);
    const blockTarget = resolveStep4BlockNavigationByRawReason("video", readiness.blockReasons);
    expect(blockTarget).toEqual({
      targetStep: "step4",
      focusTarget: "step4_video_confirm",
    });
    if (!blockTarget) throw new Error("expected step4 block target");

    stateBefore.selectStoryNode(node.id, "event_flow");
    stateBefore.updateStoryUi({ focusTarget: blockTarget.focusTarget });
    stateBefore.setActiveStep(blockTarget.targetStep);

    const stateAfter = useEditorStore.getState();
    expect(stateAfter.data.storyWorkflow?.activeStep).toBe("step4");
    expect(stateAfter.data.storyWorkflow?.ui?.focusTarget).toBe("step4_video_confirm");

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <Step4NodeRenderPanel />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(useEditorStore.getState().data.storyWorkflow?.ui?.focusTarget).toBeNull();
    });
  });

  it("routes to step4 params focus when params blocker has higher priority than video", async () => {
    useEditorStore.setState((state: any) => {
      state.data.storyWorkflow.nodes[0].step3.status = "done";
      state.data.storyWorkflow.nodes[0].step3.characterAssetMap = { c1: "asset_1", c2: "asset_2" };
      state.data.storyWorkflow.nodes[0].step4.assetBindings.characterAssetIds = {
        c1: "asset_1",
        c2: "asset_2",
      };
      state.data.storyWorkflow.nodes[0].step4.assetBindings.backgroundAssetId = "asset_1";
      state.data.storyWorkflow.nodes[0].step4.provider = "comfyui";
      state.data.storyWorkflow.nodes[0].step4.comfyuiParamsJson = "{ invalid_json: true }";
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
      return state;
    });

    const stateBefore = useEditorStore.getState();
    const workflow = stateBefore.data.storyWorkflow!;
    const node = workflow.nodes[0];
    const readiness = summarizeNodeStep4ConfirmReadiness(node, stateBefore.data);
    const blockTarget = resolveStep4BlockNavigationByRawReason("video", readiness.blockReasons);
    expect(blockTarget).toEqual({
      targetStep: "step4",
      focusTarget: "step4_params",
    });
    if (!blockTarget) throw new Error("expected params block target");

    stateBefore.selectStoryNode(node.id, "event_flow");
    stateBefore.updateStoryUi({ focusTarget: blockTarget.focusTarget });
    stateBefore.setActiveStep(blockTarget.targetStep);

    const stateAfter = useEditorStore.getState();
    expect(stateAfter.data.storyWorkflow?.activeStep).toBe("step4");
    expect(stateAfter.data.storyWorkflow?.ui?.focusTarget).toBe("step4_params");

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <Step4NodeRenderPanel />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(useEditorStore.getState().data.storyWorkflow?.ui?.focusTarget).toBeNull();
    });
  });
});
