import { forwardRef, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TimelineEditor from "@/components/TimelineEditor";
import Step3CharacterPanel from "@/components/editor/story/Step3CharacterPanel";
import { useEditorStore } from "@/store/editorStore";
import { useTimelineStore } from "@/store/timelineStore";

vi.mock("@/lib/i18nContext", () => ({
  useI18n: () => ({
    lang: "en",
    setLang: () => {},
    t: (key: string) => key,
  }),
}));

vi.mock("@xzdarcy/react-timeline-editor", () => {
  const MockTimeline = forwardRef<any, any>(({ children }, _ref) => (
    <div data-testid="mock-timeline">{children}</div>
  ));
  MockTimeline.displayName = "MockTimeline";
  return {
    Timeline: MockTimeline,
    TimelineState: class {},
  };
});

class MockResizeObserver {
  observe() {}
  disconnect() {}
}

function renderWithQueryClient(node: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {node}
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  (globalThis as any).ResizeObserver = MockResizeObserver;

  useTimelineStore.setState({
    editorData: [{ id: "0", actions: [] }],
    effects: {},
    projectId: null,
    currentTime: 0,
  } as any);

  useEditorStore.setState({
    data: {
      scenes: {
        s1: { id: "s1", title: "S1", summary: "", order: 0, beatIds: ["b1"] },
      },
      beats: {
        b1: {
          id: "b1",
          sceneId: "s1",
          narration: "n1",
          dialogue: "",
          cameraDescription: "bg",
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
              summary: "sum",
              background: "bg",
              characterChanges: "",
              encounters: "",
            },
            step3: { status: "todo", provider: "comfyui", stylePrompt: "", characterAssetMap: {} },
            step4: {
              status: "todo",
              confirmed: false,
              provider: "comfyui",
              comfyuiTemplateId: "tpl_video_01",
              comfyuiParamsJson: "{\"seed\": 123}",
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
      selectedStoryNodeId: null,
      source: null,
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
});

describe("timeline event layer", () => {
  it("renders story event button, selects node and routes to step3 when mapping is incomplete", async () => {
    render(<TimelineEditor />);

    const button = await screen.findByRole("button", { name: /Node A/i });
    expect(button.textContent || "").toContain("story.step4.renderProvider.label");
    expect(button.textContent || "").toContain("story.step4.renderProvider.comfyui");
    expect(button.textContent || "").toContain("tpl_video_01");
    expect(button.textContent || "").toContain("story.step4.params.overridden");
    expect(button.textContent || "").toContain("story.step4.params.fillRatio");
    expect(button.textContent || "").toContain("story.step3.mappingRatio");
    expect(button.textContent || "").toContain("story.step2.scriptMode.label");
    expect(button.textContent || "").toContain("story.step2.scriptMode.strict_screenplay");
    expect(button.textContent || "").toContain("story.step2.segmentLength.label");
    expect(button.textContent || "").toContain("story.step2.segmentLength.medium");
    expect(button.textContent || "").toContain("story.nextAction.fix_step3");
    expect(button.textContent || "").toContain("story.step4.block.mapping");
    expect(button.textContent || "").toContain("story.step4.block.image");
    expect(button.textContent || "").toContain("story.step4.block.video");
    fireEvent.click(button);

    const state = useEditorStore.getState();
    expect(state.selection.selectedStoryNodeId).toBe("node_1");
    expect(state.data.storyWorkflow?.selectedNodeId).toBe("node_1");
    expect(state.data.storyWorkflow?.activeStep).toBe("step3");
  });

  it("routes to step4 when node is already ready for render", async () => {
    useEditorStore.setState((state: any) => {
      state.data.storyWorkflow.nodes[0].step3.status = "done";
      state.data.storyWorkflow.nodes[0].step3.characterAssetMap = { c1: "asset_1" };
      state.data.assets.asset_1 = {
        id: "asset_1",
        type: "image",
        url: "https://example.com/a.png",
        source: "generated",
        createdAt: new Date().toISOString(),
      };
      state.data.storyWorkflow.nodes[0].step4.assetBindings.backgroundAssetId = "asset_1";
      return state;
    });

    render(<TimelineEditor />);
    const button = await screen.findByRole("button", { name: /Node A/i });
    expect(button.textContent || "").toContain("story.nextAction.render_step4");
    expect(button.textContent || "").toContain("story.step4.block.video");
    expect(button.textContent || "").not.toContain("story.step4.block.mapping");
    expect(button.textContent || "").not.toContain("story.step4.block.image");
    const videoBlocker = button.querySelector("[data-story-block-reason=\"video\"]");
    expect(videoBlocker).toBeTruthy();
    fireEvent.click(videoBlocker as Element);
    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step4");
    expect(useEditorStore.getState().data.storyWorkflow?.ui?.focusTarget).toBe("step4_video_confirm");

    fireEvent.click(button);

    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step4");
  });

  it("prioritizes mapping blocker before other blockers in event layer", async () => {
    render(<TimelineEditor />);
    const button = await screen.findByRole("button", { name: /Node A/i });
    const videoBlocker = button.querySelector("[data-story-block-reason=\"video\"]");
    expect(videoBlocker).toBeTruthy();
    fireEvent.click(videoBlocker as Element);

    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step3");
    expect(useEditorStore.getState().data.storyWorkflow?.ui?.focusTarget).toBe("step3_mapping");
  });

  it("passes event-layer blocker focus into step3 panel and clears it after mount", async () => {
    useEditorStore.setState((state: any) => {
      state.data.storyWorkflow.nodes[0].step3.provider = "placeholder";
      return state;
    });

    render(<TimelineEditor />);
    const button = await screen.findByRole("button", { name: /Node A/i });
    const videoBlocker = button.querySelector("[data-story-block-reason=\"video\"]");
    expect(videoBlocker).toBeTruthy();
    fireEvent.click(videoBlocker as Element);

    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step3");
    expect(useEditorStore.getState().data.storyWorkflow?.ui?.focusTarget).toBe("step3_mapping");

    renderWithQueryClient(<Step3CharacterPanel />);
    await waitFor(() => {
      expect(useEditorStore.getState().data.storyWorkflow?.ui?.focusTarget).toBeNull();
    });
  });

  it("renders completion pulse style when store marks a recently confirmed node", async () => {
    useEditorStore.setState((state: any) => {
      state.data.storyWorkflow.ui = {
        ...(state.data.storyWorkflow.ui || {}),
        eventFlowPulseNodeId: "node_1",
        eventFlowPulseAt: Date.now(),
      };
      return state;
    });

    render(<TimelineEditor />);
    const button = await screen.findByRole("button", { name: /Node A/i });
    expect(button.getAttribute("data-story-event-pulse")).toBe("true");
  });

  it("routes video blocker to params focus when comfyui params are invalid", async () => {
    useEditorStore.setState((state: any) => {
      state.data.storyWorkflow.nodes[0].step3.status = "done";
      state.data.storyWorkflow.nodes[0].step3.characterAssetMap = { c1: "asset_1" };
      state.data.storyWorkflow.nodes[0].step4.assetBindings.characterAssetIds = { c1: "asset_1" };
      state.data.storyWorkflow.nodes[0].step4.assetBindings.backgroundAssetId = "asset_1";
      state.data.storyWorkflow.nodes[0].step4.provider = "comfyui";
      state.data.storyWorkflow.nodes[0].step4.comfyuiParamsJson = "{ invalid_json: true }";
      state.data.assets.asset_1 = {
        id: "asset_1",
        type: "image",
        url: "https://example.com/a.png",
        source: "generated",
        createdAt: new Date().toISOString(),
      };
      return state;
    });

    render(<TimelineEditor />);
    const button = await screen.findByRole("button", { name: /Node A/i });
    expect(button.textContent || "").toContain("story.step4.block.params");
    const videoBlocker = button.querySelector("[data-story-block-reason=\"video\"]");
    expect(videoBlocker).toBeTruthy();
    fireEvent.click(videoBlocker as Element);

    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step4");
    expect(useEditorStore.getState().data.storyWorkflow?.ui?.focusTarget).toBe("step4_params");
  });
});
