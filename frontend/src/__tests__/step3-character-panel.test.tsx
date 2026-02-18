import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Step3CharacterPanel from "@/components/editor/story/Step3CharacterPanel";
import { useEditorStore } from "@/store/editorStore";
import { toast } from "@/components/ui/toast";

const translate = (key: string) => key;

vi.mock("@/lib/i18nContext", () => ({
  useI18n: () => ({
    lang: "en",
    setLang: () => {},
    t: translate,
  }),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
}));

function resetStore(mapped: boolean) {
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
          characterIds: ["c1"],
          status: "success",
          order: 0,
        },
      },
      characters: {
        c1: { id: "c1", name: "Role A", description: "desc" },
      },
      assets: mapped
        ? {
            a1: {
              id: "a1",
              type: "image",
              url: "http://img",
              source: "upload",
              relatedCharacterId: "c1",
              createdAt: new Date().toISOString(),
            },
          }
        : {},
      clips: {},
      timelineItems: {},
      sceneOrder: ["s1"],
      ideaVersions: [],
      generationTasks: [],
      activeIdeaVersionId: undefined,
      storyWorkflow: {
        version: 1,
        activeStep: "step3",
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
              provider: "placeholder",
              stylePrompt: "",
              characterAssetMap: mapped ? { c1: "a1" } : {},
            },
            step4: {
              status: "todo",
              confirmed: false,
              provider: "segment",
              comfyuiParamsJson: "{}",
              assetBindings: { characterAssetIds: mapped ? { c1: "a1" } : {} },
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

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Step3CharacterPanel />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Step3CharacterPanel", () => {
  it("blocks progression to step4 when character mapping is incomplete", () => {
    resetStore(false);
    renderPanel();
    expect(screen.getByText("story.nextAction.label: story.nextAction.fix_step3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "story.step3.confirm" }));

    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step3");
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "story.step3.toast.mappingIncomplete.title",
        variant: "destructive",
      }),
    );
  });

  it("allows progression to step4 when all characters are mapped", () => {
    resetStore(true);
    renderPanel();
    expect(screen.getByText("story.nextAction.label: story.nextAction.fix_step3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "story.step3.confirm" }));

    const workflow = useEditorStore.getState().data.storyWorkflow;
    expect(workflow?.activeStep).toBe("step4");
    expect(workflow?.nodes[0].step3.status).toBe("done");
  });

  it("maps character from step1 seed reference asset shortcut", () => {
    resetStore(false);
    useEditorStore.setState((s: any) => {
      s.data.assets.a_seed = {
        id: "a_seed",
        type: "image",
        url: "http://seed-image",
        source: "upload",
        createdAt: new Date().toISOString(),
      };
      s.data.storyWorkflow.global.characterSeeds = [
        {
          id: "seed_1",
          name: "Role A",
          identity: "",
          personality: "",
          appearance: "",
          fateKeywords: [],
          referenceAssetId: "a_seed",
        },
      ];
      return s;
    });
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "story.step3.characters.useSeedRef" }));

    const workflow = useEditorStore.getState().data.storyWorkflow!;
    expect(workflow.nodes[0].step3.characterAssetMap.c1).toBe("a_seed");
    expect(workflow.nodes[0].step4.assetBindings.characterAssetIds.c1).toBe("a_seed");
    expect(workflow.global.characterSeeds[0].linkedCharacterId).toBe("c1");
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "story.step3.toast.seedMapped.title",
        variant: "success",
      }),
    );
  });

  it("prefers explicit linkedCharacterId over name matching for seed shortcut", () => {
    resetStore(false);
    useEditorStore.setState((s: any) => {
      s.data.assets.a_seed_2 = {
        id: "a_seed_2",
        type: "image",
        url: "http://seed-image-2",
        source: "upload",
        createdAt: new Date().toISOString(),
      };
      s.data.storyWorkflow.global.characterSeeds = [
        {
          id: "seed_2",
          name: "Another Name",
          identity: "",
          personality: "",
          appearance: "",
          fateKeywords: [],
          linkedCharacterId: "c1",
          referenceAssetId: "a_seed_2",
        },
      ];
      return s;
    });
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "story.step3.characters.useSeedRef" }));

    const workflow = useEditorStore.getState().data.storyWorkflow!;
    expect(workflow.nodes[0].step3.characterAssetMap.c1).toBe("a_seed_2");
    expect(workflow.global.characterSeeds[0].referenceAssetId).toBe("a_seed_2");
  });

  it("applies batch seed mapping suggestions for missing characters", () => {
    resetStore(false);
    useEditorStore.setState((s: any) => {
      s.data.assets.a_seed_batch = {
        id: "a_seed_batch",
        type: "image",
        url: "http://seed-image-batch",
        source: "upload",
        createdAt: new Date().toISOString(),
      };
      s.data.storyWorkflow.global.characterSeeds = [
        {
          id: "seed_batch_1",
          name: "Role A",
          identity: "",
          personality: "",
          appearance: "",
          fateKeywords: [],
          referenceAssetId: "a_seed_batch",
        },
      ];
      return s;
    });
    renderPanel();

    const applyButton = screen.getByRole("button", { name: "story.step3.batchMap.action" });
    expect(applyButton).toBeEnabled();
    fireEvent.click(applyButton);
    expect(screen.getByText("story.step3.batchMap.confirm.title")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "story.step3.batchMap.confirm.action" }));

    const workflow = useEditorStore.getState().data.storyWorkflow!;
    expect(workflow.nodes[0].step3.characterAssetMap.c1).toBe("a_seed_batch");
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "story.step3.batchMap.applied.title",
        variant: "success",
      }),
    );
  });

  it("does not apply batch mapping when confirmation dialog is canceled", () => {
    resetStore(false);
    useEditorStore.setState((s: any) => {
      s.data.assets.a_seed_cancel = {
        id: "a_seed_cancel",
        type: "image",
        url: "http://seed-image-cancel",
        source: "upload",
        createdAt: new Date().toISOString(),
      };
      s.data.storyWorkflow.global.characterSeeds = [
        {
          id: "seed_cancel_1",
          name: "Role A",
          identity: "",
          personality: "",
          appearance: "",
          fateKeywords: [],
          referenceAssetId: "a_seed_cancel",
        },
      ];
      return s;
    });
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "story.step3.batchMap.action" }));
    expect(screen.getByText("story.step3.batchMap.confirm.title")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));

    const workflow = useEditorStore.getState().data.storyWorkflow!;
    expect(workflow.nodes[0].step3.characterAssetMap.c1).toBeUndefined();
  });

  it("supports clearing batch selection before confirm", () => {
    resetStore(false);
    useEditorStore.setState((s: any) => {
      s.data.assets.a_seed_clear = {
        id: "a_seed_clear",
        type: "image",
        url: "http://seed-image-clear",
        source: "upload",
        createdAt: new Date().toISOString(),
      };
      s.data.storyWorkflow.global.characterSeeds = [
        {
          id: "seed_clear_1",
          name: "Role A",
          identity: "",
          personality: "",
          appearance: "",
          fateKeywords: [],
          referenceAssetId: "a_seed_clear",
        },
      ];
      return s;
    });
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "story.step3.batchMap.action" }));
    const confirmButton = screen.getByRole("button", { name: "story.step3.batchMap.confirm.action" });
    expect(confirmButton).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "story.step3.batchMap.confirm.clear" }));
    expect(confirmButton).toBeDisabled();
  });

  it("allows reviewing unresolved batch suggestions even without actionable candidates", () => {
    resetStore(false);
    renderPanel();

    const reviewButton = screen.getByRole("button", { name: "story.step3.batchMap.reviewAction" });
    expect(reviewButton).toBeEnabled();
    fireEvent.click(reviewButton);
    expect(
      screen.getByText((value) => value.includes("story.step3.batchMap.confirm.reason.no_seed")),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "story.step3.batchMap.confirm.action" })).toBeDisabled();
  });

  it("consumes step3 focus target after mounting", async () => {
    resetStore(false);
    useEditorStore.setState((s: any) => {
      s.data.storyWorkflow.ui = { ...(s.data.storyWorkflow.ui || {}), focusTarget: "step3_mapping" };
      return s;
    });

    renderPanel();
    await waitFor(() => {
      expect(useEditorStore.getState().data.storyWorkflow?.ui?.focusTarget).toBeNull();
    });
  });
});
