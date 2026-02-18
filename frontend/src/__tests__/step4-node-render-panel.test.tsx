import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Step4NodeRenderPanel from "@/components/editor/story/Step4NodeRenderPanel";
import { useEditorStore } from "@/store/editorStore";
import { toast } from "@/components/ui/toast";
import { comfyuiApi } from "@/lib/api";

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

vi.mock("@/lib/api", () => ({
  comfyuiApi: {
    listTemplates: vi.fn(),
    getTemplate: vi.fn(),
    renderTemplate: vi.fn(),
  },
  generationApi: {
    generateSegment: vi.fn(),
  },
}));

function resetStore(
  paramsJson: string = "{\"seed\": 7}",
  options?: {
    characterIds?: string[];
    characterAssetMap?: Record<string, string | null>;
    includePrimaryImage?: boolean;
  },
) {
  const characterIds = options?.characterIds || [];
  const characterAssetMap = options?.characterAssetMap || {};
  const includePrimaryImage = options?.includePrimaryImage !== false;
  const characters = Object.fromEntries(
    characterIds.map((characterId, index) => [characterId, { id: characterId, name: `Role ${index + 1}`, description: "" }]),
  );
  const assets = includePrimaryImage
    ? {
        img_bg: {
          id: "img_bg",
          type: "image",
          url: "https://example.com/background.png",
          source: "generated",
          createdAt: new Date().toISOString(),
        },
      }
    : {};
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
          characterIds,
          status: "success",
          order: 0,
        },
      },
      characters: characters as any,
      assets: assets as any,
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
              summary: "node summary",
              background: "background detail",
              characterChanges: "",
              encounters: "",
            },
            step3: {
              status: "done",
              provider: "comfyui",
              stylePrompt: "",
              characterAssetMap,
              comfyuiTemplateId: "tpl_video_01",
            },
            step4: {
              status: "todo",
              confirmed: false,
              provider: "comfyui",
              comfyuiTemplateId: "tpl_video_01",
              comfyuiParamsJson: paramsJson,
              assetBindings: {
                backgroundAssetId: includePrimaryImage ? "img_bg" : undefined,
                characterAssetIds: {},
              },
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

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Step4NodeRenderPanel />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
  vi.mocked(comfyuiApi.listTemplates).mockResolvedValue([
    { id: "tpl_video_01", name: "Template 01", description: null },
  ] as any);
  vi.mocked(comfyuiApi.getTemplate).mockResolvedValue({
    id: "tpl_video_01",
    name: "Template 01",
    description: null,
    workflow: {
      "10": {
        inputs: {
          text: "{{visual_description}}",
          seed: "${seed}",
        },
      },
    },
    bindings: [{ node_id: "10", path: "inputs.image", param: "start_image_url" }],
  } as any);
});

describe("Step4NodeRenderPanel", () => {
  it("auto-fills missing params after enabling auto fill", async () => {
    renderPanel();
    expect(screen.getByText("story.nextAction.label: story.nextAction.render_step4")).toBeInTheDocument();

    const toggle = await screen.findByRole("button", {
      name: "story.step4.template.autoFill.off",
    });
    fireEvent.click(toggle);

    expect(useEditorStore.getState().data.storyWorkflow?.ui?.step4AutoFillEnabled).toBe(true);

    await waitFor(() => {
      const paramsObj = JSON.parse(
        useEditorStore.getState().data.storyWorkflow?.nodes[0].step4.comfyuiParamsJson || "{}",
      );
      expect(paramsObj.seed).toBe(7);
      expect(paramsObj.start_image_url).toBe("");
      expect(paramsObj.visual_description).toBe("");
    });
  });

  it("imports template params by merging binding keys and workflow placeholders", async () => {
    renderPanel();

    const importButton = await screen.findByRole("button", {
      name: "story.step4.template.importParams.action",
    });
    await waitFor(() => expect(importButton).not.toBeDisabled());
    fireEvent.click(importButton);

    const paramsJson = useEditorStore.getState().data.storyWorkflow?.nodes[0].step4.comfyuiParamsJson || "{}";
    const paramsObj = JSON.parse(paramsJson);
    expect(paramsObj.seed).toBe(7);
    expect(paramsObj.start_image_url).toBe("");
    expect(paramsObj.visual_description).toBe("");
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "story.step4.template.imported.title",
        variant: "success",
      }),
    );
  });

  it("shows no-op feedback when template param keys already exist", async () => {
    resetStore(
      JSON.stringify(
        {
          seed: 7,
          start_image_url: "asset://start.png",
          visual_description: "already present",
        },
        null,
        2,
      ),
    );
    renderPanel();

    const importButton = await screen.findByRole("button", {
      name: "story.step4.template.importParams.action",
    });
    await waitFor(() => expect(importButton).not.toBeDisabled());
    fireEvent.click(importButton);

    const paramsObj = JSON.parse(useEditorStore.getState().data.storyWorkflow?.nodes[0].step4.comfyuiParamsJson || "{}");
    expect(paramsObj).toEqual({
      seed: 7,
      start_image_url: "asset://start.png",
      visual_description: "already present",
    });
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "story.step4.template.imported.noop.title",
        variant: "default",
      }),
    );
  });

  it("blocks render when comfyui params json is invalid", async () => {
    resetStore("{ invalid_json: true }");
    renderPanel();

    const generateButton = await screen.findByRole("button", { name: "story.step4.generateVideo" });
    expect(generateButton).toBeDisabled();
    expect(screen.getByText("story.step4.submitBlocked.title")).toBeInTheDocument();
    expect(screen.getByText("story.step4.block.params")).toBeInTheDocument();
    expect(screen.getAllByText(/story\.step4\.submitBlocked\.params/).length).toBeGreaterThan(0);
    const fixParamsButton = await screen.findByRole("button", {
      name: "story.step4.submitBlocked.fixParams",
    });
    fireEvent.click(fixParamsButton);
    expect(screen.getByPlaceholderText("story.step4.params.placeholder")).toBeInTheDocument();
    fireEvent.click(generateButton);

    expect(comfyuiApi.renderTemplate).not.toHaveBeenCalled();
  });

  it("can quick-fix invalid json and restore invalid draft with confirmation", async () => {
    resetStore("{ invalid_json: true }");
    renderPanel();

    const resetBtn = await screen.findByRole("button", {
      name: "story.step4.params.visual.reset",
    });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(useEditorStore.getState().data.storyWorkflow?.nodes[0].step4.comfyuiParamsJson).toBe("{}");
    });

    const restoreBtn = await screen.findByRole("button", {
      name: "story.step4.params.visual.restore",
    });
    fireEvent.click(restoreBtn);

    expect(useEditorStore.getState().data.storyWorkflow?.nodes[0].step4.comfyuiParamsJson).toBe("{}");

    const cancelRestoreBtn = await screen.findByRole("button", {
      name: "common.cancel",
    });
    fireEvent.click(cancelRestoreBtn);

    expect(useEditorStore.getState().data.storyWorkflow?.nodes[0].step4.comfyuiParamsJson).toBe("{}");

    fireEvent.click(await screen.findByRole("button", { name: "story.step4.params.visual.restore" }));
    const confirmRestoreBtn = await screen.findByRole("button", {
      name: "story.step4.params.visual.restoreConfirm.action",
    });
    fireEvent.click(confirmRestoreBtn);

    await waitFor(() => {
      expect(useEditorStore.getState().data.storyWorkflow?.nodes[0].step4.comfyuiParamsJson).toBe("{ invalid_json: true }");
    });
  });

  it("blocks render when step3 character mapping is incomplete", async () => {
    resetStore("{\"seed\": 7}", {
      characterIds: ["c1"],
      characterAssetMap: {},
    });
    renderPanel();
    const mappingHints = await screen.findAllByText(/story\.step4\.mapping\.required/);
    expect(mappingHints.length).toBeGreaterThan(0);
    expect(mappingHints.some((hint) => (hint.textContent || "").includes("Role 1"))).toBe(true);
    const panelFixButton = await screen.findByRole("button", {
      name: "story.step4.submitBlocked.fixMapping",
    });
    fireEvent.click(panelFixButton);
    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step3");
    useEditorStore.getState().setActiveStep("step4");
    const fixButton = await screen.findByRole("button", { name: "story.step4.mapping.backToStep3" });
    fireEvent.click(fixButton);
    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step3");

    const generateButton = await screen.findByRole("button", { name: "story.step4.generateVideo" });
    expect(generateButton).toBeDisabled();
    fireEvent.click(generateButton);

    expect(comfyuiApi.renderTemplate).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalledWith(
      expect.objectContaining({
        title: "story.step4.toast.mappingIncomplete.title",
      }),
    );
  });

  it("blocks render when image binding is missing", async () => {
    resetStore("{\"seed\": 7}", { includePrimaryImage: false });
    renderPanel();

    expect(screen.getAllByText("story.step4.image.required").length).toBeGreaterThan(0);
    const generateButton = await screen.findByRole("button", { name: "story.step4.generateVideo" });
    expect(generateButton).toBeDisabled();
    fireEvent.click(generateButton);

    expect(comfyuiApi.renderTemplate).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalledWith(
      expect.objectContaining({
        title: "story.step4.toast.queued.title",
      }),
    );
  });

  it("shows explicit video-required warning before confirmation", async () => {
    resetStore();
    renderPanel();

    expect(screen.getAllByText("story.step4.video.required").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "story.step4.confirmNext" })).not.toBeInTheDocument();
  });

  it("auto-fills missing asset bindings from local suggestions", async () => {
    resetStore("{\"seed\": 7}", {
      characterIds: ["c1"],
      characterAssetMap: {},
      includePrimaryImage: false,
    });
    useEditorStore.setState((s: any) => {
      s.data.assets.img_char = {
        id: "img_char",
        type: "image",
        url: "https://example.com/char.png",
        source: "upload",
        relatedCharacterId: "c1",
        createdAt: new Date().toISOString(),
      };
      s.data.assets.img_beat = {
        id: "img_beat",
        type: "image",
        url: "https://example.com/beat.png",
        source: "upload",
        relatedBeatId: "b1",
        createdAt: new Date().toISOString(),
      };
      return s;
    });

    renderPanel();
    const suggestButton = await screen.findByRole("button", {
      name: "story.step4.suggestBindings.action",
    });
    fireEvent.click(suggestButton);

    const node = useEditorStore.getState().data.storyWorkflow?.nodes[0];
    expect(node?.step4.assetBindings.characterAssetIds.c1).toBe("img_char");
    expect(node?.step4.assetBindings.backgroundAssetId).toBe("img_beat");
    expect(node?.step4.assetBindings.startImageAssetId).toBeTruthy();
    expect(node?.step4.assetBindings.endImageAssetId).toBeTruthy();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "story.step4.suggestBindings.applied.title",
        variant: "success",
      }),
    );
  });

  it("consumes step4 focus target after mounting", async () => {
    resetStore();
    useEditorStore.setState((s: any) => {
      s.data.storyWorkflow.ui = { ...(s.data.storyWorkflow.ui || {}), focusTarget: "step4_image_binding" };
      return s;
    });

    renderPanel();
    await waitFor(() => {
      expect(useEditorStore.getState().data.storyWorkflow?.ui?.focusTarget).toBeNull();
    });
  });

  it("shows loop hint and confirms back to step2 when node video is ready", async () => {
    resetStore();
    useEditorStore.setState((s: any) => {
      s.data.assets.asset_video = {
        id: "asset_video",
        type: "video",
        url: "https://example.com/video.mp4",
        source: "generated",
        createdAt: new Date().toISOString(),
      };
      s.data.storyWorkflow.nodes[0].step4.videoAssetId = "asset_video";
      return s;
    });

    renderPanel();
    expect(await screen.findByText("story.step4.loopHint.done")).toBeInTheDocument();
    const confirmButton = await screen.findByRole("button", { name: "story.step4.confirmNext" });
    fireEvent.click(confirmButton);

    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step2");
    expect(useEditorStore.getState().data.storyWorkflow?.nodes[0].step4.confirmed).toBe(true);
  });
});
