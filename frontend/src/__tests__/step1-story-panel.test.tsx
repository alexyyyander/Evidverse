import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Step1StoryPanel from "@/components/editor/story/Step1StoryPanel";
import { useEditorStore } from "@/store/editorStore";
import { toast } from "@/components/ui/toast";
import { generationApi } from "@/lib/api";

const mocked = vi.hoisted(() => ({
  branchName: "main",
}));

const translate = (key: string) => key;

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === "branch" ? mocked.branchName : null),
  }),
}));

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

vi.mock("@/lib/api", () => ({
  filesApi: {
    getPresignedUrl: vi.fn(),
  },
  generationApi: {
    generateStoryboard: vi.fn(),
  },
}));

function resetStore(options?: {
  branchName?: string;
  boundaryConfigured?: boolean;
  lockBoundaryOrder?: number | null;
  seed?: any;
}) {
  mocked.branchName = options?.branchName || "main";
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
      storyWorkflow: {
        version: 1,
        activeStep: "step1",
        selectedNodeId: null,
        global: {
          storyMode: "generate",
          storyStyle: "series",
          tone: "serious",
          llmProvider: "auto",
          scriptMode: "strict_screenplay",
          segmentLength: "medium",
          characterSeeds: options?.seed ? [options.seed] : [],
        },
        branchPolicy: {
          branchName: mocked.branchName,
          lockBoundaryOrder: options?.lockBoundaryOrder ?? null,
          boundaryConfigured: options?.boundaryConfigured ?? true,
        },
        nodes: [
          {
            id: "node_1",
            order: 0,
            title: "Node 1",
            sceneId: null,
            beatIds: [],
            locked: false,
            step2: {
              status: "todo",
              scriptMode: "strict_screenplay",
              segmentLength: "medium",
              summary: "",
              background: "",
              characterChanges: "",
              encounters: "",
            },
            step3: { status: "todo", provider: "comfyui", stylePrompt: "", characterAssetMap: {} },
            step4: {
              status: "todo",
              confirmed: false,
              provider: "segment",
              comfyuiParamsJson: "{}",
              assetBindings: { characterAssetIds: {} },
            },
          },
          {
            id: "node_2",
            order: 1,
            title: "Node 2",
            sceneId: null,
            beatIds: [],
            locked: false,
            step2: {
              status: "todo",
              scriptMode: "strict_screenplay",
              segmentLength: "medium",
              summary: "",
              background: "",
              characterChanges: "",
              encounters: "",
            },
            step3: { status: "todo", provider: "comfyui", stylePrompt: "", characterAssetMap: {} },
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
      selectedStoryNodeId: null,
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
  vi.clearAllMocks();
  resetStore();
  vi.mocked(generationApi.generateStoryboard).mockResolvedValue({
    storyboard: [{ scene_number: 1, narration: "n1", visual_description: "v1" }],
    meta: {
      requested_provider: "auto",
      resolved_provider: "auto",
      fallback_used: false,
      warnings: [],
    },
  } as any);
});

describe("Step1StoryPanel", () => {
  it("shows branch boundary preview for non-main branch", () => {
    resetStore({
      branchName: "feature/demo",
      boundaryConfigured: false,
      lockBoundaryOrder: null,
    });
    render(<Step1StoryPanel />);

    expect(screen.getByText("story.step1.branchPreview.title")).toBeInTheDocument();
    expect(screen.getByText("story.step1.branchPreview.branch")).toBeInTheDocument();
    expect(screen.getByText("story.step1.branchPreview.boundary")).toBeInTheDocument();
    expect(screen.getByText("story.step1.branchPreview.counts")).toBeInTheDocument();
    expect(screen.getByText("story.step1.branchPreview.impacted")).toBeInTheDocument();
  });

  it("blocks generation when seed minimum fields are incomplete", async () => {
    resetStore({
      seed: {
        id: "seed_1",
        name: "Role A",
        identity: "id",
        personality: "calm",
        appearance: "",
        fateKeywords: [],
        referenceImageUrl: "",
      },
    });
    render(<Step1StoryPanel />);

    fireEvent.change(screen.getByPlaceholderText("story.step1.topic.placeholder"), {
      target: { value: "topic-a" },
    });
    fireEvent.click(screen.getByRole("button", { name: "story.step1.submit" }));

    await waitFor(() => {
      expect(generationApi.generateStoryboard).not.toHaveBeenCalled();
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "story.step1.toast.seedIncomplete.title",
          variant: "destructive",
        }),
      );
    });
    expect(screen.getByText(/story\.step1\.seeds\.validation\.missing/)).toBeInTheDocument();
  });

  it("allows generation when seed is complete", async () => {
    resetStore({
      seed: {
        id: "seed_1",
        name: "Role A",
        identity: "id",
        personality: "calm",
        appearance: "long coat",
        fateKeywords: ["survive"],
        referenceImageUrl: "https://example.com/seed.png",
      },
    });
    render(<Step1StoryPanel />);

    fireEvent.change(screen.getByPlaceholderText("story.step1.topic.placeholder"), {
      target: { value: "topic-b" },
    });
    fireEvent.click(screen.getByRole("button", { name: "story.step1.submit" }));

    await waitFor(() => {
      expect(generationApi.generateStoryboard).toHaveBeenCalledTimes(1);
    });
  });
});
