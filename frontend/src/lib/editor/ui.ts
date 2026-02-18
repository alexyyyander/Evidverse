import type { AssetId, BeatId, CharacterId, TimelineItemId } from "@/lib/editor/types";

export type SelectionSource = "timeline" | "script" | "inspector" | "queue" | null;
export type ExtendedSelectionSource = SelectionSource | "story" | "event_flow";

export interface SelectionState {
  selectedBeatId: BeatId | null;
  selectedTimelineItemId: TimelineItemId | null;
  selectedCharacterId: CharacterId | null;
  selectedAssetId: AssetId | null;
  selectedStoryNodeId: string | null;
  source: ExtendedSelectionSource;
}

// Keep `script` for backward compatibility while migrating to `create`.
export type LeftTab = "create" | "script" | "vn" | "characters" | "assets" | "history";
export type RightTab = "inspector" | "queue";

export interface LayoutState {
  leftPanelWidth: number;
  rightPanelWidth: number;
  bottomPanelHeight: number;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  bottomPanelCollapsed: boolean;
  activeLeftTab: LeftTab;
  activeRightTab: RightTab;
  followSelection: boolean;
}
