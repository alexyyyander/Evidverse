import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { I18nProvider } from "@/lib/i18nContext";
import ProjectPreviewClient from "@/app/(app)/project/[id]/ProjectPreviewClient";

const mocked = vi.hoisted(() => ({
  push: vi.fn(),
  token: "token" as string | null,
  meResult: { data: { id: "viewer-1" } } as any,
  publicProjectResult: null as any,
  gitGraphRender: vi.fn(),
  getBranches: vi.fn(),
  forkBranch: vi.fn(),
  getBranchParticipations: vi.fn(),
  getWorkspace: vi.fn(),
  toggleLike: vi.fn(),
  requestFork: vi.fn(),
  listForkRequests: vi.fn(),
  approveForkRequest: vi.fn(),
  rejectForkRequest: vi.fn(),
  listByProject: vi.fn(),
  createMr: vi.fn(),
  mergeMr: vi.fn(),
  closeMr: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocked.push }),
}));

vi.mock("@/lib/auth/useAuthToken", () => ({
  useAuthToken: () => mocked.token,
}));

vi.mock("@/lib/queries/useMe", () => ({
  useMe: () => mocked.meResult,
}));

vi.mock("@/lib/queries/usePublicProject", () => ({
  usePublicProject: () => mocked.publicProjectResult,
}));

vi.mock("@/components/GitGraph", () => ({
  __esModule: true,
  default: (props: any) => {
    mocked.gitGraphRender(props);
    return <div data-testid="git-graph-stub">graph</div>;
  },
}));

vi.mock("@/components/ui/toast", () => ({
  toast: (...args: any[]) => mocked.toast(...args),
}));

vi.mock("@/lib/api", () => ({
  projectApi: {
    getBranches: (...args: any[]) => mocked.getBranches(...args),
    forkBranch: (...args: any[]) => mocked.forkBranch(...args),
    getBranchParticipations: (...args: any[]) => mocked.getBranchParticipations(...args),
    getWorkspace: (...args: any[]) => mocked.getWorkspace(...args),
    toggleLike: (...args: any[]) => mocked.toggleLike(...args),
    requestFork: (...args: any[]) => mocked.requestFork(...args),
    listForkRequests: (...args: any[]) => mocked.listForkRequests(...args),
    approveForkRequest: (...args: any[]) => mocked.approveForkRequest(...args),
    rejectForkRequest: (...args: any[]) => mocked.rejectForkRequest(...args),
  },
  mergeRequestsApi: {
    listByProject: (...args: any[]) => mocked.listByProject(...args),
    create: (...args: any[]) => mocked.createMr(...args),
    merge: (...args: any[]) => mocked.mergeMr(...args),
    close: (...args: any[]) => mocked.closeMr(...args),
  },
}));

function renderClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ProjectPreviewClient projectId="project-1" />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

describe("ProjectPreview branch filtering", () => {
  beforeEach(() => {
    mocked.push.mockReset();
    mocked.token = "token";
    mocked.toast.mockReset();
    mocked.getBranches.mockReset();
    mocked.forkBranch.mockReset();
    mocked.getBranchParticipations.mockReset();
    mocked.getWorkspace.mockReset();
    mocked.toggleLike.mockReset();
    mocked.requestFork.mockReset();
    mocked.listForkRequests.mockReset();
    mocked.approveForkRequest.mockReset();
    mocked.rejectForkRequest.mockReset();
    mocked.listByProject.mockReset();
    mocked.createMr.mockReset();
    mocked.mergeMr.mockReset();
    mocked.closeMr.mockReset();

    mocked.meResult = { data: { id: "viewer-1" } };
    mocked.publicProjectResult = {
      isLoading: false,
      isError: false,
      error: null,
      data: {
        id: "project-1",
        name: "Demo Project",
        description: "desc",
        created_at: new Date().toISOString(),
        owner: { id: "owner-2", email: "owner@example.com", full_name: "Owner" },
        likes_count: 0,
        is_liked: false,
        tags: [],
        is_public: true,
        parent_project_id: null,
      },
    };

    mocked.getBranches.mockResolvedValue([
      { id: "b-main", name: "main", description: "", tags: [] },
      { id: "b-my", name: "my-branch", description: "", tags: [] },
      { id: "b-other", name: "other-branch", description: "", tags: [] },
    ]);
    mocked.forkBranch.mockResolvedValue({
      id: "branch-created-1",
      name: "fork/viewer-1",
      description: "",
      tags: [],
    });
    mocked.getBranchParticipations.mockResolvedValue([
      { id: "project-1", participated_branch_names: ["my-branch"] },
    ]);
    mocked.getWorkspace.mockResolvedValue({ editorData: [], effects: {} });
    mocked.listByProject.mockResolvedValue([]);
    mocked.listForkRequests.mockResolvedValue([]);
    mocked.gitGraphRender.mockReset();
  });

  it("filters branches to only participated branches when toggle is enabled", async () => {
    renderClient();

    fireEvent.click(screen.getByRole("tab", { name: /branches|分支|ブランチ/i }));

    await waitFor(() => {
      expect(screen.getByText("other-branch")).toBeInTheDocument();
    });

    const onlyMineButton = screen.getByRole("button", {
      name: /only my branches|仅看我的分支|自分のブランチのみ/i,
    });
    fireEvent.click(onlyMineButton);

    await waitFor(() => {
      expect(screen.queryByText("other-branch")).not.toBeInTheDocument();
    });

    expect(screen.getAllByText("my-branch").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /show all branches|显示全部分支|すべてのブランチを表示/i }),
    ).toBeInTheDocument();
  });

  it("does not show participated filter for owner", async () => {
    mocked.meResult = { data: { id: "owner-2" } };

    renderClient();
    fireEvent.click(screen.getByRole("tab", { name: /branches|分支|ブランチ/i }));

    await waitFor(() => {
      expect(screen.getByText("other-branch")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /only my branches|仅看我的分支|自分のブランチのみ/i }),
    ).not.toBeInTheDocument();
  });

  it("shows direct open button for participated branch in branches tab", async () => {
    renderClient();
    fireEvent.click(screen.getByRole("tab", { name: /branches|分支|ブランチ/i }));

    const openBranchLink = await screen.findByRole("link", {
      name: /open branch|进入该分支|このブランチを開く/i,
    });
    expect(openBranchLink).toHaveAttribute("href", "/editor/project-1?branch=my-branch");
    expect(document.querySelector('a[href="/editor/project-1?branch=other-branch"]')).toBeNull();
  });

  it("updates open my branch link when selected participated branch changes", async () => {
    mocked.getBranchParticipations.mockResolvedValue([
      { id: "project-1", participated_branch_names: ["my-branch", "alt-branch"] },
    ]);

    renderClient();

    const openBranchLink = await screen.findByRole("link", {
      name: /open my branch|进入我的分支|自分のブランチを開く/i,
    });
    expect(openBranchLink).toHaveAttribute("href", "/editor/project-1?branch=my-branch");

    fireEvent.change(screen.getByRole("combobox", { name: /branch|分支|ブランチ/i }), {
      target: { value: "alt-branch" },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("link", {
          name: /open my branch|进入我的分支|自分のブランチを開く/i,
        }),
      ).toHaveAttribute("href", "/editor/project-1?branch=alt-branch");
    });
  });

  it("creates a branch and opens editor branch for non-owner", async () => {
    renderClient();

    fireEvent.click(screen.getByRole("button", { name: /create branch|创建分支|ブランチ作成/i }));

    await waitFor(() => {
      expect(mocked.forkBranch).toHaveBeenCalledWith("project-1", { source_branch_name: "main" });
    });
    expect(mocked.push).toHaveBeenCalledWith("/editor/project-1?branch=fork%2Fviewer-1");
  });

  it("redirects to login when creating branch without token", async () => {
    mocked.token = null;
    renderClient();

    expect(
      screen.getByText(
        /login required to create branch in this repository|登录后才能在该仓库创建分支|このリポジトリでブランチを作成するにはログインが必要です/i,
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /create branch|创建分支|ブランチ作成/i }));

    await waitFor(() => {
      expect(mocked.push).toHaveBeenCalledWith("/login?next=%2Fproject%2Fproject-1");
    });
    expect(mocked.forkBranch).not.toHaveBeenCalled();
  });

  it("redirects to login when requesting fork without token", async () => {
    mocked.token = null;
    renderClient();

    fireEvent.click(screen.getByRole("button", { name: /request fork|申请 fork|フォーク申請/i }));

    await waitFor(() => {
      expect(mocked.push).toHaveBeenCalledWith("/login?next=%2Fproject%2Fproject-1");
    });
    expect(mocked.requestFork).not.toHaveBeenCalled();
  });

  it("shows branch disabled hint on private repository for non-owner", async () => {
    mocked.publicProjectResult = {
      ...mocked.publicProjectResult,
      data: {
        ...mocked.publicProjectResult.data,
        is_public: false,
      },
    };
    renderClient();

    const createBranchButton = await screen.findByRole("button", {
      name: /create branch|创建分支|ブランチ作成/i,
    });
    expect(createBranchButton).toBeDisabled();
    expect(
      screen.getByText(
        /branch collaboration is available on public repositories|分支协作仅对公开仓库开放|ブランチ協作は公開リポジトリで利用できます/i,
      ),
    ).toBeInTheDocument();
  });

  it("passes denied move-boundary permission to git graph for non-owner private repo", async () => {
    mocked.publicProjectResult = {
      ...mocked.publicProjectResult,
      data: {
        ...mocked.publicProjectResult.data,
        is_public: false,
      },
    };
    renderClient();

    await waitFor(() => expect(mocked.gitGraphRender).toHaveBeenCalled());
    const props = mocked.gitGraphRender.mock.calls.at(-1)?.[0];
    expect(props.projectId).toBe("project-1");
    expect(props.canForkFromCommit).toBe(true);
    expect(props.canMoveBoundaryFromCommit).toBe(false);
    expect(typeof props.moveBoundaryDeniedReason).toBe("string");
    expect(String(props.moveBoundaryDeniedReason).length).toBeGreaterThan(0);
  });
});
