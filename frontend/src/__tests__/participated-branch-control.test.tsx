import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ParticipatedBranchControl from "@/components/ParticipatedBranchControl";

describe("ParticipatedBranchControl", () => {
  it("renders nothing when branch list is empty", () => {
    const { container } = render(
      <ParticipatedBranchControl
        branchNames={[]}
        selectedBranch=""
        selectAriaLabel="branch"
        onSelectedBranchChange={() => {}}
        renderOpenControl={() => <button type="button">open</button>}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("uses first branch when selected branch is missing", () => {
    render(
      <ParticipatedBranchControl
        branchNames={["branch-a", "branch-b"]}
        selectedBranch="branch-x"
        selectAriaLabel="branch"
        onSelectedBranchChange={() => {}}
        renderOpenControl={(effectiveBranch) => <button type="button">open:{effectiveBranch}</button>}
      />,
    );

    expect(screen.getByRole("button", { name: "open:branch-a" })).toBeInTheDocument();
  });

  it("propagates branch changes through callback", () => {
    const onSelectedBranchChange = vi.fn();
    render(
      <ParticipatedBranchControl
        branchNames={["branch-a", "branch-b"]}
        selectedBranch="branch-a"
        selectAriaLabel="branch"
        onSelectedBranchChange={onSelectedBranchChange}
        renderOpenControl={(effectiveBranch) => <button type="button">open:{effectiveBranch}</button>}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "branch" }), {
      target: { value: "branch-b" },
    });

    expect(onSelectedBranchChange).toHaveBeenCalledWith("branch-b");
  });
});

