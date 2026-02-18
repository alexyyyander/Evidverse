"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/button";
import Dialog from "@/components/ui/dialog";
import Input from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { comfyuiApi, filesApi, generationApi } from "@/lib/api";
import { collectNodeStep3MissingCharacterNames, resolveNodeRecommendedAction } from "@/lib/editor/storyProgress";
import { useEditorStore } from "@/store/editorStore";
import { useI18n } from "@/lib/i18nContext";
import StoryActionBadge from "@/components/editor/story/StoryActionBadge";
import type { StoryCharacterSeed } from "@/lib/editor/types";

function normalizeName(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function findBestSeedForCharacter(seeds: StoryCharacterSeed[], character: { id: string; name?: string }) {
  const charName = normalizeName(character.name || character.id);
  let best: { seed: StoryCharacterSeed; score: number } | null = null;
  for (const seed of seeds) {
    if (!seed.referenceAssetId && !seed.referenceImageUrl) continue;
    let score = 0;
    if (seed.linkedCharacterId && seed.linkedCharacterId === character.id) score += 100;
    const seedName = normalizeName(seed.name || "");
    if (seedName && charName) {
      if (seedName === charName) score += 90;
      else if (seedName.includes(charName) || charName.includes(seedName)) score += 60;
    }
    if (!best || score > best.score) {
      best = { seed, score };
    }
  }
  return best?.seed || null;
}

function resolveSeedReferenceAssetId(
  seed: StoryCharacterSeed,
  assets: Record<string, any>,
): string | null {
  let resolvedAssetId = String(seed.referenceAssetId || "").trim();
  if (resolvedAssetId) {
    const refAsset = assets[resolvedAssetId];
    if (!refAsset || refAsset.type !== "image") resolvedAssetId = "";
  }
  if (!resolvedAssetId && seed.referenceImageUrl) {
    const existing = Object.values(assets).find(
      (asset: any) => asset.type === "image" && asset.url === seed.referenceImageUrl,
    );
    if (existing) resolvedAssetId = String(existing.id || "");
  }
  return resolvedAssetId || null;
}

function isImageMappingValid(
  mappingId: string | null | undefined,
  assets: Record<string, any>,
): boolean {
  if (!mappingId) return false;
  const asset = assets[mappingId];
  return !!asset && asset.type === "image" && !!asset.url;
}

type BatchSeedUnresolvedReason = "no_seed" | "seed_missing_reference" | "seed_asset_invalid";

type BatchSeedPlanEntry = {
  characterId: string;
  characterName: string;
  seedId: string;
  seedName: string;
  resolvedAssetId: string | null;
  importableUrl: string | null;
  unresolvedReason: BatchSeedUnresolvedReason | null;
  canApply: boolean;
};

export default function Step3CharacterPanel() {
  const { t } = useI18n();
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);
  const [batchSelectedCharacterIds, setBatchSelectedCharacterIds] = useState<string[]>([]);
  const data = useEditorStore((s) => s.data);
  const workflow = useEditorStore((s) => s.data.storyWorkflow);
  const updateStoryUi = useEditorStore((s) => s.updateStoryUi);
  const updateNodeStep3 = useEditorStore((s) => s.updateNodeStep3);
  const updateNodeStep3Mapping = useEditorStore((s) => s.updateNodeStep3Mapping);
  const updateStoryGlobal = useEditorStore((s) => s.updateStoryGlobal);
  const addImageAsset = useEditorStore((s) => s.addImageAsset);
  const addCharacterImageAsset = useEditorStore((s) => s.addCharacterImageAsset);
  const addGenerationTask = useEditorStore((s) => s.addGenerationTask);
  const updateLayout = useEditorStore((s) => s.updateLayout);
  const confirmNodeStep3 = useEditorStore((s) => s.confirmNodeStep3);
  const mappingSectionRef = useRef<HTMLDivElement | null>(null);

  const node = useMemo(() => workflow?.nodes.find((n) => n.id === workflow.selectedNodeId) || null, [workflow]);
  const templatesQuery = useQuery({
    queryKey: ["comfyuiTemplates"],
    queryFn: () => comfyuiApi.listTemplates(),
    enabled: Boolean(node && node.step3.provider === "comfyui"),
  });

  const characters = useMemo(() => {
    if (!node) return [];
    const ids = new Set<string>();
    for (const beatId of node.beatIds) {
      const beat = data.beats[beatId];
      if (!beat) continue;
      for (const characterId of beat.characterIds) ids.add(characterId);
    }
    return Array.from(ids)
      .map((id) => data.characters[id])
      .filter(Boolean);
  }, [data.beats, data.characters, node]);
  const recommendation = useMemo(() => {
    if (!node) return null;
    return resolveNodeRecommendedAction(node, { beats: data.beats });
  }, [data.beats, node]);

  const focusTarget = workflow?.ui?.focusTarget || null;
  useEffect(() => {
    if (!workflow || !node) return;
    if (focusTarget !== "step3_mapping") return;
    const target = mappingSectionRef.current;
    if (target && typeof target.scrollIntoView === "function") {
      try {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {
        target.scrollIntoView();
      }
    }
    updateStoryUi({ focusTarget: null });
  }, [focusTarget, node, updateStoryUi, workflow]);

  if (!workflow || !node) return <div className="text-xs text-muted-foreground">{t("story.step3.empty")}</div>;

  const mapping = node.step3.characterAssetMap || {};
  const templates = templatesQuery.data || [];
  const selectedTemplate =
    templates.find((item) => item.id === node.step3.comfyuiTemplateId) || null;

  const generateRef = async (characterId: string) => {
    const character = data.characters[characterId];
    if (!character) return;
    const prompt = `${character.name}\n${character.description || ""}\n${node.step3.stylePrompt || ""}`.trim();
    const beatId = node.beatIds[0] || null;
    const comfyuiParams = {
      prompt,
      style_prompt: node.step3.stylePrompt || "",
      character_name: character.name || character.id,
      character_description: character.description || "",
      node_title: node.title,
      node_summary: node.step2.summary || "",
      node_background: node.step2.background || "",
      character_changes: node.step2.characterChanges || "",
      character_encounters: node.step2.encounters || "",
    };
    try {
      if (node.step3.provider === "comfyui" && node.step3.comfyuiTemplateId) {
        const { task_id } = await comfyuiApi.renderTemplate(node.step3.comfyuiTemplateId, comfyuiParams);
        addGenerationTask({
          id: task_id,
          type: "comfyui_image",
          status: "PENDING",
          createdAt: new Date().toISOString(),
          input: {
            templateId: node.step3.comfyuiTemplateId,
            params: comfyuiParams,
            provider: "comfyui",
            nodeId: node.id,
            characterId,
          },
          refIds: beatId
            ? { characterId, nodeId: node.id, beatId }
            : { characterId, nodeId: node.id },
        });
        updateLayout({ activeRightTab: "queue" });
        toast({ title: t("story.step3.toast.queued.title"), description: task_id, variant: "success" });
        return;
      }

      const { task_id } = await generationApi.generateCharacter({ prompt, anchor_id: null });
      addGenerationTask({
        id: task_id,
        type: "character",
        status: "PENDING",
        createdAt: new Date().toISOString(),
        input: { prompt, characterId, nodeId: node.id },
        refIds: { characterId, nodeId: node.id },
      });
      updateLayout({ activeRightTab: "queue" });
      toast({ title: t("story.step3.toast.queued.title"), description: task_id, variant: "success" });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("story.step3.toast.generateFailed.title");
      toast({ title: t("story.step3.toast.generateFailed.title"), description: message, variant: "destructive" });
    }
  };

  const uploadRef = async (characterId: string, file: File) => {
    try {
      const presigned = await filesApi.getPresignedUrl(file.name || "character-reference.png");
      const put = await fetch(presigned.url, {
        method: "PUT",
        body: file,
        headers: file.type ? { "Content-Type": file.type } : undefined,
      });
      if (!put.ok) {
        throw new Error(`Upload failed (${put.status})`);
      }
      const url = presigned.storage_url || "";
      const assetId = addCharacterImageAsset({ characterId: characterId as any, url, source: "upload" });
      updateNodeStep3Mapping(node.id, { ...mapping, [characterId]: assetId });
      toast({ title: t("story.step3.toast.uploaded.title"), description: file.name, variant: "success" });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("story.step3.toast.uploadFailed.title");
      toast({ title: t("story.step3.toast.uploadFailed.title"), description: message, variant: "destructive" });
    }
  };

  const missingCharacterNames = collectNodeStep3MissingCharacterNames(node, data);
  const allMapped = missingCharacterNames.length === 0;
  const characterSeeds = Array.isArray(workflow.global.characterSeeds) ? workflow.global.characterSeeds : [];

  const mapFromSeedReference = (characterId: string) => {
    const character = data.characters[characterId];
    if (!character) return;
    const seed = findBestSeedForCharacter(characterSeeds, { id: characterId, name: character.name });
    if (!seed) {
      toast({
        title: t("story.step3.toast.seedUnavailable.title"),
        description: t("story.step3.toast.seedUnavailable.desc").replace("{character}", character.name || character.id),
        variant: "destructive",
      });
      return;
    }
    let resolvedAssetId = resolveSeedReferenceAssetId(seed, data.assets);

    if (!resolvedAssetId && seed.referenceImageUrl) {
      resolvedAssetId = addImageAsset({
        url: seed.referenceImageUrl,
        source: "upload",
        relatedCharacterId: characterId as any,
        generationParams: { stage: "step1_seed", seedId: seed.id, importedBy: "step3_seed_shortcut" },
      });
    }

    if (!resolvedAssetId) {
      toast({
        title: t("story.step3.toast.seedUnavailable.title"),
        description: t("story.step3.toast.seedUnavailable.desc").replace("{character}", character.name || character.id),
        variant: "destructive",
      });
      return;
    }

    updateNodeStep3Mapping(node.id, { ...mapping, [characterId]: resolvedAssetId });
    updateStoryGlobal({
      characterSeeds: characterSeeds.map((item) =>
        item.id === seed.id
          ? { ...item, linkedCharacterId: characterId as any, referenceAssetId: resolvedAssetId as any }
          : item,
      ),
    });
    toast({
      title: t("story.step3.toast.seedMapped.title"),
      description: t("story.step3.toast.seedMapped.desc")
        .replace("{character}", character.name || character.id)
        .replace("{seed}", seed.name || seed.id),
      variant: "success",
    });
  };

  const batchSeedPlan = useMemo(() => {
    const entries: BatchSeedPlanEntry[] = [];
    for (const character of characters) {
      const mappedId = mapping[character.id];
      if (isImageMappingValid(mappedId, data.assets)) continue;
      const seed = findBestSeedForCharacter(characterSeeds, { id: character.id, name: character.name });
      if (!seed) {
        entries.push({
          characterId: character.id,
          characterName: character.name || character.id,
          seedId: "",
          seedName: "",
          resolvedAssetId: null,
          importableUrl: null,
          unresolvedReason: "no_seed",
          canApply: false,
        });
        continue;
      }
      const resolvedAssetId = resolveSeedReferenceAssetId(seed, data.assets);
      const importableUrl = !resolvedAssetId && seed.referenceImageUrl ? seed.referenceImageUrl : null;
      const hasReferenceAssetId = !!String(seed.referenceAssetId || "").trim();
      const hasReferenceUrl = !!String(seed.referenceImageUrl || "").trim();
      const canApply = !!resolvedAssetId || !!importableUrl;
      const unresolvedReason: BatchSeedUnresolvedReason | null = canApply
        ? null
        : hasReferenceAssetId
          ? "seed_asset_invalid"
          : hasReferenceUrl
            ? null
            : "seed_missing_reference";
      entries.push({
        characterId: character.id,
        characterName: character.name || character.id,
        seedId: seed.id,
        seedName: seed.name || seed.id,
        resolvedAssetId,
        importableUrl,
        unresolvedReason,
        canApply,
      });
    }
    return entries;
  }, [characterSeeds, characters, data.assets, mapping]);

  const batchSeedPreview = useMemo(() => {
    const actionableEntries = batchSeedPlan.filter((entry) => entry.canApply);
    const suggestionCount = actionableEntries.length;
    const unresolvedCount = Math.max(0, batchSeedPlan.length - suggestionCount);
    const fromExistingCount = actionableEntries.filter((entry) => !!entry.resolvedAssetId).length;
    const fromImportableUrlCount = actionableEntries.filter((entry) => !!entry.importableUrl).length;
    const pairs = actionableEntries.slice(0, 6).map((entry) => `${entry.characterName} ← ${entry.seedName}`);
    return {
      suggestionCount,
      unresolvedCount,
      fromExistingCount,
      fromImportableUrlCount,
      pairs,
      hasAny: batchSeedPlan.length > 0,
      hasActionable: suggestionCount > 0,
    };
  }, [batchSeedPlan]);

  const batchSelectableCharacterIds = useMemo(
    () =>
      batchSeedPlan
        .filter((entry) => entry.canApply)
        .map((entry) => entry.characterId),
    [batchSeedPlan],
  );
  const batchSelectedSet = useMemo(
    () => new Set(batchSelectedCharacterIds),
    [batchSelectedCharacterIds],
  );
  const batchSelectedCount = batchSelectedCharacterIds.length;
  const batchSelectedPreviewNames = useMemo(
    () =>
      batchSeedPlan
        .filter((entry) => batchSelectedSet.has(entry.characterId))
        .slice(0, 4)
        .map((entry) => entry.characterName),
    [batchSeedPlan, batchSelectedSet],
  );

  const applyBatchSeedMapping = () => {
    if (node.locked) return;
    let appliedCount = 0;
    let importedCount = 0;
    const missingBefore = characters.filter(
      (character) => !isImageMappingValid(mapping[character.id], data.assets),
    ).length;
    const nextMapping = { ...mapping };
    const seedUpdates = new Map<string, { linkedCharacterId: string; referenceAssetId: string }>();

    for (const entry of batchSeedPlan) {
      if (!batchSelectedSet.has(entry.characterId)) continue;
      let resolvedAssetId = entry.resolvedAssetId;
      if (!resolvedAssetId && entry.importableUrl) {
        resolvedAssetId = addImageAsset({
          url: entry.importableUrl,
          source: "upload",
          relatedCharacterId: entry.characterId as any,
          generationParams: { stage: "step1_seed", seedId: entry.seedId, importedBy: "step3_batch_seed_mapping" },
        });
        importedCount += 1;
      }

      if (!resolvedAssetId) {
        continue;
      }
      nextMapping[entry.characterId] = resolvedAssetId;
      seedUpdates.set(entry.seedId, {
        linkedCharacterId: entry.characterId,
        referenceAssetId: resolvedAssetId,
      });
      appliedCount += 1;
    }
    const unresolvedCount = Math.max(0, missingBefore - appliedCount);

    if (appliedCount === 0) {
      toast({
        title: t("story.step3.batchMap.noop.title"),
        description: t("story.step3.batchMap.noop.desc"),
        variant: "default",
      });
      return;
    }

    setBatchConfirmOpen(false);
    updateNodeStep3Mapping(node.id, nextMapping);
    if (seedUpdates.size > 0) {
      updateStoryGlobal({
        characterSeeds: characterSeeds.map((seed) => {
          const patch = seedUpdates.get(seed.id);
          if (!patch) return seed;
          return {
            ...seed,
            linkedCharacterId: patch.linkedCharacterId as any,
            referenceAssetId: patch.referenceAssetId as any,
          };
        }),
      });
    }
    toast({
      title: t("story.step3.batchMap.applied.title"),
      description: t("story.step3.batchMap.applied.desc")
        .replace("{applied}", String(appliedCount))
        .replace("{imported}", String(importedCount))
        .replace("{unresolved}", String(unresolvedCount)),
      variant: "success",
    });
  };

  const openBatchSeedConfirm = () => {
    if (node.locked || !batchSeedPreview.hasAny) return;
    setBatchSelectedCharacterIds(batchSelectableCharacterIds);
    setBatchConfirmOpen(true);
  };

  const toggleBatchSelection = (characterId: string) => {
    setBatchSelectedCharacterIds((prev) => {
      const set = new Set(prev);
      if (set.has(characterId)) {
        set.delete(characterId);
      } else {
        set.add(characterId);
      }
      return Array.from(set);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          #{node.order + 1} {node.title}
        </span>
        {recommendation ? <StoryActionBadge action={recommendation.action} tone="soft" className="text-[11px]" /> : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <div className="text-xs font-medium">{t("story.step3.provider.label")}</div>
          <Select value={node.step3.provider} onValueChange={(v) => updateNodeStep3(node.id, { provider: v as any })}>
            <SelectTrigger disabled={node.locked}>
              <SelectValue>
                {node.step3.provider === "comfyui" ? t("story.step3.provider.comfyui") : t("story.step3.provider.placeholder")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comfyui">{t("story.step3.provider.comfyui")}</SelectItem>
              <SelectItem value="placeholder" disabled>
                {t("story.step3.provider.placeholder")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium">{t("story.step3.status.label")}</div>
          <div className="rounded-md border border-border bg-muted/20 px-2 py-2 text-xs">{t(`story.status.${node.step3.status}`)}</div>
        </div>
      </div>

      {node.step3.provider === "comfyui" ? (
        <div className="space-y-1">
          <div className="text-xs font-medium">{t("story.step3.template.label")}</div>
          <Select
            value={node.step3.comfyuiTemplateId || ""}
            onValueChange={(v) => updateNodeStep3(node.id, { comfyuiTemplateId: v || undefined })}
          >
            <SelectTrigger disabled={node.locked || templatesQuery.isLoading}>
              <SelectValue placeholder={t("story.step3.template.placeholder")}>
                {selectedTemplate?.name || node.step3.comfyuiTemplateId || t("story.step3.template.placeholder")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("story.step3.template.none")}</SelectItem>
              {templates.map((tpl) => (
                <SelectItem key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {templatesQuery.isLoading ? (
            <div className="text-xs text-muted-foreground">{t("story.step3.template.loading")}</div>
          ) : null}
          {!templatesQuery.isLoading && templates.length === 0 ? (
            <div className="text-xs text-muted-foreground">{t("story.step3.template.empty")}</div>
          ) : null}
          {templatesQuery.error ? (
            <div className="text-xs text-destructive">{t("story.step3.template.loadFailed")}</div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1">
        <div className="text-xs font-medium">{t("story.step3.stylePrompt.label")}</div>
        <Input
          value={node.step3.stylePrompt}
          onChange={(e) => updateNodeStep3(node.id, { stylePrompt: e.target.value })}
          placeholder={t("story.step3.stylePrompt.placeholder")}
          disabled={node.locked}
        />
      </div>

      <div ref={mappingSectionRef} className="space-y-3 rounded-md border border-border p-3">
        <div className="text-xs font-semibold">{t("story.step3.characters.title")}</div>
        <div className="rounded-md border border-cyan-500/35 bg-cyan-500/10 px-2 py-2 text-xs text-cyan-100">
          <div className="font-medium">{t("story.step3.batchMap.title")}</div>
          <div className="mt-1 text-[11px]">
            {t("story.step3.batchMap.summary")
              .replace("{suggestions}", String(batchSeedPreview.suggestionCount))
              .replace("{existing}", String(batchSeedPreview.fromExistingCount))
              .replace("{importable}", String(batchSeedPreview.fromImportableUrlCount))}
          </div>
          {batchSeedPreview.unresolvedCount > 0 ? (
            <div className="mt-1 text-[11px] text-amber-200">
              {t("story.step3.batchMap.unresolved").replace("{count}", String(batchSeedPreview.unresolvedCount))}
            </div>
          ) : null}
          {batchSeedPreview.pairs.length > 0 ? (
            <div className="mt-1 text-[11px] text-cyan-200">
              {t("story.step3.batchMap.preview").replace("{pairs}", batchSeedPreview.pairs.join(", "))}
            </div>
          ) : null}
          <div className="mt-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={openBatchSeedConfirm}
              disabled={node.locked || !batchSeedPreview.hasAny}
            >
              {batchSeedPreview.hasActionable
                ? t("story.step3.batchMap.action")
                : t("story.step3.batchMap.reviewAction")}
            </Button>
          </div>
        </div>
        {characters.length === 0 ? <div className="text-xs text-muted-foreground">{t("story.step3.characters.empty")}</div> : null}
        {characters.map((character) => {
          const assetId = mapping[character.id];
          const asset = assetId ? data.assets[assetId] : null;
          return (
            <div key={character.id} className="rounded-md border border-border p-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{character.name || character.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {asset
                      ? `${t("story.step3.characters.mapped")}: ${asset.id}`
                      : t("story.step3.characters.unmapped")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => mapFromSeedReference(character.id)}
                    disabled={node.locked}
                  >
                    {t("story.step3.characters.useSeedRef")}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => generateRef(character.id)}
                    disabled={node.locked || node.step3.provider !== "comfyui"}
                  >
                    {t("story.step3.characters.generate")}
                  </Button>
                </div>
              </div>
              <div className="mt-2 grid gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  disabled={node.locked}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    uploadRef(character.id, file);
                    e.target.value = "";
                  }}
                />
                {asset?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.url} alt={character.name || character.id} className="h-24 w-full rounded-md border border-border object-cover" />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {!allMapped ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-2 text-xs text-amber-300">
          {t("story.step3.mapping.required")} {missingCharacterNames.slice(0, 6).join(", ")}
        </div>
      ) : null}

      <Button
        className="w-full"
        variant="secondary"
        onClick={() => {
          const result = confirmNodeStep3(node.id);
          if (!result.ok) {
            if (result.missing.length === 0) return;
            const preview = result.missing.slice(0, 6).join(", ");
            toast({
              title: t("story.step3.toast.mappingIncomplete.title"),
              description: t("story.step3.toast.mappingIncomplete.desc")
                .replace("{count}", String(result.missing.length))
                .replace("{names}", preview),
              variant: "destructive",
            });
            return;
          }
        }}
        disabled={node.locked}
      >
        {t("story.step3.confirm")}
      </Button>

      <Dialog
        open={batchConfirmOpen}
        onOpenChange={setBatchConfirmOpen}
        title={t("story.step3.batchMap.confirm.title")}
        description={t("story.step3.batchMap.confirm.desc")
          .replace("{count}", String(batchSelectedCount))
          .replace("{preview}", batchSelectedPreviewNames.join(", ") || "-")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setBatchConfirmOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="secondary" onClick={applyBatchSeedMapping} disabled={batchSelectedCount === 0}>
              {t("story.step3.batchMap.confirm.action")}
            </Button>
          </div>
        }
      >
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {t("story.step3.batchMap.confirm.selection")
                .replace("{selected}", String(batchSelectedCount))
                .replace("{total}", String(batchSelectableCharacterIds.length))}
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setBatchSelectedCharacterIds(batchSelectableCharacterIds)}
              disabled={batchSelectableCharacterIds.length === 0}
            >
              {t("story.step3.batchMap.confirm.selectAll")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setBatchSelectedCharacterIds([])}
              disabled={batchSelectedCount === 0}
            >
              {t("story.step3.batchMap.confirm.clear")}
            </Button>
          </div>
          {batchSeedPlan.length === 0 ? (
            <div>{t("story.step3.batchMap.noop.desc")}</div>
          ) : (
            batchSeedPlan.slice(0, 8).map((entry) => (
              <div key={`batch-plan-${entry.characterId}`} className="rounded border border-border/60 px-2 py-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-foreground">
                    {entry.characterName}
                    {entry.seedName ? ` ← ${entry.seedName}` : ""}
                  </div>
                  {entry.canApply ? (
                    <Button
                      size="sm"
                      variant={batchSelectedSet.has(entry.characterId) ? "primary" : "secondary"}
                      onClick={() => toggleBatchSelection(entry.characterId)}
                    >
                      {batchSelectedSet.has(entry.characterId)
                        ? t("story.step3.batchMap.confirm.included")
                        : t("story.step3.batchMap.confirm.excluded")}
                    </Button>
                  ) : null}
                </div>
                <div>
                  {entry.resolvedAssetId
                    ? t("story.step3.batchMap.confirm.source.existing").replace("{asset}", entry.resolvedAssetId)
                    : entry.importableUrl
                      ? t("story.step3.batchMap.confirm.source.import")
                      : `${t("story.step3.batchMap.confirm.source.unresolved")} · ${t(
                          `story.step3.batchMap.confirm.reason.${entry.unresolvedReason || "no_seed"}`,
                        )}`}
                </div>
              </div>
            ))
          )}
          {batchSeedPlan.length > 8 ? (
            <div>{t("story.step3.batchMap.confirm.more").replace("{count}", String(batchSeedPlan.length - 8))}</div>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
