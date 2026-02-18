import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import RightSidebar from "@/components/editor/RightSidebar";
import { useEditorStore } from "@/store/editorStore";

vi.mock("@/lib/i18nContext", () => ({
  useI18n: () => ({
    lang: "en",
    setLang: () => {},
    t: (key: string) => key,
  }),
}));

vi.mock("@/components/editor/InspectorPanel", () => ({
  default: () => <div>inspector-panel</div>,
}));

vi.mock("@/components/editor/GenerationQueuePanel", () => ({
  default: () => <div>queue-panel</div>,
}));

function resetStore() {
  useEditorStore.setState({
    data: {
      scenes: {},
      beats: {},
      characters: {},
      assets: {},
      clips: {},
      timelineItems: {},
      sceneOrder: [],
      ideaVersions: [],
      generationTasks: [],
      activeIdeaVersionId: undefined,
      storyWorkflow: undefined,
    },
    selection: {
      selectedBeatId: null,
      selectedTimelineItemId: null,
      selectedCharacterId: null,
      selectedAssetId: null,
      selectedStoryNodeId: null,
      source: null,
    },
    layout: {
      leftPanelWidth: 300,
      rightPanelWidth: 300,
      bottomPanelHeight: 300,
      leftPanelCollapsed: false,
      rightPanelCollapsed: false,
      bottomPanelCollapsed: false,
      activeLeftTab: "create",
      activeRightTab: "inspector",
      followSelection: true,
    },
    history: { undo: [], redo: [], recording: false, applying: false },
  } as any);
}

beforeEach(() => {
  resetStore();
});

describe("RightSidebar", () => {
  it("uses i18n labels for tab titles and switches active tab", async () => {
    render(<RightSidebar />);
    expect(await screen.findByTitle("editor.right.inspector")).toBeInTheDocument();
    const queueTab = await screen.findByTitle("editor.right.queue");
    expect(screen.getByText("inspector-panel")).toBeInTheDocument();

    fireEvent.click(queueTab);
    expect(useEditorStore.getState().layout.activeRightTab).toBe("queue");
    expect(screen.getByText("queue-panel")).toBeInTheDocument();
  });
});
