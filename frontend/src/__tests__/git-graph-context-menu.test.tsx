import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import GitGraphContextMenu from "@/components/GitGraphContextMenu";
import { I18nProvider } from "@/lib/i18nContext";

describe("GitGraphContextMenu", () => {
  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(
      <I18nProvider>
        <GitGraphContextMenu
          open={true}
          x={10}
          y={10}
          commitId="abc123"
          onClose={onClose}
          onAddToTimeline={() => {}}
          onFork={() => {}}
        />
      </I18nProvider>
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("renders commit id prefix", () => {
    render(
      <I18nProvider>
        <GitGraphContextMenu
          open={true}
          x={10}
          y={10}
          commitId="abcdef012345"
          onClose={() => {}}
          onAddToTimeline={() => {}}
          onFork={() => {}}
        />
      </I18nProvider>
    );

    expect(screen.getByText(/提交:/)).toHaveTextContent("提交: abcdef0");
  });

  it("renders move boundary action when provided", () => {
    render(
      <I18nProvider>
        <GitGraphContextMenu
          open={true}
          x={10}
          y={10}
          commitId="abc1234"
          onClose={() => {}}
          onAddToTimeline={() => {}}
          onFork={() => {}}
          onMoveBoundary={() => {}}
          forkHintText="Fork 会复制仓库副本到你的账号，并需要仓库作者审批。"
          moveBoundaryHintText="Branch 不改变仓库归属，仅允许从该边界提交之后开始改写。"
        />
      </I18nProvider>
    );

    expect(screen.getByText("将分支边界移动到此处")).toBeInTheDocument();
    expect(screen.getByText("Fork 会复制仓库副本到你的账号，并需要仓库作者审批。")).toBeInTheDocument();
    expect(screen.getByText("Branch 不改变仓库归属，仅允许从该边界提交之后开始改写。")).toBeInTheDocument();
  });

  it("disables fork/boundary actions and shows login entry when auth is required", () => {
    const onGoLogin = vi.fn();
    render(
      <I18nProvider>
        <GitGraphContextMenu
          open={true}
          x={12}
          y={12}
          commitId="abc1234"
          onClose={() => {}}
          onAddToTimeline={() => {}}
          onFork={() => {}}
          onMoveBoundary={() => {}}
          forkDisabled={true}
          moveBoundaryDisabled={true}
          forkDisabledReason="需要登录"
          forkDisabledReasonType="auth"
          onGoLogin={onGoLogin}
        />
      </I18nProvider>
    );

    expect(screen.getByRole("button", { name: "从此提交复制 Fork 项目" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "将分支边界移动到此处" })).toBeDisabled();
    expect(screen.getAllByText("需要登录").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /登录后继续|login to continue|ログインして続行/i }));
    expect(onGoLogin).toHaveBeenCalledTimes(1);
  });

  it("supports mixed permission state where fork is enabled and boundary move is denied", () => {
    render(
      <I18nProvider>
        <GitGraphContextMenu
          open={true}
          x={12}
          y={12}
          commitId="abc1234"
          onClose={() => {}}
          onAddToTimeline={() => {}}
          onFork={() => {}}
          onMoveBoundary={() => {}}
          forkDisabled={false}
          moveBoundaryDisabled={true}
          moveBoundaryDisabledReason="没有分支边界权限"
          moveBoundaryDisabledReasonType="permission"
        />
      </I18nProvider>
    );

    expect(screen.getByRole("button", { name: "从此提交复制 Fork 项目" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "将分支边界移动到此处" })).toBeDisabled();
    expect(screen.getAllByText("没有分支边界权限").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /登录后继续|login to continue|ログインして続行/i }),
    ).toBeNull();
  });

  it("shows both auth reasons when fork and boundary require login independently", () => {
    const onGoLogin = vi.fn();
    render(
      <I18nProvider>
        <GitGraphContextMenu
          open={true}
          x={16}
          y={16}
          commitId="abc1234"
          onClose={() => {}}
          onAddToTimeline={() => {}}
          onFork={() => {}}
          onMoveBoundary={() => {}}
          forkDisabled={true}
          moveBoundaryDisabled={true}
          forkDisabledReason="需要登录后 Fork"
          moveBoundaryDisabledReason="需要登录后前移边界"
          forkDisabledReasonType="auth"
          moveBoundaryDisabledReasonType="auth"
          onGoLogin={onGoLogin}
        />
      </I18nProvider>
    );

    expect(screen.getAllByText("需要登录后 Fork").length).toBeGreaterThan(0);
    expect(screen.getAllByText("需要登录后前移边界").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /登录后继续|login to continue|ログインして続行/i }));
    expect(onGoLogin).toHaveBeenCalledTimes(1);
  });
});
