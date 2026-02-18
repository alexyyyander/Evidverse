import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  projectApi: {
    updateWorkspace: vi.fn(),
    getWorkspace: vi.fn(),
  },
}));

import { projectApi } from "@/lib/api";
import { useEditorStore } from "@/store/editorStore";
import { useTimelineStore } from "@/store/timelineStore";

function resetStores() {
  useTimelineStore.setState({
    editorData: [{ id: "0", actions: [] }],
    effects: {},
    projectId: null,
    currentTime: 0,
  } as any);

  useEditorStore.setState({
    data: {
      scenes: {},
      beats: {},
      characters: {},
      assets: {},
      clips: {},
      timelineItems: {},
      sceneOrder: [],
      ideaVersions: [],
      generationTasks: [],
      activeIdeaVersionId: undefined,
      storyWorkflow: undefined,
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
}

beforeEach(() => {
  resetStores();
  vi.clearAllMocks();
});

describe("story workflow ui persistence", () => {
  it("persists story workflow ui fields in save payload", async () => {
    vi.mocked(projectApi.updateWorkspace).mockResolvedValue({} as any);

    useEditorStore.getState().initializeStoryWorkflowFromStoryboard({
      branchName: "main",
      ideaParams: {
        style: "default",
        aspectRatio: "16:9",
        duration: 10,
        shotCount: 1,
        pace: "normal",
        language: "zh",
        resolution: "1080p",
      },
      storyboard: [{ scene_number: 1, narration: "n1", visual_description: "v1" }],
    });
    useEditorStore.getState().updateStoryUi({
      step4AutoFillEnabled: true,
      assetsImageFilter: "node",
      previewPreferCard: true,
    });

    await useEditorStore.getState().saveProject("project_1", { silent: true, branchName: "main" });

    expect(projectApi.updateWorkspace).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        editorUi: expect.objectContaining({
          storyWorkflow: expect.objectContaining({
            step4AutoFillEnabled: true,
            assetsImageFilter: "node",
            previewPreferCard: true,
          }),
        }),
      }),
      { branch_name: "main" },
    );
  });

  it("restores story workflow ui fields from load payload", async () => {
    useEditorStore.getState().initializeStoryWorkflowFromStoryboard({
      branchName: "main",
      ideaParams: {
        style: "default",
        aspectRatio: "16:9",
        duration: 10,
        shotCount: 1,
        pace: "normal",
        language: "zh",
        resolution: "1080p",
      },
      storyboard: [{ scene_number: 1, narration: "n1", visual_description: "v1" }],
    });

    const current = useEditorStore.getState();
    vi.mocked(projectApi.getWorkspace).mockResolvedValue({
      editorData: [{ id: "0", actions: [] }],
      effects: {},
      editorState: {
        ...current.data,
        storyWorkflow: {
          ...(current.data.storyWorkflow as any),
          ui: {
            step4AutoFillEnabled: false,
            assetsImageFilter: "all",
            previewPreferCard: false,
          },
        },
      },
      editorUi: {
        layout: current.layout,
        selection: current.selection,
        storyWorkflow: {
          activeStep: "step4",
          selectedNodeId: current.data.storyWorkflow?.selectedNodeId || null,
          step4AutoFillEnabled: true,
          assetsImageFilter: "character",
          previewPreferCard: true,
        },
      },
    } as any);

    await useEditorStore.getState().loadProject("project_1", { branchName: "main" });

    expect(useEditorStore.getState().data.storyWorkflow?.ui?.step4AutoFillEnabled).toBe(true);
    expect(useEditorStore.getState().data.storyWorkflow?.ui?.assetsImageFilter).toBe("character");
    expect(useEditorStore.getState().data.storyWorkflow?.ui?.previewPreferCard).toBe(true);
  });
});
