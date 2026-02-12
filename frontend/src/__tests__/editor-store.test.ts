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
      s.selection.selectedCharacterId = "c1";
      return s;
    });

    useEditorStore.getState().deleteCharacter("c1" as any);

    const state = useEditorStore.getState();
    expect(state.data.characters.c1).toBeUndefined();
    expect(state.data.beats.b1.characterIds).toEqual([]);
    expect(state.data.assets.a1.relatedCharacterId).toBeUndefined();
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
      s.selection.selectedCharacterId = "c1";
      return s;
    });

    useEditorStore.getState().mergeCharacter("c1" as any, "c2" as any);

    const state = useEditorStore.getState();
    expect(state.data.characters.c1).toBeUndefined();
    expect(state.data.beats.b1.characterIds).toEqual(["c2"]);
    expect(state.data.assets.a1.relatedCharacterId).toEqual("c2");
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
