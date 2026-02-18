import { beforeEach, describe, expect, it } from "vitest";
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

beforeEach(() => resetStores());

function attachVideoAssetToNode(nodeId: string, beatId: string, assetId = "asset_video_1") {
  useEditorStore.setState((state: any) => {
    const imageAssetId = `${assetId}_bg`;
    state.data.assets[imageAssetId] = {
      id: imageAssetId,
      type: "image",
      url: "https://example.com/background.png",
      source: "generated",
      relatedBeatId: beatId,
      createdAt: new Date().toISOString(),
    };
    state.data.assets[assetId] = {
      id: assetId,
      type: "video",
      url: "https://example.com/video.mp4",
      duration: 5,
      source: "generated",
      relatedBeatId: beatId,
      createdAt: new Date().toISOString(),
    };
    const node = state.data.storyWorkflow.nodes.find((n: any) => n.id === nodeId);
    if (node) {
      node.step4.videoAssetId = assetId;
      node.step4.status = "in_progress";
      node.step4.assetBindings.backgroundAssetId = imageAssetId;
    }
    return state;
  });
}

describe("story workflow store", () => {
  it("initializes workflow from storyboard", () => {
    useEditorStore.getState().initializeStoryWorkflowFromStoryboard({
      branchName: "main",
      ideaParams: {
        style: "default",
        aspectRatio: "16:9",
        duration: 20,
        shotCount: 2,
        pace: "normal",
        language: "zh",
        resolution: "1080p",
      },
      storyboard: [
        { scene_number: 1, narration: "n1", visual_description: "v1" },
        { scene_number: 2, narration: "n2", visual_description: "v2" },
      ],
    });

    const state = useEditorStore.getState();
    expect(state.data.storyWorkflow).toBeDefined();
    expect((state.data.storyWorkflow?.nodes || []).length).toBe(2);
    expect(state.selection.selectedStoryNodeId).toBeTruthy();
    expect(state.data.storyWorkflow?.activeStep).toBe("step2");
  });

  it("enforces lock boundary on node updates", () => {
    useEditorStore.getState().initializeStoryWorkflowFromStoryboard({
      branchName: "branch/x",
      ideaParams: {
        style: "default",
        aspectRatio: "16:9",
        duration: 20,
        shotCount: 2,
        pace: "normal",
        language: "zh",
        resolution: "1080p",
      },
      storyboard: [
        { scene_number: 1, narration: "n1", visual_description: "v1" },
        { scene_number: 2, narration: "n2", visual_description: "v2" },
      ],
    });
    useEditorStore.getState().setBranchBoundary(1);

    const first = useEditorStore.getState().data.storyWorkflow!.nodes[0];
    const second = useEditorStore.getState().data.storyWorkflow!.nodes[1];

    const blocked = useEditorStore.getState().updateNodeStep2(first.id, { summary: "blocked" });
    const ok = useEditorStore.getState().updateNodeStep2(second.id, { summary: "allowed" });

    expect(blocked).toBe(false);
    expect(ok).toBe(true);
  });

  it("confirmNodeVideo advances to next node and step2", () => {
    useEditorStore.getState().initializeStoryWorkflowFromStoryboard({
      branchName: "main",
      ideaParams: {
        style: "default",
        aspectRatio: "16:9",
        duration: 20,
        shotCount: 2,
        pace: "normal",
        language: "zh",
        resolution: "1080p",
      },
      storyboard: [
        { scene_number: 1, narration: "n1", visual_description: "v1" },
        { scene_number: 2, narration: "n2", visual_description: "v2" },
      ],
    });

    const firstNode = useEditorStore.getState().data.storyWorkflow!.nodes[0];
    const secondNode = useEditorStore.getState().data.storyWorkflow!.nodes[1];
    attachVideoAssetToNode(firstNode.id, firstNode.beatIds[0], "asset_video_first");

    const result = useEditorStore.getState().confirmNodeVideo(firstNode.id);

    expect(result.ok).toBe(true);
    const state = useEditorStore.getState();
    expect(state.data.storyWorkflow?.activeStep).toBe("step2");
    expect(state.data.storyWorkflow?.selectedNodeId).toBe(secondNode.id);
    expect(state.data.storyWorkflow?.ui?.eventFlowPulseNodeId).toBe(firstNode.id);
    expect(typeof state.data.storyWorkflow?.ui?.eventFlowPulseAt).toBe("number");
  });

  it("confirmNodeVideo skips already confirmed node and jumps to next pending node", () => {
    useEditorStore.getState().initializeStoryWorkflowFromStoryboard({
      branchName: "main",
      ideaParams: {
        style: "default",
        aspectRatio: "16:9",
        duration: 30,
        shotCount: 3,
        pace: "normal",
        language: "zh",
        resolution: "1080p",
      },
      storyboard: [
        { scene_number: 1, narration: "n1", visual_description: "v1" },
        { scene_number: 2, narration: "n2", visual_description: "v2" },
        { scene_number: 3, narration: "n3", visual_description: "v3" },
      ],
    });

    const firstNode = useEditorStore.getState().data.storyWorkflow!.nodes[0];
    const secondNode = useEditorStore.getState().data.storyWorkflow!.nodes[1];
    const thirdNode = useEditorStore.getState().data.storyWorkflow!.nodes[2];
    const thirdBeatId = thirdNode.beatIds[0];
    attachVideoAssetToNode(firstNode.id, firstNode.beatIds[0], "asset_video_first");

    useEditorStore.setState((state: any) => {
      const node = state.data.storyWorkflow.nodes.find((n: any) => n.id === secondNode.id);
      node.step4.confirmed = true;
      node.step4.status = "done";
      return state;
    });

    const result = useEditorStore.getState().confirmNodeVideo(firstNode.id);

    expect(result.ok).toBe(true);
    const state = useEditorStore.getState();
    expect(state.data.storyWorkflow?.activeStep).toBe("step2");
    expect(state.data.storyWorkflow?.selectedNodeId).toBe(thirdNode.id);
    expect(state.selection.selectedBeatId).toBe(thirdBeatId);
  });

  it("blocks confirmNodeVideo when no video asset is available", () => {
    useEditorStore.getState().initializeStoryWorkflowFromStoryboard({
      branchName: "main",
      ideaParams: {
        style: "default",
        aspectRatio: "16:9",
        duration: 20,
        shotCount: 2,
        pace: "normal",
        language: "zh",
        resolution: "1080p",
      },
      storyboard: [{ scene_number: 1, narration: "n1", visual_description: "v1" }],
    });

    const node = useEditorStore.getState().data.storyWorkflow!.nodes[0];
    useEditorStore.setState((state: any) => {
      state.data.assets.asset_img_only = {
        id: "asset_img_only",
        type: "image",
        url: "https://example.com/background-only.png",
        source: "generated",
        createdAt: new Date().toISOString(),
      };
      const latest = state.data.storyWorkflow.nodes.find((n: any) => n.id === node.id);
      if (latest) latest.step4.assetBindings.backgroundAssetId = "asset_img_only";
      return state;
    });
    const result = useEditorStore.getState().confirmNodeVideo(node.id);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("missing_video");
    }
    const latest = useEditorStore.getState().data.storyWorkflow!.nodes[0];
    expect(latest.step4.confirmed).toBe(false);
    expect(latest.step4.status).not.toBe("done");
  });

  it("syncs step3 character mapping into step4 bindings", () => {
    useEditorStore.getState().initializeStoryWorkflowFromStoryboard({
      branchName: "main",
      ideaParams: {
        style: "default",
        aspectRatio: "16:9",
        duration: 20,
        shotCount: 2,
        pace: "normal",
        language: "zh",
        resolution: "1080p",
      },
      storyboard: [{ scene_number: 1, narration: "n1", visual_description: "v1" }],
    });

    useEditorStore.setState((state: any) => {
      const workflow = state.data.storyWorkflow;
      const node = workflow.nodes[0];
      const beatId = node.beatIds[0];
      state.data.characters = {
        c1: { id: "c1", name: "Role A", description: "" },
      };
      state.data.beats[beatId].characterIds = ["c1"];
      node.step3.characterAssetMap = { c1: null };
      node.step4.assetBindings.characterAssetIds = {};
      return state;
    });

    const nodeId = useEditorStore.getState().data.storyWorkflow!.nodes[0].id;
    const ok = useEditorStore.getState().updateNodeStep3Mapping(nodeId, { c1: "asset_1" as any });
    expect(ok).toBe(true);

    const state = useEditorStore.getState();
    const node = state.data.storyWorkflow!.nodes[0];
    expect(node.step3.characterAssetMap.c1).toBe("asset_1");
    expect(node.step4.assetBindings.characterAssetIds.c1).toBe("asset_1");
  });

  it("updates step4 provider/template for unlocked node and blocks locked node", () => {
    useEditorStore.getState().initializeStoryWorkflowFromStoryboard({
      branchName: "branch/x",
      ideaParams: {
        style: "default",
        aspectRatio: "16:9",
        duration: 20,
        shotCount: 2,
        pace: "normal",
        language: "zh",
        resolution: "1080p",
      },
      storyboard: [
        { scene_number: 1, narration: "n1", visual_description: "v1" },
        { scene_number: 2, narration: "n2", visual_description: "v2" },
      ],
    });
    useEditorStore.getState().setBranchBoundary(1);

    const lockedNode = useEditorStore.getState().data.storyWorkflow!.nodes[0];
    const unlockedNode = useEditorStore.getState().data.storyWorkflow!.nodes[1];

    const blocked = useEditorStore.getState().updateNodeStep4(lockedNode.id, {
      provider: "comfyui",
      comfyuiTemplateId: "tpl_locked",
      comfyuiParamsJson: "{\"seed\":1}",
    } as any);
    const updated = useEditorStore.getState().updateNodeStep4(unlockedNode.id, {
      provider: "comfyui",
      comfyuiTemplateId: "tpl_ok",
      comfyuiParamsJson: "{\"seed\":123}",
    } as any);

    expect(blocked).toBe(false);
    expect(updated).toBe(true);
    const latest = useEditorStore.getState().data.storyWorkflow!.nodes[1];
    expect(latest.step4.provider).toBe("comfyui");
    expect(latest.step4.comfyuiTemplateId).toBe("tpl_ok");
    expect(latest.step4.comfyuiParamsJson).toBe("{\"seed\":123}");
  });

  it("guards step4 activation and confirmNodeStep3 when mapping is incomplete", () => {
    useEditorStore.getState().initializeStoryWorkflowFromStoryboard({
      branchName: "main",
      ideaParams: {
        style: "default",
        aspectRatio: "16:9",
        duration: 20,
        shotCount: 2,
        pace: "normal",
        language: "zh",
        resolution: "1080p",
      },
      storyboard: [{ scene_number: 1, narration: "n1", visual_description: "v1" }],
    });

    useEditorStore.setState((state: any) => {
      const workflow = state.data.storyWorkflow;
      const node = workflow.nodes[0];
      const beatId = node.beatIds[0];
      state.data.characters = {
        c1: { id: "c1", name: "Role A", description: "" },
      };
      state.data.beats[beatId].characterIds = ["c1"];
      node.step3.characterAssetMap = {};
      return state;
    });

    useEditorStore.getState().setActiveStep("step4");
    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step2");

    const nodeId = useEditorStore.getState().data.storyWorkflow!.nodes[0].id;
    const blocked = useEditorStore.getState().confirmNodeStep3(nodeId);
    expect(blocked.ok).toBe(false);
    expect(blocked.missing).toEqual(["Role A"]);
    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step2");

    useEditorStore.getState().updateNodeStep3Mapping(nodeId, { c1: "asset_1" as any });
    const passed = useEditorStore.getState().confirmNodeStep3(nodeId);
    expect(passed.ok).toBe(true);
    expect(useEditorStore.getState().data.storyWorkflow?.activeStep).toBe("step4");
    expect(useEditorStore.getState().data.storyWorkflow?.nodes[0].step3.status).toBe("done");
  });
});
