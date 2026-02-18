import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import { I18nProvider } from "@/lib/i18nContext";
import ProjectsClient from "@/app/(app)/projects/ProjectsClient";

const mocked = vi.hoisted(() => ({
  push: vi.fn(),
  authToken: null as string | null,
  cloudToken: null as string | null,
  projectsResult: {
    data: [],
    isLoading: false,
    isError: false,
    error: null,
  } as any,
  meResult: { data: null } as any,
  cloudEnabled: false,
  requestFork: vi.fn(),
  getBranchParticipations: vi.fn(),
  getMine: vi.fn(),
  toggleLike: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocked.push }),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: (...args: any[]) => mocked.toast(...args),
}));

vi.mock("@/lib/auth/useAuthToken", () => ({
  useAuthToken: () => mocked.authToken,
}));

vi.mock("@/lib/auth/useCloudAuthToken", () => ({
  useCloudAuthToken: () => mocked.cloudToken,
}));

vi.mock("@/lib/queries/useProjects", () => ({
  useProjects: () => mocked.projectsResult,
}));

vi.mock("@/lib/queries/useMe", () => ({
  useMe: () => mocked.meResult,
}));

vi.mock("@/lib/appMode", () => ({
  getAppMode: () => "local",
}));

vi.mock("@/lib/api", () => ({
  cloudAuthApi: {
    login: vi.fn(),
  },
  cloudProjectsApi: {
    enabled: () => mocked.cloudEnabled,
    getMine: (...args: any[]) => mocked.getMine(...args),
    exportProject: vi.fn(),
  },
  projectApi: {
    requestFork: (...args: any[]) => mocked.requestFork(...args),
    getBranchParticipations: (...args: any[]) => mocked.getBranchParticipations(...args),
    update: (...args: any[]) => mocked.update(...args),
    delete: (...args: any[]) => mocked.delete(...args),
    importFromCloud: vi.fn(),
  },
}));

function renderClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ProjectsClient />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

describe("ProjectsClient import auth behavior", () => {
  beforeEach(() => {
    mocked.push.mockReset();
    mocked.toast.mockReset();
    mocked.requestFork.mockReset();
    mocked.getBranchParticipations.mockReset();
    mocked.getMine.mockReset();
    mocked.update.mockReset();
    mocked.delete.mockReset();
    mocked.authToken = null;
    mocked.cloudToken = null;
    mocked.cloudEnabled = false;
    mocked.projectsResult = {
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    };
    mocked.meResult = { data: null };
    mocked.getBranchParticipations.mockResolvedValue([]);
    mocked.requestFork.mockResolvedValue({ id: "request-1" });
  });

  it("redirects to login when importing fork without auth token", async () => {
    renderClient();

    fireEvent.click(screen.getByRole("button", { name: /import|导入|インポート/i }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "source-project-1" } });
    fireEvent.click(screen.getByRole("button", { name: /request fork|申请 fork|フォーク申請/i }));

    await waitFor(() => {
      expect(mocked.push).toHaveBeenCalledWith("/login?next=%2Fprojects");
    });
    expect(mocked.requestFork).not.toHaveBeenCalled();
  });

  it("submits fork request when auth token exists", async () => {
    mocked.authToken = "token";
    renderClient();

    fireEvent.click(screen.getByRole("button", { name: /import|导入|インポート/i }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "source-project-2" } });
    fireEvent.click(screen.getByRole("button", { name: /request fork|申请 fork|フォーク申請/i }));

    await waitFor(() => {
      expect(mocked.requestFork).toHaveBeenCalledWith("source-project-2");
    });
    expect(mocked.push).not.toHaveBeenCalledWith(expect.stringMatching(/^\/editor\//));
  });

  it("opens selected participated branch from participated project card", async () => {
    mocked.getBranchParticipations.mockResolvedValue([
      {
        id: "project-9",
        name: "Participated Project",
        description: "desc",
        created_at: new Date().toISOString(),
        participated_branch_names: ["branch-a", "branch-b"],
      },
    ]);

    renderClient();

    await screen.findByRole("button", {
      name: /open my branch|进入我的分支|自分のブランチを開く/i,
    });

    fireEvent.change(
      screen.getByRole("combobox", {
        name: /branch.*participated project|分支.*participated project|ブランチ.*participated project/i,
      }),
      {
        target: { value: "branch-b" },
      },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /open my branch|进入我的分支|自分のブランチを開く/i,
      }),
    );

    await waitFor(() => {
      expect(mocked.push).toHaveBeenCalledWith("/editor/project-9?branch=branch-b");
    });
  });
});
