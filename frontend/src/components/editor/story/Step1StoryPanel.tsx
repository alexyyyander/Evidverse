"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { filesApi, generationApi } from "@/lib/api";
import { createId } from "@/lib/editor/id";
import { useEditorStore } from "@/store/editorStore";
import { useSettingsStore } from "@/store/settingsStore";
import type { StoryCharacterSeed } from "@/lib/editor/types";
import { useI18n } from "@/lib/i18nContext";

function toCsv(list: string[]) {
  return list.join(", ");
}

function fromCsv(text: string) {
  return text
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

type SeedMissingField = "appearance" | "fateKeywords" | "referenceImage";

function isSeedStructurallyEmpty(seed: StoryCharacterSeed): boolean {
  const hasText =
    String(seed.name || "").trim().length > 0 ||
    String(seed.identity || "").trim().length > 0 ||
    String(seed.personality || "").trim().length > 0 ||
    String(seed.appearance || "").trim().length > 0;
  const hasFate = Array.isArray(seed.fateKeywords) && seed.fateKeywords.length > 0;
  const hasReference = !!seed.referenceAssetId || String(seed.referenceImageUrl || "").trim().length > 0;
  const hasLink = String(seed.linkedCharacterId || "").trim().length > 0;
  return !hasText && !hasFate && !hasReference && !hasLink;
}

function resolveSeedMissingFields(seed: StoryCharacterSeed): SeedMissingField[] {
  if (isSeedStructurallyEmpty(seed)) return [];
  const missing: SeedMissingField[] = [];
  if (!String(seed.appearance || "").trim()) missing.push("appearance");
  if (!Array.isArray(seed.fateKeywords) || seed.fateKeywords.length === 0) missing.push("fateKeywords");
  if (!seed.referenceAssetId && !String(seed.referenceImageUrl || "").trim()) missing.push("referenceImage");
  return missing;
}

export default function Step1StoryPanel() {
  const { t } = useI18n();
  const search = useSearchParams();
  const characters = useEditorStore((s) => s.data.characters);
  const workflow = useEditorStore((s) => s.data.storyWorkflow);
  const initializeStoryWorkflowFromStoryboard = useEditorStore((s) => s.initializeStoryWorkflowFromStoryboard);
  const updateStoryGlobal = useEditorStore((s) => s.updateStoryGlobal);
  const updateStoryMeta = useEditorStore((s) => s.updateStoryMeta);
  const setActiveStep = useEditorStore((s) => s.setActiveStep);
  const setBranchBoundary = useEditorStore((s) => s.setBranchBoundary);
  const selectAsset = useEditorStore((s) => s.selectAsset);
  const updateLayout = useEditorStore((s) => s.updateLayout);
  const addImageAsset = useEditorStore((s) => s.addImageAsset);
  const settings = useSettingsStore((s) => ({
    defaultStyle: s.defaultStyle,
    defaultAspectRatio: s.defaultAspectRatio,
    defaultResolution: s.defaultResolution,
    defaultShotCount: s.defaultShotCount,
    defaultPace: s.defaultPace,
    defaultSegmentDuration: s.defaultSegmentDuration,
    defaultSegmentDurationUnit: s.defaultSegmentDurationUnit,
  }));

  const branchName = (search?.get("branch") || workflow?.branchPolicy.branchName || "main").trim() || "main";
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const global = workflow?.global || {
    storyMode: "generate" as const,
    storyStyle: "series" as const,
    tone: "serious" as const,
    llmProvider: "auto" as const,
    scriptMode: "strict_screenplay" as const,
    segmentLength: "medium" as const,
    characterSeeds: [] as StoryCharacterSeed[],
  };
  const seedList = useMemo(() => (Array.isArray(global.characterSeeds) ? global.characterSeeds : []), [global.characterSeeds]);
  const seedValidationById = useMemo(() => {
    const map = new Map<string, SeedMissingField[]>();
    for (const seed of seedList) {
      const missing = resolveSeedMissingFields(seed);
      if (missing.length > 0) {
        map.set(seed.id, missing);
      }
    }
    return map;
  }, [seedList]);
  const invalidSeedList = useMemo(
    () => seedList.filter((seed) => (seedValidationById.get(seed.id)?.length || 0) > 0),
    [seedList, seedValidationById],
  );
  const characterOptions = useMemo(
    () =>
      Object.values(characters)
        .filter(Boolean)
        .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id))),
    [characters],
  );
  const characterIdSet = useMemo(() => new Set(characterOptions.map((character) => character.id)), [characterOptions]);
  const boundaryOrder = workflow?.branchPolicy.lockBoundaryOrder;
  const branchPreview = useMemo(() => {
    const nodes = workflow?.nodes || [];
    const lockedCount =
      typeof boundaryOrder === "number"
        ? nodes.filter((candidate) => candidate.order < boundaryOrder).length
        : nodes.filter((candidate) => candidate.locked).length;
    const editableCount = Math.max(0, nodes.length - lockedCount);
    const impactedNodes = (
      typeof boundaryOrder === "number"
        ? nodes.filter((candidate) => candidate.order >= boundaryOrder)
        : nodes.filter((candidate) => !candidate.locked)
    ).sort((a, b) => a.order - b.order);
    const impactedPreview = impactedNodes.slice(0, 5).map((candidate) => {
      const title = String(candidate.title || "").trim() || `Node ${candidate.order + 1}`;
      return `#${candidate.order + 1} ${title}`;
    });
    return {
      total: nodes.length,
      lockedCount,
      editableCount,
      impactedPreview,
      impactedHiddenCount: Math.max(0, impactedNodes.length - impactedPreview.length),
    };
  }, [boundaryOrder, workflow?.nodes]);

  useEffect(() => {
    if (seedList.length === 0) return;
    const invalidSeeds = seedList.filter(
      (seed) => !!seed.linkedCharacterId && !characterIdSet.has(seed.linkedCharacterId),
    );
    if (invalidSeeds.length === 0) return;
    const nextSeeds = seedList.map((seed) =>
      seed.linkedCharacterId && !characterIdSet.has(seed.linkedCharacterId)
        ? { ...seed, linkedCharacterId: undefined }
        : seed,
    );
    updateStoryGlobal({ characterSeeds: nextSeeds });
    const names = invalidSeeds
      .map((seed) => String(seed.name || seed.id))
      .filter(Boolean)
      .slice(0, 4)
      .join(", ");
    toast({
      title: t("story.step1.toast.bindingCleared.title"),
      description: t("story.step1.toast.bindingCleared.desc")
        .replace("{count}", String(invalidSeeds.length))
        .replace("{names}", names || "-"),
      variant: "default",
    });
  }, [characterIdSet, seedList, t, updateStoryGlobal]);

  if (!workflow) return null;

  const updateSeed = (index: number, patch: Partial<StoryCharacterSeed>) => {
    const next = seedList.map((seed, i) => (i === index ? { ...seed, ...patch } : seed));
    updateStoryGlobal({ characterSeeds: next });
  };

  const addSeed = () => {
    const next: StoryCharacterSeed[] = [
      ...seedList,
      {
        id: createId("seed"),
        name: "",
        identity: "",
        personality: "",
        appearance: "",
        fateKeywords: [],
      },
    ];
    updateStoryGlobal({ characterSeeds: next });
  };

  const removeSeed = (seedId: string) => {
    updateStoryGlobal({ characterSeeds: seedList.filter((seed) => seed.id !== seedId) });
  };

  const uploadSeedImage = async (seedIndex: number, file: File) => {
    try {
      const presigned = await filesApi.getPresignedUrl(file.name || "seed-image.png");
      const put = await fetch(presigned.url, {
        method: "PUT",
        body: file,
        headers: file.type ? { "Content-Type": file.type } : undefined,
      });
      if (!put.ok) {
        throw new Error(`Upload failed (${put.status})`);
      }
      const url = presigned.storage_url || "";
      if (!url) {
        throw new Error("storage_url is empty");
      }
      const seedId = seedList[seedIndex]?.id || createId("seed");
      const assetId = addImageAsset({
        url,
        source: "upload",
        generationParams: { stage: "step1_seed", seedId },
      });
      updateSeed(seedIndex, { referenceImageUrl: url, referenceAssetId: assetId });
      toast({ title: t("story.step1.toast.uploaded.title"), description: file.name, variant: "success" });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("story.step1.toast.uploadFailed.title");
      toast({ title: t("story.step1.toast.uploadFailed.title"), description: message, variant: "destructive" });
    }
  };

  const generateStoryboard = async () => {
    if (submitting || !topic.trim()) return;
    if (invalidSeedList.length > 0) {
      const previewNames = invalidSeedList
        .map((seed) => String(seed.name || seed.id))
        .filter(Boolean)
        .slice(0, 3)
        .join(", ");
      toast({
        title: t("story.step1.toast.seedIncomplete.title"),
        description: t("story.step1.toast.seedIncomplete.desc")
          .replace("{count}", String(invalidSeedList.length))
          .replace("{names}", previewNames || "-"),
        variant: "destructive",
      });
      return;
    }
    if (branchName !== "main" && !workflow.branchPolicy.boundaryConfigured) {
      const ok = window.confirm(t("story.step1.branchConfirm"));
      if (!ok) return;
      setBranchBoundary(workflow.branchPolicy.lockBoundaryOrder ?? 0);
    }

    setSubmitting(true);
    try {
      const resp = await generationApi.generateStoryboard({
        topic: topic.trim(),
        stage: "step1_story",
        llm_provider: global.llmProvider,
        story_mode: global.storyMode,
        story_style: global.storyStyle,
        tone: global.tone,
        script_mode: global.scriptMode,
        segment_length: global.segmentLength,
        character_seed: seedList.map((seed) => ({
          id: seed.id,
          name: seed.name,
          identity: seed.identity,
          personality: seed.personality,
          appearance: seed.appearance,
          fate_keywords: seed.fateKeywords,
          reference_image_url: seed.referenceImageUrl,
          reference_asset_id: seed.referenceAssetId,
          linked_character_id: seed.linkedCharacterId,
        })),
      });

      const seconds =
        settings.defaultSegmentDurationUnit === "min"
          ? settings.defaultSegmentDuration * 60
          : settings.defaultSegmentDuration;
      initializeStoryWorkflowFromStoryboard({
        branchName,
        ideaParams: {
          style: settings.defaultStyle,
          aspectRatio: settings.defaultAspectRatio,
          duration: Math.max(1, resp.storyboard.length) * Math.max(1, seconds),
          shotCount: settings.defaultShotCount,
          pace: settings.defaultPace,
          language: "zh",
          resolution: settings.defaultResolution,
        },
        storyboard: resp.storyboard,
      });
      updateStoryGlobal({
        storyMode: global.storyMode,
        storyStyle: global.storyStyle,
        tone: global.tone,
        llmProvider: global.llmProvider,
        scriptMode: global.scriptMode,
        segmentLength: global.segmentLength,
        characterSeeds: seedList,
      });
      updateStoryMeta({
        requestedProvider: resp.meta?.requested_provider || global.llmProvider,
        resolvedProvider: resp.meta?.resolved_provider || undefined,
        fallbackUsed: !!resp.meta?.fallback_used,
        warnings: resp.meta?.warnings || [],
      });
      setActiveStep("step2");
      toast({
        title: t("story.step1.toast.ready.title"),
        description: t("story.step1.toast.ready.desc").replace("{count}", String(resp.storyboard.length)),
        variant: "success",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("story.step1.toast.generateFailed.title");
      toast({ title: t("story.step1.toast.generateFailed.title"), description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-xs font-medium">{t("story.step1.topic.label")}</div>
        <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} className="min-h-[88px]" placeholder={t("story.step1.topic.placeholder")} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <div className="text-xs font-medium">{t("story.step1.storyMode.label")}</div>
          <Select value={global.storyMode} onValueChange={(v) => updateStoryGlobal({ storyMode: v as any })}>
            <SelectTrigger>
              <SelectValue>{t(`story.step1.storyMode.${global.storyMode}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="generate">{t("story.step1.storyMode.generate")}</SelectItem>
              <SelectItem value="create">{t("story.step1.storyMode.create")}</SelectItem>
              <SelectItem value="edit">{t("story.step1.storyMode.edit")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium">{t("story.step1.llmProvider.label")}</div>
          <Select value={global.llmProvider} onValueChange={(v) => updateStoryGlobal({ llmProvider: v as any })}>
            <SelectTrigger>
              <SelectValue>{t(`story.provider.${global.llmProvider}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{t("story.provider.auto")}</SelectItem>
              <SelectItem value="ollama">{t("story.provider.ollama")}</SelectItem>
              <SelectItem value="vllm">{t("story.provider.vllm")}</SelectItem>
              <SelectItem value="sglang">{t("story.provider.sglang")}</SelectItem>
              <SelectItem value="openai_compatible">{t("story.provider.openai_compatible")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium">{t("story.step1.storyStyle.label")}</div>
          <Select value={global.storyStyle} onValueChange={(v) => updateStoryGlobal({ storyStyle: v as any })}>
            <SelectTrigger>
              <SelectValue>{t(`story.step1.storyStyle.${global.storyStyle}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="record">{t("story.step1.storyStyle.record")}</SelectItem>
              <SelectItem value="science">{t("story.step1.storyStyle.science")}</SelectItem>
              <SelectItem value="series">{t("story.step1.storyStyle.series")}</SelectItem>
              <SelectItem value="short_drama">{t("story.step1.storyStyle.short_drama")}</SelectItem>
              <SelectItem value="animation">{t("story.step1.storyStyle.animation")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium">{t("story.step1.tone.label")}</div>
          <Select value={global.tone} onValueChange={(v) => updateStoryGlobal({ tone: v as any })}>
            <SelectTrigger>
              <SelectValue>{t(`story.step1.tone.${global.tone}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="humorous">{t("story.step1.tone.humorous")}</SelectItem>
              <SelectItem value="serious">{t("story.step1.tone.serious")}</SelectItem>
              <SelectItem value="warm">{t("story.step1.tone.warm")}</SelectItem>
              <SelectItem value="cold">{t("story.step1.tone.cold")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {branchName !== "main" ? (
        <div className="rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <div className="font-medium">{t("story.step1.branchPreview.title")}</div>
          <div className="mt-1">
            {t("story.step1.branchPreview.branch").replace("{name}", branchName)}
          </div>
          <div className="mt-1">
            {t("story.step1.branchPreview.boundary").replace(
              "{order}",
              typeof boundaryOrder === "number" ? String(boundaryOrder) : t("story.step1.branchPreview.pending"),
            )}
          </div>
          <div className="mt-1">
            {t("story.step1.branchPreview.counts")
              .replace("{locked}", String(branchPreview.lockedCount))
              .replace("{editable}", String(branchPreview.editableCount))
              .replace("{total}", String(branchPreview.total))}
          </div>
          {branchPreview.impactedPreview.length > 0 ? (
            <div className="mt-1">
              {t("story.step1.branchPreview.impacted").replace("{nodes}", branchPreview.impactedPreview.join(" · "))}
            </div>
          ) : null}
          {branchPreview.impactedHiddenCount > 0 ? (
            <div className="mt-1 text-[11px] text-amber-300/90">
              {t("story.step1.branchPreview.impactedMore").replace(
                "{count}",
                String(branchPreview.impactedHiddenCount),
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2 rounded-md border border-border p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold">{t("story.step1.seeds.title")}</div>
          <Button size="sm" variant="secondary" onClick={addSeed}>
            {t("story.step1.seeds.add")}
          </Button>
        </div>
        {invalidSeedList.length > 0 ? (
          <div className="rounded-md border border-rose-500/35 bg-rose-500/10 px-2 py-2 text-[11px] text-rose-200">
            {t("story.step1.seeds.validation.summary")
              .replace("{count}", String(invalidSeedList.length))
              .replace("{total}", String(seedList.length))}
          </div>
        ) : null}
        <div className="space-y-3">
          {seedList.length === 0 ? <div className="text-xs text-muted-foreground">{t("story.step1.seeds.empty")}</div> : null}
          {seedList.map((seed, idx) => (
            <div key={seed.id} className="rounded-md border border-border p-2">
              <div className="grid grid-cols-2 gap-2">
                <Input value={seed.name} onChange={(e) => updateSeed(idx, { name: e.target.value })} placeholder={t("story.step1.seeds.name")} />
                <Input value={seed.identity} onChange={(e) => updateSeed(idx, { identity: e.target.value })} placeholder={t("story.step1.seeds.identity")} />
                <Input value={seed.personality} onChange={(e) => updateSeed(idx, { personality: e.target.value })} placeholder={t("story.step1.seeds.personality")} />
                <Input value={seed.appearance} onChange={(e) => updateSeed(idx, { appearance: e.target.value })} placeholder={t("story.step1.seeds.appearance")} />
                <div className="col-span-2 space-y-1">
                  <div className="text-[11px] text-muted-foreground">{t("story.step1.seeds.bindCharacter.label")}</div>
                  <Select
                    value={seed.linkedCharacterId || "__none__"}
                    onValueChange={(value) =>
                      updateSeed(idx, {
                        linkedCharacterId: value === "__none__" ? undefined : (value as any),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>{seed.linkedCharacterId || t("story.step1.seeds.bindCharacter.none")}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("story.step1.seeds.bindCharacter.none")}</SelectItem>
                      {characterOptions.map((character) => (
                        <SelectItem key={`seed-${seed.id}-character-${character.id}`} value={character.id}>
                          {character.name || character.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {characterOptions.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground">{t("story.step1.seeds.bindCharacter.empty")}</div>
                  ) : null}
                </div>
                <Input
                  className="col-span-2"
                  value={toCsv(seed.fateKeywords || [])}
                  onChange={(e) => updateSeed(idx, { fateKeywords: fromCsv(e.target.value) })}
                  placeholder={t("story.step1.seeds.fateKeywords")}
                />
                <Input
                  className="col-span-2"
                  value={seed.referenceImageUrl || ""}
                  onChange={(e) => updateSeed(idx, { referenceImageUrl: e.target.value })}
                  placeholder={t("story.step1.seeds.referenceUrl")}
                />
                <Input
                  className="col-span-2"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    uploadSeedImage(idx, f);
                    e.target.value = "";
                  }}
                />
                {seed.referenceAssetId || seed.referenceImageUrl ? (
                  <div className="col-span-2 rounded-md border border-border/70 bg-muted/20 p-2">
                    <div className="text-[11px] text-muted-foreground">
                      {t("story.step1.seeds.asset.id")}: {seed.referenceAssetId || t("story.step1.seeds.asset.untracked")}
                    </div>
                    {seed.referenceImageUrl ? (
                      <div className="mt-1 break-all text-[11px] text-muted-foreground">{seed.referenceImageUrl}</div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          updateLayout({ activeLeftTab: "assets" });
                          if (seed.referenceAssetId) {
                            selectAsset(seed.referenceAssetId, "story");
                          }
                        }}
                      >
                        {t("story.step1.seeds.asset.openTab")}
                      </Button>
                      {seed.referenceImageUrl ? (
                        <a
                          href={seed.referenceImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center justify-center border border-border px-3 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {t("common.view")}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {(seedValidationById.get(seed.id)?.length || 0) > 0 ? (
                  <div className="col-span-2 rounded-md border border-rose-500/35 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-200">
                    {t("story.step1.seeds.validation.missing")}:{" "}
                    {(seedValidationById.get(seed.id) || [])
                      .map((field) => t(`story.step1.seeds.validation.${field}`))
                      .join(", ")}
                  </div>
                ) : null}
              </div>
              <div className="mt-2 flex justify-end">
                <Button size="sm" variant="destructive" onClick={() => removeSeed(seed.id)}>
                  {t("story.step1.seeds.remove")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button className="w-full" onClick={generateStoryboard} loading={submitting} disabled={!topic.trim()}>
        {t("story.step1.submit")}
      </Button>
    </div>
  );
}
