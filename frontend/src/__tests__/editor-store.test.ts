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
      activeLeftTab: "script",
      activeRightTab: "inspector",
      followSelection: true,
    },
    history: { undo: [], redo: [], recording: false, applying: false },
  } as any);
}

beforeEach(() => resetStores());

describe("editorStore character ops", () => {
  it("deletes character and removes references", () => {
    useEditorStore.setState((s: any) => {
      s.data.characters = { c1: { id: "c1", name: "A", description: "" } };
      s.data.beats = {
        b1: {
          id: "b1",
          sceneId: "s1",
          narration: "",
          dialogue: "",
          cameraDescription: "",
          suggestedDuration: 1,
          characterIds: ["c1"],
          status: "success",
          order: 0,
        },
      };
      s.data.assets = {
        a1: { id: "a1", type: "image", url: "u", source: "generated", relatedCharacterId: "c1", createdAt: "t" },
      };
      s.data.storyWorkflow = {
        version: 1,
        activeStep: "step1",
        selectedNodeId: null,
        nodes: [],
        global: {
          storyMode: "generate",
          storyStyle: "series",
          tone: "serious",
          llmProvider: "auto",
          scriptMode: "strict_screenplay",
          segmentLength: "medium",
          characterSeeds: [
            {
              id: "seed_1",
              name: "Seed A",
              identity: "",
              personality: "",
              appearance: "",
              fateKeywords: [],
              linkedCharacterId: "c1",
            },
          ],
        },
        branchPolicy: { branchName: "main", lockBoundaryOrder: null, boundaryConfigured: true },
      };
      s.selection.selectedCharacterId = "c1";
      return s;
    });

    useEditorStore.getState().deleteCharacter("c1" as any);

    const state = useEditorStore.getState();
    expect(state.data.characters.c1).toBeUndefined();
    expect(state.data.beats.b1.characterIds).toEqual([]);
    expect(state.data.assets.a1.relatedCharacterId).toBeUndefined();
    expect(state.data.storyWorkflow?.global.characterSeeds[0]?.linkedCharacterId).toBeUndefined();
    expect(state.selection.selectedCharacterId).toBeNull();
  });

  it("merges character and rewrites references", () => {
    useEditorStore.setState((s: any) => {
      s.data.characters = {
        c1: { id: "c1", name: "A", description: "" },
        c2: { id: "c2", name: "B", description: "" },
      };
      s.data.beats = {
        b1: {
          id: "b1",
          sceneId: "s1",
          narration: "",
          dialogue: "",
          cameraDescription: "",
          suggestedDuration: 1,
          characterIds: ["c1", "c2"],
          status: "success",
          order: 0,
        },
      };
      s.data.assets = {
        a1: { id: "a1", type: "image", url: "u", source: "generated", relatedCharacterId: "c1", createdAt: "t" },
      };
      s.data.storyWorkflow = {
        version: 1,
        activeStep: "step1",
        selectedNodeId: null,
        nodes: [],
        global: {
          storyMode: "generate",
          storyStyle: "series",
          tone: "serious",
          llmProvider: "auto",
          scriptMode: "strict_screenplay",
          segmentLength: "medium",
          characterSeeds: [
            {
              id: "seed_1",
              name: "Seed A",
              identity: "",
              personality: "",
              appearance: "",
              fateKeywords: [],
              linkedCharacterId: "c1",
            },
          ],
        },
        branchPolicy: { branchName: "main", lockBoundaryOrder: null, boundaryConfigured: true },
      };
      s.selection.selectedCharacterId = "c1";
      return s;
    });

    useEditorStore.getState().mergeCharacter("c1" as any, "c2" as any);

    const state = useEditorStore.getState();
    expect(state.data.characters.c1).toBeUndefined();
    expect(state.data.beats.b1.characterIds).toEqual(["c2"]);
    expect(state.data.assets.a1.relatedCharacterId).toEqual("c2");
    expect(state.data.storyWorkflow?.global.characterSeeds[0]?.linkedCharacterId).toEqual("c2");
    expect(state.selection.selectedCharacterId).toEqual("c2");
  });
});

describe("editorStore history", () => {
  it("undo/redo restores beat edits", () => {
    useEditorStore.setState((s: any) => {
      s.data.scenes = { s1: { id: "s1", title: "S", summary: "", order: 0, beatIds: ["b1"] } };
      s.data.sceneOrder = ["s1"];
      s.data.beats = {
        b1: {
          id: "b1",
          sceneId: "s1",
          narration: "n1",
          dialogue: "",
          cameraDescription: "",
          suggestedDuration: 1,
          characterIds: [],
          status: "success",
          order: 0,
        },
      };
      return s;
    });

    useEditorStore.getState().updateBeat("b1" as any, { narration: "n2" } as any);
    expect(useEditorStore.getState().data.beats.b1.narration).toBe("n2");

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().data.beats.b1.narration).toBe("n1");

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().data.beats.b1.narration).toBe("n2");
  });
});

describe("applyClipTaskResult mode", () => {
  it("replace clears existing timelineItems", () => {
    useEditorStore.setState((s: any) => {
      s.data.characters = { c1: { id: "c1", name: "A", description: "" } };
      s.data.timelineItems = { t0: { id: "t0", clipId: "c0", trackId: "0", startTime: 0, duration: 1, linkedBeatId: "b0" } };
      s.data.beats = {
        b0: {
          id: "b0",
          sceneId: "s0",
          narration: "old",
          dialogue: "",
          cameraDescription: "",
          suggestedDuration: 1,
          characterIds: [],
          status: "success",
          order: 0,
        },
      };
      s.data.scenes = { s0: { id: "s0", title: "S0", summary: "", order: 0, beatIds: ["b0"] } };
      s.data.sceneOrder = ["s0"];
      return s;
    });

    const result: any = {
      status: "succeeded",
      clips: [{ scene_number: 1, narration: "new", image_url: "", video_url: "http://x" }],
    };

    useEditorStore.getState().applyClipTaskResult("task1", result, { mode: "replace" });

    const state = useEditorStore.getState();
    expect(Object.keys(state.data.timelineItems).length).toBe(1);
    expect(state.data.characters.c1).toBeDefined();
  });
});

describe("timeline sync helpers", () => {
  it("syncTimelineFromRows updates start/duration and track", () => {
    useEditorStore.setState((s: any) => {
      s.data.timelineItems = { t1: { id: "t1", clipId: "c1", trackId: "0", startTime: 0, duration: 1 } };
      return s;
    });

    useEditorStore.getState().syncTimelineFromRows([{ id: "2", actions: [{ id: "t1", start: 3, end: 5 }] }]);
    const item = useEditorStore.getState().data.timelineItems.t1 as any;
    expect(item.trackId).toBe("2");
    expect(item.startTime).toBe(3);
    expect(item.duration).toBe(2);
  });
});

describe("applyBeatClipResult", () => {
  it("appends a new timeline item when none exists", () => {
    useEditorStore.setState((s: any) => {
      s.data.scenes = { s1: { id: "s1", title: "S", summary: "", order: 0, beatIds: ["b1"] } };
      s.data.sceneOrder = ["s1"];
      s.data.beats = {
        b1: {
          id: "b1",
          sceneId: "s1",
          narration: "n",
          dialogue: "",
          cameraDescription: "",
          suggestedDuration: 2,
          characterIds: [],
          status: "success",
          order: 0,
        },
      };
      return s;
    });

    const result: any = { status: "succeeded", clips: [{ video_url: "http://x", image_url: "" }] };
    useEditorStore.getState().applyBeatClipResult({ taskId: "t", beatId: "b1" as any, result, mode: "append" });
    expect(Object.values(useEditorStore.getState().data.timelineItems).length).toBe(1);
  });
});

describe("applySegmentTaskResult", () => {
  it("replaces existing beat timeline clip instead of skipping", () => {
    useEditorStore.setState((s: any) => {
      s.data.scenes = { s1: { id: "s1", title: "S", summary: "", order: 0, beatIds: ["b1"] } };
      s.data.sceneOrder = ["s1"];
      s.data.beats = {
        b1: {
          id: "b1",
          sceneId: "s1",
          narration: "n",
          dialogue: "",
          cameraDescription: "",
          suggestedDuration: 3,
          characterIds: [],
          status: "success",
          order: 0,
        },
      };
      s.data.assets = {
        a0: {
          id: "a0",
          type: "video",
          url: "http://old-video",
          duration: 3,
          source: "generated",
          relatedBeatId: "b1",
          createdAt: "t0",
        },
      };
      s.data.clips = {
        c0: { id: "c0", assetId: "a0", startOffset: 0 },
      };
      s.data.timelineItems = {
        t0: { id: "t0", clipId: "c0", trackId: "0", startTime: 0, duration: 3, linkedBeatId: "b1" },
      };
      return s;
    });

    useEditorStore.getState().applySegmentTaskResult({
      taskId: "task-seg-1",
      beatId: "b1" as any,
      result: {
        status: "succeeded",
        video_url: "http://new-video",
        image_url: "http://new-image",
      } as any,
    });

    const state = useEditorStore.getState();
    expect(Object.keys(state.data.timelineItems)).toEqual(["t0"]);
    expect(state.data.timelineItems.t0.clipId).not.toBe("c0");
    const newClip = state.data.clips[state.data.timelineItems.t0.clipId as any];
    expect(newClip).toBeDefined();
    const newVideoAsset = state.data.assets[newClip.assetId as any];
    expect(newVideoAsset.url).toBe("http://new-video");
  });
});

describe("applyComfyuiTaskResult", () => {
  it("maps comfyui image output to character and node mapping via task refIds", () => {
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

    const workflow = useEditorStore.getState().data.storyWorkflow!;
    const node = workflow.nodes[0];
    const beatId = node.beatIds[0];

    useEditorStore.setState((s: any) => {
      s.data.characters = {
        c1: { id: "c1", name: "Role A", description: "desc" },
      };
      s.data.beats[beatId].characterIds = ["c1"];
      s.data.generationTasks = [
        {
          id: "task-cui-img",
          type: "comfyui_image",
          status: "PENDING",
          createdAt: "t0",
          input: { templateId: "tpl_1", params: { prompt: "Role A" } },
          refIds: { characterId: "c1", nodeId: node.id, beatId },
        },
      ];
      return s;
    });

    useEditorStore.getState().applyComfyuiTaskResult({
      taskId: "task-cui-img",
      result: { output_url: "http://char-image", filename: "char.png" },
    });

    const state = useEditorStore.getState();
    const currentNode = state.data.storyWorkflow!.nodes[0];
    const mappedAssetId = currentNode.step3.characterAssetMap.c1;
    expect(mappedAssetId).toBeTruthy();
    expect(currentNode.step4.assetBindings.characterAssetIds.c1).toBe(mappedAssetId);
    expect(state.data.assets[mappedAssetId as any].relatedCharacterId).toBe("c1");
    expect(state.data.characters.c1.avatarUrl).toBe("http://char-image");
    expect(state.selection.selectedCharacterId).toBe("c1");
  });

  it("uses beat duration when comfyui video only carries beatId in task refIds", () => {
    useEditorStore.setState((s: any) => {
      s.data.scenes = { s1: { id: "s1", title: "S", summary: "", order: 0, beatIds: ["b1"] } };
      s.data.sceneOrder = ["s1"];
      s.data.beats = {
        b1: {
          id: "b1",
          sceneId: "s1",
          narration: "n",
          dialogue: "",
          cameraDescription: "",
          suggestedDuration: 7,
          characterIds: [],
          status: "success",
          order: 0,
        },
      };
      s.data.generationTasks = [
        {
          id: "task-cui-video",
          type: "comfyui_video",
          status: "PENDING",
          createdAt: "t0",
          input: { workflow: { x: 1 } },
          refIds: { beatId: "b1" },
        },
      ];
      return s;
    });

    useEditorStore.getState().applyComfyuiTaskResult({
      taskId: "task-cui-video",
      result: { output_url: "http://video", filename: "scene.mp4" },
    });

    const state = useEditorStore.getState();
    const items = Object.values(state.data.timelineItems);
    expect(items).toHaveLength(1);
    expect(items[0].linkedBeatId).toBe("b1");
    expect(items[0].duration).toBe(7);
  });
});

describe("asset helpers", () => {
  it("adds standalone image asset for step1 seed uploads", () => {
    const assetId = useEditorStore.getState().addImageAsset({
      url: "http://seed-image",
      source: "upload",
      generationParams: { stage: "step1_seed", seedId: "seed_1" },
    });

    const asset = useEditorStore.getState().data.assets[assetId as any];
    expect(asset).toBeDefined();
    expect(asset.type).toBe("image");
    expect(asset.source).toBe("upload");
    expect(asset.url).toBe("http://seed-image");
    expect(asset.generationParams?.stage).toBe("step1_seed");
    expect(asset.generationParams?.seedId).toBe("seed_1");
  });
});
