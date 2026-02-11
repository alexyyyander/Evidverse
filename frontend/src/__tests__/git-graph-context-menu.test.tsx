import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import GitGraphContextMenu from "@/components/GitGraphContextMenu";

describe("GitGraphContextMenu", () => {
  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(
      <GitGraphContextMenu
        open={true}
        x={10}
        y={10}
        commitId="abc123"
        onClose={onClose}
        onAddToTimeline={() => {}}
        onFork={() => {}}
      />
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("renders commit id prefix", () => {
    render(
      <GitGraphContextMenu
        open={true}
        x={10}
        y={10}
        commitId="abcdef012345"
        onClose={() => {}}
        onAddToTimeline={() => {}}
        onFork={() => {}}
      />
    );

    expect(screen.getByText(/Commit:/)).toHaveTextContent("Commit: abcdef0");
  });
});

