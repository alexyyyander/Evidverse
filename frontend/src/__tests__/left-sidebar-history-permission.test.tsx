import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import LeftSidebar from "@/components/editor/LeftSidebar";
import { I18nProvider } from "@/lib/i18nContext";
import { useEditorStore } from "@/store/editorStore";
import type { ProjectCollabAccessSnapshot } from "@/lib/projectCollaboration";

const mocked = vi.hoisted(() => ({
  gitGraphRender: vi.fn(),
}));

vi.mock("@/components/GitGraph", () => ({
  __esModule: true,
  default: (props: any) => {
    mocked.gitGraphRender(props);
    return <div data-testid="git-graph-proxy" />;
  },
}));

function renderSidebar(collabAccess: ProjectCollabAccessSnapshot) {
  return render(
    <I18nProvider>
      <LeftSidebar projectId="project-1" branchName="main" collabAccess={collabAccess} />
    </I18nProvider>,
  );
}

describe("LeftSidebar history graph permission", () => {
  beforeEach(() => {
    mocked.gitGraphRender.mockReset();
    useEditorStore.getState().updateLayout({ activeLeftTab: "history" });
  });

  it("passes denied boundary permission for non-owner private project", () => {
    renderSidebar({
      viewerId: "viewer-1",
      ownerId: "owner-1",
      isOwner: false,
      isPublic: false,
      canCreateBranch: false,
      canMoveBoundaryFromCommit: false,
      canForkDirectly: false,
      requiresForkRequest: true,
      canForkFromCommit: true,
    });

    return waitFor(() => {
      const props = mocked.gitGraphRender.mock.calls.at(-1)?.[0];
      expect(props.canMoveBoundaryFromCommit).toBe(false);
      expect(props.canForkFromCommit).toBe(true);
      expect(typeof props.moveBoundaryDeniedReason).toBe("string");
      expect(String(props.moveBoundaryDeniedReason).length).toBeGreaterThan(0);
      expect(
        screen.getByText(
          /branch collaboration is available on public repositories|分支协作仅对公开仓库开放|ブランチ協作は公開リポジトリで利用できます/i,
        ),
      ).toBeInTheDocument();
    });
  });

  it("allows boundary move for owner even when project is private", () => {
    renderSidebar({
      viewerId: "owner-1",
      ownerId: "owner-1",
      isOwner: true,
      isPublic: false,
      canCreateBranch: true,
      canMoveBoundaryFromCommit: true,
      canForkDirectly: true,
      requiresForkRequest: false,
      canForkFromCommit: true,
    });

    return waitFor(() => {
      const props = mocked.gitGraphRender.mock.calls.at(-1)?.[0];
      expect(props.canMoveBoundaryFromCommit).toBe(true);
      expect(props.moveBoundaryDeniedReason).toBeUndefined();
      expect(
        screen.queryByText(
          /branch collaboration is available on public repositories|分支协作仅对公开仓库开放|ブランチ協作は公開リポジトリで利用できます/i,
        ),
      ).toBeNull();
    });
  });

  it("shows auth-required hint when history menu is opened without login token", () => {
    renderSidebar({
      viewerId: null,
      ownerId: "owner-1",
      isOwner: false,
      isPublic: true,
      canCreateBranch: true,
      canMoveBoundaryFromCommit: true,
      canForkDirectly: false,
      requiresForkRequest: true,
      canForkFromCommit: true,
    });

    return waitFor(() => {
      const props = mocked.gitGraphRender.mock.calls.at(-1)?.[0];
      expect(props.canMoveBoundaryFromCommit).toBe(true);
      expect(props.moveBoundaryDeniedReason).toBeUndefined();
      expect(
        screen.getByText(
          /login required to move branch boundary from this commit|登录后才能从该提交前移分支边界|このコミットからブランチ境界を移動するにはログインが必要です/i,
        ),
      ).toBeInTheDocument();
    });
  });
});
