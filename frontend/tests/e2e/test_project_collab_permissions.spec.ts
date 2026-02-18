import { expect, test, type Page } from "@playwright/test";

function jsonResponse(data: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  };
}

async function setupProjectPreviewApiMocks(
  page: Page,
  input: {
    projectId: string;
    isPublic: boolean;
    ownerId: string;
    viewerId?: string | null;
  },
) {
  const { projectId, isPublic, ownerId, viewerId = null } = input;
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const url = new URL(request.url());
    const path = url.pathname;

    if (method === "GET" && path === `/api/v1/projects/public/${projectId}`) {
      return route.fulfill(
        jsonResponse({
          id: projectId,
          name: `E2E Project ${projectId}`,
          description: "preview",
          created_at: new Date().toISOString(),
          owner: {
            id: ownerId,
            email: "owner@example.com",
            full_name: "Owner",
          },
          likes_count: 0,
          is_liked: false,
          tags: [],
          is_public: isPublic,
          parent_project_id: null,
        }),
      );
    }

    if (method === "GET" && path === "/api/v1/users/me") {
      if (!viewerId) {
        return route.fulfill(jsonResponse({ detail: "Unauthorized" }, 401));
      }
      return route.fulfill(
        jsonResponse({
          id: viewerId,
          email: "viewer@example.com",
          full_name: "Viewer",
          is_active: true,
        }),
      );
    }

    if (method === "GET" && path === `/api/v1/projects/${projectId}/graph`) {
      return route.fulfill(
        jsonResponse({
          commits: [
            {
              id: "c_root",
              message: "Initial commit",
              created_at: new Date(Date.now() - 60_000).toISOString(),
              parent_hash: null,
            },
            {
              id: "c_head",
              message: "Latest update",
              created_at: new Date().toISOString(),
              parent_hash: "c_root",
            },
          ],
          branches: [{ id: "b_main", name: "main", head_commit_id: "c_head" }],
        }),
      );
    }

    if (method === "GET" && path === `/api/v1/projects/${projectId}/workspace`) {
      return route.fulfill(jsonResponse({ editorData: [], effects: {} }));
    }

    if (method === "GET" && path === `/api/v1/projects/${projectId}/branches`) {
      return route.fulfill(jsonResponse([{ id: "b_main", name: "main", head_commit_id: "c_head" }]));
    }

    if (method === "GET" && path === `/api/v1/projects/${projectId}/merge-requests`) {
      return route.fulfill(jsonResponse([]));
    }

    if (method === "GET" && path === `/api/v1/projects/${projectId}/fork-requests`) {
      return route.fulfill(jsonResponse([]));
    }

    if (method === "GET" && path === "/api/v1/projects/branch-participations") {
      return route.fulfill(jsonResponse([]));
    }

    if (method === "POST" && path === `/api/v1/projects/${projectId}/fork-requests`) {
      return route.fulfill(
        jsonResponse({
          id: "fr_1",
          project_id: projectId,
          requester_id: viewerId || "guest",
          status: "pending",
          created_at: new Date().toISOString(),
        }),
      );
    }

    if (method === "POST" && path === `/api/v1/projects/${projectId}/fork-branch`) {
      return route.fulfill(jsonResponse({ id: "b_new", name: "fork/viewer-branch", head_commit_id: "c_head" }));
    }

    return route.fulfill(jsonResponse({}));
  });
}

test("project preview redirects unauthenticated fork/branch actions to login with next", async ({ page }) => {
  const projectId = `project-auth-${Date.now()}`;

  await setupProjectPreviewApiMocks(page, {
    projectId,
    isPublic: true,
    ownerId: "owner-1",
    viewerId: null,
  });

  await page.addInitScript(() => {
    localStorage.removeItem("token");
    localStorage.setItem("lang", "en");
  });

  await page.goto(`/project/${projectId}`);

  const requestForkButton = page.getByRole("button", { name: /request fork|申请 fork|フォーク申請/i });
  const createBranchButton = page.getByRole("button", { name: /create branch|创建分支|ブランチ作成/i });

  await expect(requestForkButton).toBeVisible();
  await expect(createBranchButton).toBeVisible();

  await requestForkButton.click();
  await expect(page).toHaveURL(new RegExp(`/login\\?next=%2Fproject%2F${projectId}`));

  await page.goto(`/project/${projectId}`);
  await createBranchButton.click();
  await expect(page).toHaveURL(new RegExp(`/login\\?next=%2Fproject%2F${projectId}`));
});

test("graph menu supports mixed permission state: fork enabled while move boundary disabled", async ({
  page,
}) => {
  const projectId = `project-mixed-${Date.now()}`;

  await setupProjectPreviewApiMocks(page, {
    projectId,
    isPublic: false,
    ownerId: "owner-1",
    viewerId: "viewer-2",
  });

  await page.addInitScript(() => {
    localStorage.setItem("token", "token-e2e");
    localStorage.setItem("lang", "en");
  });

  await page.goto(`/project/${projectId}`);

  const commitLabel = page.locator("text=Initial commit").first();
  await expect(commitLabel).toBeVisible();
  await commitLabel.click({ button: "right" });

  const forkButton = page.getByRole("button", { name: /fork project copy from this commit|从此提交复制 fork 项目|このコミットからフォークコピーを作成/i });
  const moveBoundaryButton = page.getByRole("button", { name: /move branch boundary here|将分支边界移动到此处|ブランチ境界をここへ移動/i });

  await expect(forkButton).toBeEnabled();
  await expect(moveBoundaryButton).toBeDisabled();
  await expect(
    page
      .getByLabel("Commit actions")
      .getByText(
        /branch collaboration is available on public repositories|分支协作仅对公开仓库开放|ブランチ協作は公開リポジトリで利用できます/i,
      )
      .first(),
  ).toBeVisible();
});
