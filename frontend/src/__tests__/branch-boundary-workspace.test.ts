import { describe, expect, it } from "vitest";
import type { TimelineWorkspace } from "@/lib/api";
import type { EditorStateData, StoryNode } from "@/lib/editor/types";
import { prepareWorkspaceForMovedBoundary } from "@/lib/editor/branchBoundary";

function makeNode(order: number, beatId: string, confirmed: boolean): StoryNode {
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
      status: confirmed ? "done" : "todo",
      confirmed,
      provider: "segment",
      comfyuiParamsJson: "{}",
      videoAssetId: confirmed ? `asset_video_${order + 1}` : undefined,
      assetBindings: { characterAssetIds: {} },
    },
  };
}

function makeEditorStateData(): EditorStateData {
  const n1 = makeNode(0, "b1", true);
  const n2 = makeNode(1, "b2", false);
  return {
    scenes: {
      s1: { id: "s1", title: "Scene 1", summary: "", order: 0, beatIds: ["b1", "b2"] },
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
      selectedNodeId: n1.id,
      nodes: [n1, n2],
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
        branchName: "branch/source",
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

describe("prepareWorkspaceForMovedBoundary", () => {
  it("returns null when workspace has no editorState", () => {
    const workspace: TimelineWorkspace = {
      editorData: [],
      effects: {},
    };
    const out = prepareWorkspaceForMovedBoundary(workspace, "branch/rewrite");
    expect(out).toBeNull();
  });

  it("writes inferred boundary as configured and locks prefix nodes", () => {
    const workspace: TimelineWorkspace = {
      editorData: [],
      effects: {},
      editorState: makeEditorStateData(),
    };
    const out = prepareWorkspaceForMovedBoundary(workspace, "branch/rewrite");
    expect(out).not.toBeNull();
    expect(out?.boundaryOrder).toBe(1);
    expect(out?.workspace.editorState?.storyWorkflow?.branchPolicy.branchName).toBe("branch/rewrite");
    expect(out?.workspace.editorState?.storyWorkflow?.branchPolicy.boundaryConfigured).toBe(true);
    expect(out?.workspace.editorState?.storyWorkflow?.branchPolicy.lockBoundaryOrder).toBe(1);
    expect(out?.workspace.editorState?.storyWorkflow?.nodes[0].locked).toBe(true);
    expect(out?.workspace.editorState?.storyWorkflow?.nodes[1].locked).toBe(false);
  });

  it("does not mutate original workspace object", () => {
    const workspace: TimelineWorkspace = {
      editorData: [],
      effects: {},
      editorState: makeEditorStateData(),
    };
    const out = prepareWorkspaceForMovedBoundary(workspace, "branch/rewrite");
    expect(out).not.toBeNull();
    expect(workspace.editorState?.storyWorkflow?.branchPolicy.branchName).toBe("branch/source");
    expect(workspace.editorState?.storyWorkflow?.branchPolicy.boundaryConfigured).toBe(false);
  });
});
