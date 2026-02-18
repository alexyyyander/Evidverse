import { projectApi } from "@/lib/api";
import { isApiError } from "@/lib/api/errors";

export type ForkFromCommitResult =
  | { mode: "forked"; projectId: string }
  | { mode: "requested" };

export async function forkFromCommitBestEffort(
  projectId: string,
  commitHash: string,
): Promise<ForkFromCommitResult> {
  try {
    const project = await projectApi.fork(projectId, commitHash);
    return { mode: "forked", projectId: project.id };
  } catch (error) {
    if (!isApiError(error) || error.status !== 403) {
      throw error;
    }
  }

  await projectApi.requestFork(projectId, commitHash);
  return { mode: "requested" };
}

