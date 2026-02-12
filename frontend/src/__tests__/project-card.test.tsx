import { fireEvent, render, screen } from "@testing-library/react";
import ProjectCard from "@/components/ProjectCard";
import type { ProjectFeedItem } from "@/lib/api/types";
import { vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/lib/i18nContext";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("ProjectCard", () => {
  it("renders safely when owner is null and can copy id", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const project: ProjectFeedItem = {
      id: "123",
      name: "Demo",
      description: null,
      created_at: new Date().toISOString(),
      owner: null,
      likes_count: 0,
      is_liked: false,
      parent_project_id: "99",
    };

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ProjectCard project={project} />
        </I18nProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText("Demo")).toBeInTheDocument();
    expect(screen.getByText(/Unknown|未知|不明/)).toBeInTheDocument();
    expect(screen.getByText("#123")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /copy project id/i }));
    expect(writeText).toHaveBeenCalledWith("123");
  });
});
