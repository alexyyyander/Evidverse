import type { TimelineEffect, TimelineRow } from "@xzdarcy/timeline-engine";

export type SceneId = string;
export type BeatId = string;
export type CharacterId = string;
export type AssetId = string;
export type ClipId = string;
export type TimelineItemId = string;

export type AssetType = "image" | "video" | "audio";

export type GenerationStatus = "idle" | "queued" | "generating" | "succeeded" | "failed";

export type StoryBeat = {
  id: BeatId;
  sceneId: SceneId;
  order: number;
  narration?: string;
  dialogue?: string;
  shot?: string;
  suggestedDurationSec?: number;
  characterIds?: CharacterId[];
  status?: GenerationStatus;
  clipId?: ClipId | null;
};

export type StoryScene = {
  id: SceneId;
  order: number;
  title: string;
  summary?: string;
  beatIds: BeatId[];
};

export type Story = {
  scenes: StoryScene[];
  beatsById: Record<BeatId, StoryBeat>;
};

export type Character = {
  id: CharacterId;
  name: string;
  description?: string;
};

export type Asset = {
  id: AssetId;
  type: AssetType;
  url: string;
  width?: number;
  height?: number;
  durationSec?: number;
  source?: string;
  beatId?: BeatId | null;
  characterIds?: CharacterId[];
  paramsSummary?: string;
  createdAt?: string;
};

export type Clip = {
  id: ClipId;
  assetId: AssetId;
  name: string;
};

export type EditorSelection = {
  selectedBeatId: BeatId | null;
  selectedTimelineItemId?: TimelineItemId | null;
  selectedCharacterId?: CharacterId | null;
};

export type EditorLayout = {
  leftWidth: number;
  rightWidth: number;
  bottomHeight: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  bottomCollapsed: boolean;
  leftTab: "script" | "characters" | "assets" | "history";
  rightTab: "inspector" | "queue";
};

export type EditorTimeline = {
  editorData: TimelineRow[];
  effects: Record<string, TimelineEffect>;
  itemsById: Record<
    TimelineItemId,
    {
      clipId?: ClipId | null;
      beatId?: BeatId | null;
    }
  >;
};

export type EditorWorkspace = {
  version: 1;
  prompt: string;
  story: Story;
  characters: Character[];
  assets: Asset[];
  clips: Clip[];
  selection: EditorSelection;
  layout: EditorLayout;
  timeline: EditorTimeline;
};

export function createEditorId(prefix: string): string {
  const base =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${base}`;
}

export function createDefaultWorkspace(): EditorWorkspace {
  const sceneId = createEditorId("scene");
  const beatId = createEditorId("beat");
  return {
    version: 1,
    prompt: "",
    story: {
      scenes: [{ id: sceneId, order: 1, title: "Scene 1", beatIds: [beatId] }],
      beatsById: { [beatId]: { id: beatId, sceneId, order: 1, status: "idle" } },
    },
    characters: [],
    assets: [],
    clips: [],
    selection: { selectedBeatId: beatId, selectedTimelineItemId: null, selectedCharacterId: null },
    layout: {
      leftWidth: 360,
      rightWidth: 360,
      bottomHeight: 300,
      leftCollapsed: false,
      rightCollapsed: false,
      bottomCollapsed: false,
      leftTab: "script",
      rightTab: "inspector",
    },
    timeline: {
      editorData: [{ id: "0", actions: [] }],
      effects: {},
      itemsById: {},
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function coerceEditorWorkspace(raw: unknown): EditorWorkspace {
  const base = createDefaultWorkspace();
  if (!raw) return base;

  if (isRecord(raw) && raw.version === 1 && isRecord(raw.timeline) && Array.isArray((raw.timeline as any).editorData)) {
    return raw as EditorWorkspace;
  }

  if (isRecord(raw) && Array.isArray((raw as any).editorData)) {
    const timeline = {
      editorData: (raw as any).editorData as TimelineRow[],
      effects: (isRecord((raw as any).effects) ? ((raw as any).effects as Record<string, TimelineEffect>) : {}) ?? {},
      itemsById: {},
    };
    return { ...base, timeline };
  }

  if (isRecord(raw) && isRecord((raw as any).timeline) && Array.isArray(((raw as any).timeline as any).editorData)) {
    return { ...base, ...(raw as any), version: 1 } as EditorWorkspace;
  }

  return base;
}

export function getBeatTitle(beat: StoryBeat): string {
  const parts = [beat.narration, beat.dialogue, beat.shot].filter((v) => typeof v === "string" && v.trim().length > 0);
  const title = parts[0]?.trim();
  if (title) return title.length > 40 ? `${title.slice(0, 40)}…` : title;
  return `Beat ${beat.order}`;
}
