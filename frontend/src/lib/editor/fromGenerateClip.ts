import type { GenerateClipResult } from "@/lib/api";
import { createId } from "@/lib/editor/id";
import type {
  Asset,
  Beat,
  Character,
  Clip,
  EditorStateData,
  GenerationStatus,
  IdeaParameters,
  Scene,
  TimelineItem,
} from "@/lib/editor/types";

export function toEditorStateFromGenerateClipResult(params: {
  base: EditorStateData;
  result: GenerateClipResult;
  ideaParams: IdeaParameters;
  createdAt: string;
}) {
  const { base, result, ideaParams, createdAt } = params;
  if (result.status !== "succeeded" || !Array.isArray(result.clips)) return null;

  const next: EditorStateData = {
    ...base,
    scenes: { ...base.scenes },
    beats: { ...base.beats },
    characters: { ...base.characters },
    assets: { ...base.assets },
    clips: { ...base.clips },
    timelineItems: { ...base.timelineItems },
    sceneOrder: [...base.sceneOrder],
    ideaVersions: base.ideaVersions ? [...base.ideaVersions] : [],
    generationTasks: base.generationTasks ? [...base.generationTasks] : [],
  };

  const bySceneNumber = new Map<number, { scene: Scene; beats: Beat[] }>();

  for (let index = 0; index < result.clips.length; index += 1) {
    const clip = result.clips[index];
    const sceneNumber = typeof clip.scene_number === "number" ? clip.scene_number : index + 1;

    let group = bySceneNumber.get(sceneNumber);
    if (!group) {
      const sceneId = createId("scene");
      const scene: Scene = {
        id: sceneId,
        title: `Scene ${sceneNumber}`,
        summary: "",
        order: next.sceneOrder.length,
        beatIds: [],
      };
      group = { scene, beats: [] };
      bySceneNumber.set(sceneNumber, group);
      next.scenes[sceneId] = scene;
      next.sceneOrder.push(sceneId);
    }

    const beatId = createId("beat");
    const beat: Beat = {
      id: beatId,
      sceneId: group.scene.id,
      narration: typeof clip.narration === "string" ? clip.narration : "",
      dialogue: "",
      cameraDescription: "",
      suggestedDuration: ideaParams.duration / Math.max(1, ideaParams.shotCount),
      characterIds: [],
      status: "success" as GenerationStatus,
      order: group.scene.beatIds.length,
    };
    group.scene.beatIds = [...group.scene.beatIds, beatId];
    next.scenes[group.scene.id] = { ...group.scene };
    next.beats[beatId] = beat;
    group.beats.push(beat);

    const videoUrl = typeof clip.video_url === "string" ? clip.video_url : "";
    const imageUrl = typeof clip.image_url === "string" ? clip.image_url : "";

    if (videoUrl) {
      const assetId = createId("asset_video");
      const asset: Asset = {
        id: assetId,
        type: "video",
        url: videoUrl,
        duration: beat.suggestedDuration,
        source: "generated",
        relatedBeatId: beatId,
        generationParams: { ideaParams },
        createdAt,
      };
      next.assets[assetId] = asset;

      const clipId = createId("clip");
      const clipItem: Clip = {
        id: clipId,
        assetId,
        startOffset: 0,
      };
      next.clips[clipId] = clipItem;

      const timelineItemId = createId("timeline_item");
      const previous = Object.values(next.timelineItems).sort((a, b) => a.startTime - b.startTime);
      const last = previous.length > 0 ? previous[previous.length - 1] : null;
      const startTime = last ? last.startTime + last.duration : 0;
      const timelineItem: TimelineItem = {
        id: timelineItemId,
        clipId,
        trackId: "0",
        startTime,
        duration: beat.suggestedDuration,
        linkedBeatId: beatId,
      };
      next.timelineItems[timelineItemId] = timelineItem;
    }

    if (imageUrl) {
      const assetId = createId("asset_image");
      const asset: Asset = {
        id: assetId,
        type: "image",
        url: imageUrl,
        source: "generated",
        relatedBeatId: beatId,
        generationParams: { ideaParams },
        createdAt,
      };
      next.assets[assetId] = asset;
    }
  }

  return next;
}

export function extractCharactersFromBeats(params: { beats: Beat[]; existing: Character[]; createdAt: string }) {
  const { beats, existing, createdAt } = params;
  const existingNames = new Set(existing.map((c) => c.name.trim()).filter(Boolean));
  const names = new Set<string>();

  for (const beat of beats) {
    const text = `${beat.narration || ""}\n${beat.dialogue || ""}`.trim();
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const match = line.match(/^(.{1,12})[:：]/);
      if (!match) continue;
      const name = match[1].trim();
      if (!name) continue;
      if (name.includes("http")) continue;
      if (name.length > 12) continue;
      names.add(name);
    }
  }

  const added: Character[] = [];
  names.forEach((name) => {
    if (existingNames.has(name)) return;
    existingNames.add(name);
    added.push({ id: createId("character"), name, description: "", avatarUrl: "" });
  });
  return added;
}
