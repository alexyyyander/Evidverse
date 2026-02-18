import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import InspectorPanel from "@/components/editor/InspectorPanel";
import { useEditorStore } from "@/store/editorStore";
import { useTimelineStore } from "@/store/timelineStore";

vi.mock("@/lib/i18nContext", () => ({
  useI18n: () => ({
    lang: "en",
    setLang: () => {},
    t: (key: string) => key,
  }),
}));

function resetStores() {
  useTimelineStore.setState({
    editorData: [{ id: "0", actions: [] }],
    effects: {},
    projectId: null,
    currentTime: 0,
  } as any);

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
      activeLeftTab: "assets",
      activeRightTab: "inspector",
      followSelection: true,
    },
    history: { undo: [], redo: [], recording: false, applying: false },
  } as any);
}

beforeEach(() => {
  resetStores();
});

describe("InspectorPanel", () => {
  it("shows story node recommendation and routes to recommended step without timeline selection", async () => {
    render(<InspectorPanel />);
    const title = await screen.findByText("inspector.storyNode");
    expect(title).toBeInTheDocument();
    expect((await screen.findByText(/story\.nextAction\.fix_step3/)).textContent || "").toContain(
      "story.nextAction.fix_step3",
    );

    const goButton = await screen.findByRole("button", { name: "inspector.goRecommended" });
    fireEvent.click(goButton);

    const state = useEditorStore.getState();
    expect(state.data.storyWorkflow?.activeStep).toBe("step3");
    expect(state.layout.activeLeftTab).toBe("create");
    expect(state.selection.selectedStoryNodeId).toBe("node_1");
  });

  it("shows empty hint when neither timeline item nor story node is selected", async () => {
    useEditorStore.setState((state: any) => {
      state.selection.selectedStoryNodeId = null;
      state.data.storyWorkflow.selectedNodeId = null;
      return state;
    });
    render(<InspectorPanel />);
    expect(await screen.findByText("inspector.select")).toBeInTheDocument();
  });

  it("disables step3/step4 shortcuts when selected node is locked", async () => {
    useEditorStore.setState((state: any) => {
      state.data.storyWorkflow.nodes[0].locked = true;
      return state;
    });
    render(<InspectorPanel />);
    expect(await screen.findByText("inspector.storyNode.lockedHint")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "story.step3.title" })).toBeDisabled();
    expect(await screen.findByRole("button", { name: "story.step4.title" })).toBeDisabled();

    const goButton = await screen.findByRole("button", { name: "inspector.goRecommended" });
    fireEvent.click(goButton);
    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step2");
  });
});
