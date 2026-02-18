import { describe, expect, it } from "vitest";
import {
  collectNodeStep3MissingCharacterNames,
  resolveNodeRecommendedAction,
  resolveStep4BlockNavigationByRawReason,
  resolveStep4BlockNavigation,
  resolveEffectiveStep4BlockReason,
  resolveStep4BlockBadgeClass,
  resolveStoryActionBadgeClass,
  summarizeNodeStep4ConfirmReadiness,
  summarizeNodeStep4RenderReadiness,
  summarizeNodeStep3Mapping,
} from "@/lib/editor/storyProgress";
import type { EditorStateData, StoryNode } from "@/lib/editor/types";

function makeNode(): StoryNode {
  return {
    id: "node_1",
    order: 0,
    title: "Node 1",
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
  };
}

function makeData(): EditorStateData {
  return {
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
        characterIds: ["c1", "c2"],
        status: "success",
        order: 0,
      },
    },
    characters: {
      c1: { id: "c1", name: "Role A", description: "" },
      c2: { id: "c2", name: "Role B", description: "" },
    },
    assets: {},
    clips: {},
    timelineItems: {},
    sceneOrder: ["s1"],
    ideaVersions: [],
    generationTasks: [],
    activeIdeaVersionId: undefined,
    storyWorkflow: undefined,
  };
}

describe("storyProgress helpers", () => {
  it("summarizes mapped/total/missing correctly", () => {
    const node = makeNode();
    node.step3.characterAssetMap = {
      c1: "asset_1",
      c2: null,
    } as any;
    const data = makeData();
    const summary = summarizeNodeStep3Mapping(node, data);
    expect(summary.total).toBe(2);
    expect(summary.mapped).toBe(1);
    expect(summary.complete).toBe(false);
    expect(summary.missingCharacterIds).toEqual(["c2"]);
  });

  it("collects missing names with id fallback", () => {
    const node = makeNode();
    node.step3.characterAssetMap = { c1: null } as any;
    const data = makeData();
    data.characters.c2 = undefined as any;
    const missingNames = collectNodeStep3MissingCharacterNames(node, data);
    expect(missingNames).toEqual(["Role A", "c2"]);
  });

  it("treats no characters as complete", () => {
    const node = makeNode();
    const data = makeData();
    data.beats.b1.characterIds = [];
    const summary = summarizeNodeStep3Mapping(node, data);
    expect(summary.complete).toBe(true);
    expect(summary.total).toBe(0);
    expect(summary.mapped).toBe(0);
  });

  it("recommends step3 fix when mapping is incomplete", () => {
    const node = makeNode();
    node.step2.status = "done";
    node.step3.status = "in_progress";
    node.step3.characterAssetMap = { c1: "asset_1", c2: null } as any;
    const data = makeData();

    const next = resolveNodeRecommendedAction(node, data);
    expect(next.targetStep).toBe("step3");
    expect(next.action).toBe("fix_step3");
  });

  it("recommends step4 render/review when step3 is complete", () => {
    const node = makeNode();
    node.step3.status = "done";
    node.step3.characterAssetMap = { c1: "asset_1", c2: "asset_2" } as any;
    const data = makeData();

    const renderNext = resolveNodeRecommendedAction(node, data);
    expect(renderNext.targetStep).toBe("step4");
    expect(renderNext.action).toBe("render_step4");

    node.step4.status = "done";
    node.step4.confirmed = true;
    const reviewNext = resolveNodeRecommendedAction(node, data);
    expect(reviewNext.targetStep).toBe("step4");
    expect(reviewNext.action).toBe("review_step4");
  });

  it("summarizes step4 render readiness with merged mapping and primary image", () => {
    const node = makeNode();
    node.step3.status = "done";
    node.step3.characterAssetMap = { c1: "asset_char_1", c2: null } as any;
    node.step4.assetBindings.characterAssetIds = { c2: "asset_char_2" } as any;
    node.step4.assetBindings.backgroundAssetId = "asset_bg";
    const data = makeData();
    data.assets.asset_char_1 = {
      id: "asset_char_1",
      type: "image",
      url: "https://example.com/c1.png",
      source: "generated",
      createdAt: new Date().toISOString(),
    } as any;
    data.assets.asset_char_2 = {
      id: "asset_char_2",
      type: "image",
      url: "https://example.com/c2.png",
      source: "generated",
      createdAt: new Date().toISOString(),
    } as any;
    data.assets.asset_bg = {
      id: "asset_bg",
      type: "image",
      url: "https://example.com/bg.png",
      source: "generated",
      createdAt: new Date().toISOString(),
    } as any;

    const readiness = summarizeNodeStep4RenderReadiness(node, data);
    expect(readiness.mappingComplete).toBe(true);
    expect(readiness.imageBindingMissing).toBe(false);
    expect(readiness.ready).toBe(true);
  });

  it("summarizes step4 confirm readiness blockers in order", () => {
    const node = makeNode();
    const data = makeData();
    const noAssets = summarizeNodeStep4ConfirmReadiness(node, data);
    expect(noAssets.blockReasons).toEqual(["mapping", "image", "video"]);

    data.assets.asset_img = {
      id: "asset_img",
      type: "image",
      url: "https://example.com/img.png",
      source: "generated",
      createdAt: new Date().toISOString(),
    } as any;
    node.step3.characterAssetMap = { c1: "asset_img", c2: "asset_img" } as any;
    node.step4.assetBindings.backgroundAssetId = "asset_img";

    const noVideo = summarizeNodeStep4ConfirmReadiness(node, data);
    expect(noVideo.blockReasons).toEqual(["video"]);
    expect(noVideo.confirmReady).toBe(false);

    data.assets.asset_video = {
      id: "asset_video",
      type: "video",
      url: "https://example.com/v.mp4",
      source: "generated",
      createdAt: new Date().toISOString(),
    } as any;
    node.step4.videoAssetId = "asset_video";
    const ready = summarizeNodeStep4ConfirmReadiness(node, data);
    expect(ready.blockReasons).toEqual([]);
    expect(ready.confirmReady).toBe(true);
  });

  it("adds params blocker for invalid comfyui params json", () => {
    const node = makeNode();
    const data = makeData();
    node.step4.provider = "comfyui";
    node.step4.comfyuiParamsJson = "{ invalid_json: true }";
    const readiness = summarizeNodeStep4ConfirmReadiness(node, data);
    expect(readiness.paramsValid).toBe(false);
    expect(readiness.blockReasons).toEqual(["mapping", "image", "params", "video"]);
  });

  it("returns stable badge classes for action and tone", () => {
    const solid = resolveStoryActionBadgeClass("render_step4");
    const soft = resolveStoryActionBadgeClass("render_step4", "soft");
    expect(solid).toContain("bg-indigo-500/20");
    expect(soft).toContain("bg-indigo-500/10");
    expect(resolveStoryActionBadgeClass("read_only")).toContain("zinc");
  });

  it("resolves blocker navigation target for each step4 blocker", () => {
    expect(resolveStep4BlockNavigation("mapping")).toEqual({
      targetStep: "step3",
      focusTarget: "step3_mapping",
    });
    expect(resolveStep4BlockNavigation("image")).toEqual({
      targetStep: "step4",
      focusTarget: "step4_image_binding",
    });
    expect(resolveStep4BlockNavigation("video")).toEqual({
      targetStep: "step4",
      focusTarget: "step4_video_confirm",
    });
    expect(resolveStep4BlockNavigation("params")).toEqual({
      targetStep: "step4",
      focusTarget: "step4_params",
    });
  });

  it("forces highest-priority blocker as first fix target when present", () => {
    expect(resolveEffectiveStep4BlockReason("video", ["mapping", "image", "video"])).toBe("mapping");
    expect(resolveEffectiveStep4BlockReason("image", ["mapping", "image"])).toBe("mapping");
    expect(resolveEffectiveStep4BlockReason("video", ["image", "video"])).toBe("image");
    expect(resolveEffectiveStep4BlockReason("video", ["params", "video"])).toBe("params");
    expect(resolveEffectiveStep4BlockReason("video", ["video"])).toBe("video");
  });

  it("resolves raw blocker reason with priority and invalid guard", () => {
    expect(resolveStep4BlockNavigationByRawReason("video", ["mapping", "video"])).toEqual({
      targetStep: "step3",
      focusTarget: "step3_mapping",
    });
    expect(resolveStep4BlockNavigationByRawReason("image", ["video", "image"])).toEqual({
      targetStep: "step4",
      focusTarget: "step4_image_binding",
    });
    expect(resolveStep4BlockNavigationByRawReason("video", ["params", "video"])).toEqual({
      targetStep: "step4",
      focusTarget: "step4_params",
    });
    expect(resolveStep4BlockNavigationByRawReason("invalid", ["mapping"])).toBeNull();
    expect(resolveStep4BlockNavigationByRawReason(null, ["mapping"])).toBeNull();
  });

  it("returns explicit class for each step4 blocker badge", () => {
    expect(resolveStep4BlockBadgeClass("mapping")).toContain("amber");
    expect(resolveStep4BlockBadgeClass("image")).toContain("orange");
    expect(resolveStep4BlockBadgeClass("params")).toContain("violet");
    expect(resolveStep4BlockBadgeClass("video")).toContain("rose");
  });
});
