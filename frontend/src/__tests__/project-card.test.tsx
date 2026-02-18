import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ProjectCard from "@/components/ProjectCard";
import type { ProjectFeedItem } from "@/lib/api/types";
import { vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/lib/i18nContext";

const mocked = vi.hoisted(() => ({
  push: vi.fn(),
  toast: vi.fn(),
  fork: vi.fn(),
  forkBranch: vi.fn(),
  requestFork: vi.fn(),
  toggleLike: vi.fn(),
  authToken: "test-token" as string | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocked.push }),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: mocked.toast }),
}));

vi.mock("@/lib/auth/useAuthToken", () => ({
  useAuthToken: () => mocked.authToken,
}));

vi.mock("@/lib/api", () => ({
  projectApi: {
    fork: mocked.fork,
    forkBranch: mocked.forkBranch,
    requestFork: mocked.requestFork,
    toggleLike: mocked.toggleLike,
  },
}));

describe("ProjectCard", () => {
  const makeProject = (overrides?: Partial<ProjectFeedItem>): ProjectFeedItem => ({
    id: "123",
    name: "Demo",
    description: null,
    created_at: new Date().toISOString(),
    owner: { id: "owner-1", email: "owner@example.com", full_name: "Owner" },
    likes_count: 0,
    is_liked: false,
    parent_project_id: "99",
    ...overrides,
  });

  const renderCard = (project: ProjectFeedItem, viewerId?: string | null, participatedBranchNames?: string[] | null) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ProjectCard project={project} viewerId={viewerId} participatedBranchNames={participatedBranchNames} />
        </I18nProvider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    mocked.authToken = "test-token";
    mocked.push.mockReset();
    mocked.toast.mockReset();
    mocked.fork.mockReset();
    mocked.forkBranch.mockReset();
    mocked.requestFork.mockReset();
    mocked.toggleLike.mockReset();
    mocked.fork.mockResolvedValue({ id: "forked-999" });
    mocked.forkBranch.mockResolvedValue({ id: "branch-111", name: "feature/new-cut" });
    mocked.requestFork.mockResolvedValue({ id: "request-111" });
    mocked.toggleLike.mockResolvedValue(true);
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders safely when owner is null and can copy id", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const project = makeProject({ owner: null });
    renderCard(project);

    expect(screen.getByText("Demo")).toBeInTheDocument();
    expect(screen.getByText(/Unknown|未知|不明/)).toBeInTheDocument();
    expect(screen.getByText("#123")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /copy project id|复制项目 id|プロジェクトidをコピー/i }));
    expect(writeText).toHaveBeenCalledWith("123");
  });

  it("shows open my branch link when participated branch names are provided", () => {
    const project = makeProject();
    renderCard(project, "viewer-2", ["feature/dragon-line", "feature/night-cut"]);

    const openBranchLink = screen.getByRole("link", {
      name: /open my branch|进入我的分支|自分のブランチを開く/i,
    });
    expect(openBranchLink).toHaveAttribute(
      "href",
      "/editor/123?branch=feature%2Fdragon-line",
    );
  });

  it("updates open branch href when user selects a different branch", () => {
    const project = makeProject();
    renderCard(project, "viewer-2", ["feature/dragon-line", "feature/night-cut"]);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "feature/night-cut" } });

    const openBranchLink = screen.getByRole("link", {
      name: /open my branch|进入我的分支|自分のブランチを開く/i,
    });
    expect(openBranchLink).toHaveAttribute(
      "href",
      "/editor/123?branch=feature%2Fnight-cut",
    );
  });

  it("owner clicks fork and directly forks a new project", async () => {
    const project = makeProject();
    renderCard(project, "owner-1");

    fireEvent.click(screen.getByRole("button", { name: /fork project|fork 项目|プロジェクトをフォーク/i }));

    await waitFor(() => expect(mocked.fork).toHaveBeenCalledWith("123"));
    expect(mocked.requestFork).not.toHaveBeenCalled();
    expect(mocked.push).toHaveBeenCalledWith("/editor/forked-999");
  });

  it("non-owner with token submits fork request", async () => {
    const project = makeProject();
    renderCard(project, "viewer-2");

    fireEvent.click(screen.getByRole("button", { name: /request fork|申请 fork|フォーク申請/i }));

    await waitFor(() => expect(mocked.requestFork).toHaveBeenCalledWith("123"));
    expect(mocked.fork).not.toHaveBeenCalled();
    expect(mocked.push).not.toHaveBeenCalledWith(expect.stringMatching(/^\/editor\//));
  });

  it("non-owner can create a branch for public project", async () => {
    const project = makeProject({ is_public: true });
    renderCard(project, "viewer-2");

    fireEvent.click(screen.getByRole("button", { name: /create branch|创建分支|ブランチ作成/i }));

    await waitFor(() =>
      expect(mocked.forkBranch).toHaveBeenCalledWith("123", { source_branch_name: "main" }),
    );
    expect(mocked.push).toHaveBeenCalledWith("/editor/123?branch=feature%2Fnew-cut");
    expect(mocked.fork).not.toHaveBeenCalled();
    expect(mocked.requestFork).not.toHaveBeenCalled();
  });

  it("non-owner cannot create branch for private project", () => {
    const project = makeProject({ is_public: false });
    renderCard(project, "viewer-2");

    const branchButton = screen.getByRole("button", {
      name: /create branch|创建分支|ブランチ作成/i,
    });
    expect(branchButton).toBeDisabled();
    fireEvent.click(branchButton);
    expect(mocked.forkBranch).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        /branch collaboration is available on public repositories|分支协作仅对公开仓库开放|ブランチ協作は公開リポジトリで利用できます/i,
      ),
    ).toBeInTheDocument();
  });

  it("non-owner without token is redirected to login before branch creation", async () => {
    mocked.authToken = null;
    const project = makeProject({ is_public: true });
    renderCard(project, "viewer-2");

    expect(
      screen.getByText(
        /login required to create branch in this repository|登录后才能在该仓库创建分支|このリポジトリでブランチを作成するにはログインが必要です/i,
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /create branch|创建分支|ブランチ作成/i }));

    await waitFor(() =>
      expect(mocked.push).toHaveBeenCalledWith("/login?next=%2Fproject%2F123"),
    );
    expect(mocked.forkBranch).not.toHaveBeenCalled();
  });

  it("non-owner without token is redirected to login before request", async () => {
    mocked.authToken = null;
    const project = makeProject();
    renderCard(project, "viewer-2");

    fireEvent.click(screen.getByRole("button", { name: /request fork|申请 fork|フォーク申請/i }));

    await waitFor(() =>
      expect(mocked.push).toHaveBeenCalledWith("/login?next=%2Fproject%2F123"),
    );
    expect(mocked.requestFork).not.toHaveBeenCalled();
    expect(mocked.fork).not.toHaveBeenCalled();
  });

  it("owner without token is redirected to login before direct fork", async () => {
    mocked.authToken = null;
    const project = makeProject();
    renderCard(project, "owner-1");

    fireEvent.click(screen.getByRole("button", { name: /fork project|fork 项目|プロジェクトをフォーク/i }));

    await waitFor(() =>
      expect(mocked.push).toHaveBeenCalledWith("/login?next=%2Fproject%2F123"),
    );
    expect(mocked.fork).not.toHaveBeenCalled();
    expect(mocked.requestFork).not.toHaveBeenCalled();
  });
});
