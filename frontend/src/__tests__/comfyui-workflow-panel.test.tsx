import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ComfyUIWorkflowPanel from "@/components/editor/ComfyUIWorkflowPanel";
import { useEditorStore } from "@/store/editorStore";
import { toast } from "@/components/ui/toast";

const mocked = vi.hoisted(() => ({
  generationComfy: vi.fn(),
  comfyHealth: vi.fn(),
  comfyQueue: vi.fn(),
  comfyListTemplates: vi.fn(),
  comfyGetTemplate: vi.fn(),
}));

vi.mock("@/lib/i18nContext", () => ({
  useI18n: () => ({
    lang: "en",
    setLang: () => {},
    t: (key: string) => key,
  }),
}));

vi.mock("@/lib/api", () => ({
  generationApi: {
    generateComfyUI: (...args: any[]) => mocked.generationComfy(...args),
  },
  comfyuiApi: {
    health: (...args: any[]) => mocked.comfyHealth(...args),
    queue: (...args: any[]) => mocked.comfyQueue(...args),
    listTemplates: (...args: any[]) => mocked.comfyListTemplates(...args),
    getTemplate: (...args: any[]) => mocked.comfyGetTemplate(...args),
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
  mocked.comfyHealth.mockResolvedValue({ reachable: true });
  mocked.comfyQueue.mockResolvedValue({ queue_running: [], queue_pending: [] });
  mocked.comfyListTemplates.mockResolvedValue([]);
  mocked.comfyGetTemplate.mockResolvedValue({
    id: "tpl-1",
    name: "Template 1",
    workflow: { "10": { inputs: {}, class_type: "KSampler" } },
    bindings: [],
  });
});

async function renderPanel(props?: { onRequestStoryTab?: () => void }) {
  render(<ComfyUIWorkflowPanel {...props} />);
  await waitFor(() => {
    expect(mocked.comfyHealth).toHaveBeenCalledTimes(1);
    expect(mocked.comfyQueue).toHaveBeenCalledTimes(1);
    expect(mocked.comfyListTemplates).toHaveBeenCalledTimes(1);
  });
}

describe("ComfyUIWorkflowPanel", () => {
  it("routes to step3 on recommended action without switching story tab", async () => {
    const requestStoryTab = vi.fn();
    await renderPanel({ onRequestStoryTab: requestStoryTab });

    expect(screen.getByText(/story\.nextAction\.fix_step3/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "editor.header.goRecommended" }));

    const state = useEditorStore.getState();
    expect(state.data.storyWorkflow?.activeStep).toBe("step3");
    expect(state.selection.selectedStoryNodeId).toBe("node_1");
    expect(requestStoryTab).not.toHaveBeenCalled();
  });

  it("routes to step2 and requests story tab when node is locked", async () => {
    useEditorStore.setState((state: any) => {
      state.data.storyWorkflow.nodes[0].locked = true;
      return state;
    });
    const requestStoryTab = vi.fn();
    await renderPanel({ onRequestStoryTab: requestStoryTab });

    expect(screen.getByText(/story\.nextAction\.read_only/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "editor.header.goRecommended" }));

    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step2");
    expect(requestStoryTab).toHaveBeenCalledTimes(1);
  });

  it("injects selected node context into params json", async () => {
    useEditorStore.setState((state: any) => {
      state.data.assets.a_char = {
        id: "a_char",
        type: "image",
        url: "http://asset/char.png",
        source: "upload",
        createdAt: new Date().toISOString(),
      };
      state.data.assets.a_bg = {
        id: "a_bg",
        type: "image",
        url: "http://asset/bg.png",
        source: "upload",
        createdAt: new Date().toISOString(),
      };
      state.data.assets.a_start = {
        id: "a_start",
        type: "image",
        url: "http://asset/start.png",
        source: "upload",
        createdAt: new Date().toISOString(),
      };
      state.data.assets.a_end = {
        id: "a_end",
        type: "image",
        url: "http://asset/end.png",
        source: "upload",
        createdAt: new Date().toISOString(),
      };
      state.data.assets.v_final = {
        id: "v_final",
        type: "video",
        url: "http://asset/final.mp4",
        source: "generation",
        createdAt: new Date().toISOString(),
      };
      const node = state.data.storyWorkflow.nodes[0];
      node.step2.summary = "Node summary";
      node.step2.background = "Node background";
      node.step3.characterAssetMap = { c1: "a_char" };
      node.step4.assetBindings.backgroundAssetId = "a_bg";
      node.step4.assetBindings.startImageAssetId = "a_start";
      node.step4.assetBindings.endImageAssetId = "a_end";
      node.step4.videoAssetId = "v_final";
      return state;
    });
    await renderPanel();

    const paramsTextarea = screen.getByPlaceholderText("comfyui.workflow.params.placeholder") as HTMLTextAreaElement;
    fireEvent.change(paramsTextarea, { target: { value: '{"prompt":"custom"}' } });
    fireEvent.click(screen.getByRole("button", { name: "comfyui.workflow.params.injectContext" }));

    const paramsObj = JSON.parse(paramsTextarea.value);
    expect(paramsObj.prompt).toBe("custom");
    expect(paramsObj.node_id).toBe("node_1");
    expect(paramsObj.narration).toBe("Node summary");
    expect(paramsObj.visual_description).toBe("Node background");
    expect(paramsObj.character_asset_ids.c1).toBe("a_char");
    expect(paramsObj.character_asset_urls.c1).toBe("http://asset/char.png");
    expect(paramsObj.background_image_url).toBe("http://asset/bg.png");
    expect(paramsObj.start_image_url).toBe("http://asset/start.png");
    expect(paramsObj.end_image_url).toBe("http://asset/end.png");
    expect(paramsObj.video_asset_url).toBe("http://asset/final.mp4");
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "comfyui.workflow.params.injected",
        variant: "success",
      }),
    );
  });

  it("injects only matched keys when using binding-based injection", async () => {
    useEditorStore.setState((state: any) => {
      state.data.assets.a_start = {
        id: "a_start",
        type: "image",
        url: "http://asset/start.png",
        source: "upload",
        createdAt: new Date().toISOString(),
      };
      const node = state.data.storyWorkflow.nodes[0];
      node.step2.summary = "Node summary";
      node.step2.background = "Node background";
      node.step4.assetBindings.startImageAssetId = "a_start";
      return state;
    });
    await renderPanel();

    const paramsTextarea = screen.getByPlaceholderText("comfyui.workflow.params.placeholder") as HTMLTextAreaElement;
    const bindingsTextarea = screen.getByPlaceholderText("comfyui.workflow.bindings.placeholder") as HTMLTextAreaElement;
    fireEvent.change(paramsTextarea, { target: { value: '{"prompt":"custom"}' } });
    fireEvent.change(bindingsTextarea, {
      target: {
        value: JSON.stringify(
          [
            { node_id: "10", path: "inputs.text", param: "narration" },
            { node_id: "20", path: "inputs.image", param: "start_image_url" },
            { node_id: "30", path: "inputs.foo", param: "unknown_key" },
          ],
          null,
          2,
        ),
      },
    });
    expect(screen.getByText(/comfyui\.workflow\.params\.bindingsPreview\.coverage/)).toBeInTheDocument();
    expect(screen.getByText(/unknown_key/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "comfyui.workflow.params.injectByBindings" }));

    const paramsObj = JSON.parse(paramsTextarea.value);
    expect(paramsObj.prompt).toBe("custom");
    expect(paramsObj.narration).toBe("Node summary");
    expect(paramsObj.start_image_url).toBe("http://asset/start.png");
    expect(paramsObj.node_id).toBeUndefined();
    expect(paramsObj.unknown_key).toBeUndefined();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "comfyui.workflow.params.bindingsInjected.title",
        variant: "success",
      }),
    );
  });

  it("shows invalid bindings preview and error toast when inject-by-bindings input is invalid", async () => {
    await renderPanel();
    const bindingsTextarea = screen.getByPlaceholderText("comfyui.workflow.bindings.placeholder") as HTMLTextAreaElement;
    fireEvent.change(bindingsTextarea, { target: { value: "{ invalid_json: true }" } });

    expect(screen.getByText("comfyui.workflow.params.bindingsPreview.invalid")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "comfyui.workflow.params.injectByBindings" }));
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "comfyui.workflow.params.bindingsInvalid.title",
        variant: "destructive",
      }),
    );
  });

  it("copies unmatched binding keys to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    await renderPanel();
    const bindingsTextarea = screen.getByPlaceholderText("comfyui.workflow.bindings.placeholder") as HTMLTextAreaElement;
    fireEvent.change(bindingsTextarea, {
      target: {
        value: JSON.stringify(
          [
            { node_id: "10", path: "inputs.text", param: "narration" },
            { node_id: "20", path: "inputs.image", param: "unknown_key_1" },
            { node_id: "30", path: "inputs.image", param: "unknown_key_2" },
          ],
          null,
          2,
        ),
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "comfyui.workflow.params.copyMissing.action" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("unknown_key_1, unknown_key_2");
    });
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "comfyui.workflow.params.copyMissing.success.title",
        variant: "success",
      }),
    );
  });

  it("loads selected template into workflow and bindings editors", async () => {
    mocked.comfyListTemplates.mockResolvedValue([
      { id: "tpl-1", name: "Template 1" },
      { id: "tpl-2", name: "Template 2" },
    ]);
    mocked.comfyGetTemplate.mockResolvedValue({
      id: "tpl-2",
      name: "Template 2",
      workflow: { "20": { inputs: { prompt: "x" }, class_type: "PromptNode" } },
      bindings: [{ node_id: "20", path: "inputs.prompt", param: "prompt" }],
    });

    await renderPanel();

    await waitFor(() => {
      expect(mocked.comfyListTemplates).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByRole("combobox", { name: "comfyui.workflow.templates.select" }), {
      target: { value: "tpl-2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "comfyui.workflow.templates.load" }));

    await waitFor(() => {
      expect(mocked.comfyGetTemplate).toHaveBeenCalledWith("tpl-2");
    });

    const workflowTextarea = screen.getByPlaceholderText("comfyui.workflow.file.placeholder") as HTMLTextAreaElement;
    const bindingsTextarea = screen.getByPlaceholderText("comfyui.workflow.bindings.placeholder") as HTMLTextAreaElement;
    expect(workflowTextarea.value).toContain('"PromptNode"');
    expect(bindingsTextarea.value).toContain('"inputs.prompt"');
  });
});
