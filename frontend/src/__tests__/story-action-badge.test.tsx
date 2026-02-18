import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StoryActionBadge from "@/components/editor/story/StoryActionBadge";

vi.mock("@/lib/i18nContext", () => ({
  useI18n: () => ({
    lang: "en",
    setLang: () => {},
    t: (key: string) => key,
  }),
}));

describe("StoryActionBadge", () => {
  it("renders default solid badge with label", async () => {
    render(<StoryActionBadge action="fix_step3" />);
    const badge = await screen.findByText(/story\.nextAction\.label: story\.nextAction\.fix_step3/);
    expect(badge.className).toContain("bg-amber-500/20");
  });

  it("renders soft badge without label", async () => {
    render(<StoryActionBadge action="read_only" tone="soft" withLabel={false} />);
    const badge = await screen.findByText("story.nextAction.read_only");
    expect(badge.className).toContain("bg-zinc-500/10");
  });
});
