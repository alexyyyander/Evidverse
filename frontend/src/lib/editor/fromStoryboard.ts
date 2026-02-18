import type { StoryboardScene } from "@/lib/api/types";
import { createId } from "@/lib/editor/id";
import type { Beat, EditorStateData, IdeaParameters, Scene } from "@/lib/editor/types";

export function toEditorStateFromStoryboard(params: { storyboard: StoryboardScene[]; ideaParams: IdeaParameters }) {
  const { storyboard, ideaParams } = params;
  const next: EditorStateData = {
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
  };

  const total = Math.max(1, storyboard.length);
  const perDuration = Math.max(0, ideaParams.duration) / total;
  const bySceneNumber = new Map<number, { scene: Scene; beatCount: number }>();

  for (let idx = 0; idx < storyboard.length; idx += 1) {
    const item = storyboard[idx];
    const sceneNumber = typeof item.scene_number === "number" ? item.scene_number : idx + 1;
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
      group = { scene, beatCount: 0 };
      bySceneNumber.set(sceneNumber, group);
      next.scenes[sceneId] = scene;
      next.sceneOrder.push(sceneId);
    }

    const beatId = createId("beat");
    const beat: Beat = {
      id: beatId,
      sceneId: group.scene.id,
      narration: typeof item.narration === "string" ? item.narration : "",
      dialogue: "",
      cameraDescription: typeof item.visual_description === "string" ? item.visual_description : "",
      suggestedDuration: perDuration,
      characterIds: [],
      status: "success",
      order: group.scene.beatIds.length,
    };

    group.scene.beatIds = [...group.scene.beatIds, beatId];
    next.scenes[group.scene.id] = { ...group.scene };
    next.beats[beatId] = beat;
    group.beatCount += 1;
  }

  return next;
}
