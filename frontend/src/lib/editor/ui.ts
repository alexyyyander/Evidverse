import type { AssetId, BeatId, CharacterId, TimelineItemId } from "@/lib/editor/types";

export type SelectionSource = "timeline" | "script" | "inspector" | "queue" | null;

export interface SelectionState {
  selectedBeatId: BeatId | null;
  selectedTimelineItemId: TimelineItemId | null;
  selectedCharacterId: CharacterId | null;
  selectedAssetId: AssetId | null;
  source: SelectionSource;
}

export type LeftTab = "script" | "characters" | "assets" | "history";
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
