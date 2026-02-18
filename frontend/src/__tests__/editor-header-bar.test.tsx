import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditorHeaderBar from "@/components/editor/EditorHeaderBar";
import { useEditorStore } from "@/store/editorStore";

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  usePathname: () => "/editor/test-project",
  useSearchParams: () => ({
    get: (key: string) => (key === "branch" ? "main" : null),
    toString: () => "branch=main",
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/i18nContext", () => ({
  useI18n: () => ({
    lang: "en",
    setLang: () => {},
    t: (key: string) => key,
  }),
}));

vi.mock("@/lib/queries/useMe", () => ({
  useMe: () => ({
    data: null,
    isLoading: false,
  }),
}));

vi.mock("@/lib/api", () => ({
  projectApi: {
    getPublic: vi.fn().mockResolvedValue({
      id: "test-project",
      name: "Demo Project",
      is_public: false,
      parent_project_id: null,
      owner_id: "owner_1",
    }),
    get: vi.fn().mockResolvedValue({
      id: "test-project",
      name: "Demo Project",
      is_public: false,
      parent_project_id: null,
      owner_id: "owner_1",
    }),
    getBranches: vi.fn().mockResolvedValue([{ id: "b1", name: "main" }]),
    update: vi.fn().mockResolvedValue({}),
    forkBranch: vi.fn().mockResolvedValue({ id: "b2", name: "branch/new" }),
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
      activeLeftTab: "assets",
      activeRightTab: "inspector",
      followSelection: true,
    },
    history: { undo: [], redo: [], recording: false, applying: false },
  } as any);
}

function renderHeader() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <EditorHeaderBar projectId="test-project" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  resetStore();
  pushMock.mockReset();
  replaceMock.mockReset();
});

describe("EditorHeaderBar", () => {
  it("shows collaboration mode badge for current context", async () => {
    renderHeader();
    const badge = await screen.findByTitle("editor.collab.hint.main");
    expect(badge).toHaveTextContent("editor.collab.mode.main");
    expect(badge).toHaveTextContent("main");
  });

  it("shows node recommendation and routes to recommended step", async () => {
    renderHeader();
    expect(await screen.findByText(/story\.nextAction\.fix_step3/)).toBeInTheDocument();
    expect(await screen.findByText("story.step4.block.mapping")).toBeInTheDocument();
    expect(await screen.findByText("story.step4.block.image")).toBeInTheDocument();
    expect(await screen.findByText("story.step4.block.video")).toBeInTheDocument();

    const goButton = await screen.findByRole("button", { name: "editor.header.goRecommended" });
    fireEvent.click(goButton);

    const state = useEditorStore.getState();
    expect(state.data.storyWorkflow?.activeStep).toBe("step3");
    expect(state.layout.activeLeftTab).toBe("create");
    expect(state.selection.selectedStoryNodeId).toBe("node_1");
  });

  it("routes to step3 with blocker shortcut when mapping is missing", async () => {
    renderHeader();

    const blockerButton = await screen.findByRole("button", { name: "editor.header.fixBlocked" });
    fireEvent.click(blockerButton);

    const state = useEditorStore.getState();
    expect(state.data.storyWorkflow?.activeStep).toBe("step3");
    expect(state.layout.activeLeftTab).toBe("create");
    expect(state.data.storyWorkflow?.ui?.focusTarget).toBe("step3_mapping");
  });

  it("supports direct blocker tag click with mapping-priority routing", async () => {
    renderHeader();

    const videoBlocker = await screen.findByRole("button", {
      name: "story.step4.block.video · story.step4.block.fixHint",
    });
    const mappingBlocker = await screen.findByRole("button", {
      name: "story.step4.block.mapping · story.step4.block.fixHint",
    });
    expect(mappingBlocker).toHaveAttribute("data-primary-blocker", "true");
    expect(videoBlocker).toHaveAttribute("data-primary-blocker", "false");
    fireEvent.click(videoBlocker);

    const state = useEditorStore.getState();
    expect(state.data.storyWorkflow?.activeStep).toBe("step3");
    expect(state.layout.activeLeftTab).toBe("create");
    expect(state.data.storyWorkflow?.ui?.focusTarget).toBe("step3_mapping");
  });

  it("routes to step2 when selected node is locked", async () => {
    useEditorStore.setState((state: any) => {
      state.data.storyWorkflow.nodes[0].locked = true;
      state.data.storyWorkflow.activeStep = "step4";
      return state;
    });

    renderHeader();
    expect(await screen.findByText(/story\.nextAction\.read_only/)).toBeInTheDocument();

    const goButton = await screen.findByRole("button", { name: "editor.header.goRecommended" });
    fireEvent.click(goButton);
    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step2");
  });

  it("routes to step4 with blocker shortcut when only video is missing", async () => {
    useEditorStore.setState((state: any) => {
      state.data.assets.asset_img = {
        id: "asset_img",
        type: "image",
        url: "https://example.com/bg.png",
        source: "generated",
        createdAt: new Date().toISOString(),
      };
      state.data.storyWorkflow.nodes[0].step3.status = "done";
      state.data.storyWorkflow.nodes[0].step3.characterAssetMap = { c1: "asset_img" };
      state.data.storyWorkflow.nodes[0].step4.assetBindings.characterAssetIds = { c1: "asset_img" };
      state.data.storyWorkflow.nodes[0].step4.assetBindings.backgroundAssetId = "asset_img";
      state.data.storyWorkflow.activeStep = "step2";
      return state;
    });

    renderHeader();
    expect(await screen.findByText(/story\.nextAction\.render_step4/)).toBeInTheDocument();
    expect(await screen.findByText("story.step4.block.video")).toBeInTheDocument();
    const videoBlocker = await screen.findByRole("button", {
      name: "story.step4.block.video · story.step4.block.fixHint",
    });
    expect(videoBlocker).toHaveAttribute("data-primary-blocker", "true");

    const blockerButton = await screen.findByRole("button", { name: "editor.header.fixBlocked" });
    fireEvent.click(blockerButton);

    const state = useEditorStore.getState();
    expect(state.data.storyWorkflow?.activeStep).toBe("step4");
    expect(state.layout.activeLeftTab).toBe("create");
    expect(state.data.storyWorkflow?.ui?.focusTarget).toBe("step4_video_confirm");
  });

  it("redirects to login when creating branch without auth", async () => {
    renderHeader();

    const trigger = await screen.findByRole("button", { name: "main" });
    fireEvent.click(trigger);

    const createBranchEntry = await screen.findByRole("button", { name: "editor.branch.new" });
    fireEvent.click(createBranchEntry);
    expect(pushMock).toHaveBeenCalledWith("/login?next=%2Fproject%2Ftest-project");
  });

  it("redirects to login when moving boundary without auth", async () => {
    renderHeader();

    const setBoundaryButton = await screen.findByRole("button", { name: "editor.boundary.set" });
    fireEvent.click(setBoundaryButton);

    expect(pushMock).toHaveBeenCalledWith("/login?next=%2Fproject%2Ftest-project");
  });
});
