import { describe, expect, it } from "vitest";
import { buildStoryWorkflowFromEditorData, inferBranchBoundaryOrder } from "@/lib/editor/storyWorkflow";
import type { EditorStateData, StoryNode } from "@/lib/editor/types";

function makeNode(
  order: number,
  beatId: string,
  overrides?: Partial<StoryNode>,
): StoryNode {
  return {
    id: `node_${order + 1}`,
    order,
    title: `Node ${order + 1}`,
    sceneId: "s1",
    beatIds: [beatId],
    locked: false,
    step2: {
      status: "done",
      scriptMode: "strict_screenplay",
      segmentLength: "medium",
      summary: `summary_${order + 1}`,
      background: `background_${order + 1}`,
      characterChanges: "",
      encounters: "",
    },
    step3: {
      status: "done",
      provider: "comfyui",
      stylePrompt: "",
      characterAssetMap: {},
      comfyuiTemplateId: "tpl_1",
    },
    step4: {
      status: "todo",
      confirmed: false,
      provider: "segment",
      comfyuiParamsJson: "{}",
      assetBindings: { characterAssetIds: {} },
    },
    ...overrides,
  };
}

function makeEditorData(nodes: StoryNode[]): EditorStateData {
  return {
    scenes: {
      s1: { id: "s1", title: "Scene 1", summary: "", order: 0, beatIds: ["b1", "b2", "b3"] },
    },
    beats: {
      b1: {
        id: "b1",
        sceneId: "s1",
        narration: "n1",
        dialogue: "",
        cameraDescription: "bg1",
        suggestedDuration: 5,
        characterIds: [],
        status: "success",
        order: 0,
      },
      b2: {
        id: "b2",
        sceneId: "s1",
        narration: "n2",
        dialogue: "",
        cameraDescription: "bg2",
        suggestedDuration: 5,
        characterIds: [],
        status: "success",
        order: 1,
      },
      b3: {
        id: "b3",
        sceneId: "s1",
        narration: "n3",
        dialogue: "",
        cameraDescription: "bg3",
        suggestedDuration: 5,
        characterIds: [],
        status: "success",
        order: 2,
      },
    },
    characters: {},
    assets: {},
    clips: {},
    timelineItems: {},
    sceneOrder: ["s1"],
    ideaVersions: [],
    generationTasks: [],
    activeIdeaVersionId: undefined,
    storyWorkflow: {
      version: 1,
      activeStep: "step2",
      selectedNodeId: nodes[0]?.id || null,
      nodes,
      global: {
        storyMode: "generate",
        storyStyle: "series",
        tone: "serious",
        llmProvider: "auto",
        scriptMode: "strict_screenplay",
        segmentLength: "medium",
        characterSeeds: [],
      },
      branchPolicy: {
        branchName: "branch/demo",
        lockBoundaryOrder: 0,
        boundaryConfigured: false,
      },
      meta: {
        requestedProvider: "auto",
        fallbackUsed: false,
        warnings: [],
      },
      ui: {
        step4AutoFillEnabled: false,
      },
    },
  };
}

describe("story workflow boundary inference", () => {
  it("infers contiguous persisted prefix only", () => {
    const boundary = inferBranchBoundaryOrder([
      makeNode(0, "b1", { step4: { status: "done", confirmed: true, provider: "segment", assetBindings: { characterAssetIds: {} } } as any }),
      makeNode(1, "b2", { step4: { status: "done", confirmed: false, provider: "segment", videoAssetId: "asset_video_2", assetBindings: { characterAssetIds: {} } } as any }),
      makeNode(2, "b3", { step4: { status: "todo", confirmed: false, provider: "segment", assetBindings: { characterAssetIds: {} } } as any }),
    ]);
    expect(boundary).toBe(2);
  });

  it("returns zero when prefix is not persisted", () => {
    const boundary = inferBranchBoundaryOrder([
      makeNode(0, "b1", { step4: { status: "in_progress", confirmed: false, provider: "segment", assetBindings: { characterAssetIds: {} } } as any }),
      makeNode(1, "b2", { step4: { status: "done", confirmed: true, provider: "segment", assetBindings: { characterAssetIds: {} } } as any }),
    ]);
    expect(boundary).toBe(0);
  });

  it("applies inferred boundary for non-main branch when boundary is not configured", () => {
    const sourceNodes = [
      makeNode(0, "b1", { step4: { status: "done", confirmed: true, provider: "segment", assetBindings: { characterAssetIds: {} } } as any }),
      makeNode(1, "b2", { step4: { status: "todo", confirmed: false, provider: "segment", assetBindings: { characterAssetIds: {} } } as any }),
      makeNode(2, "b3", { step4: { status: "todo", confirmed: false, provider: "segment", assetBindings: { characterAssetIds: {} } } as any }),
    ];
    const data = makeEditorData(sourceNodes);

    const next = buildStoryWorkflowFromEditorData({
      data,
      branchName: "branch/demo",
      existing: data.storyWorkflow || null,
    });

    expect(next.branchPolicy.boundaryConfigured).toBe(false);
    expect(next.branchPolicy.lockBoundaryOrder).toBe(1);
    expect(next.nodes[0].locked).toBe(true);
    expect(next.nodes[1].locked).toBe(false);
  });
});
