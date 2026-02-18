import type { TimelineWorkspace } from "@/lib/api";
import { applyStoryLockPolicy, buildStoryWorkflowFromEditorData, inferBranchBoundaryOrder } from "@/lib/editor/storyWorkflow";

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function prepareWorkspaceForMovedBoundary(
  workspace: TimelineWorkspace,
  branchName: string,
): { workspace: TimelineWorkspace; boundaryOrder: number } | null {
  const editorState = workspace.editorState;
  if (!editorState) return null;

  const nextEditorState = cloneValue(editorState);
  const rebuilt = buildStoryWorkflowFromEditorData({
    data: nextEditorState,
    branchName,
    existing: nextEditorState.storyWorkflow || null,
  });
  const boundaryOrder = inferBranchBoundaryOrder(rebuilt.nodes);
  rebuilt.branchPolicy = {
    ...rebuilt.branchPolicy,
    branchName,
    lockBoundaryOrder: boundaryOrder,
    boundaryConfigured: true,
  };
  nextEditorState.storyWorkflow = applyStoryLockPolicy(rebuilt);

  return {
    workspace: {
      ...workspace,
      editorState: nextEditorState,
    },
    boundaryOrder,
  };
}
