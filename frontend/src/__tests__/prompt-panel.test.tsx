import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PromptPanel from "@/components/editor/PromptPanel";

vi.mock("@/lib/api", () => ({
  generationApi: {
    generateClip: vi.fn(),
  },
}));

vi.mock("@/components/ui/toast", () => ({
  toast: vi.fn(),
}));

describe("PromptPanel", () => {
  it("disables submit when prompt is empty", () => {
    render(
      <PromptPanel
        prompt=""
        onPromptChange={() => {}}
        onTaskStarted={() => {}}
        task={null}
        busy={false}
      />
    );

    expect(screen.getByRole("button", { name: /generate/i })).toBeDisabled();
  });

  it("shows generating state when busy", () => {
    render(
      <PromptPanel
        prompt="hello"
        onPromptChange={() => {}}
        onTaskStarted={() => {}}
        task={null}
        busy={true}
      />
    );

    expect(screen.getByRole("button", { name: /generating/i })).toBeDisabled();
  });
});

