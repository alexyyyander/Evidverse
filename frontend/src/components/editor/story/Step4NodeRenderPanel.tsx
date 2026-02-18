"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/button";
import Dialog from "@/components/ui/dialog";
import Input from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { comfyuiApi, generationApi } from "@/lib/api";
import {
  resolveNodeRecommendedAction,
  resolveStep4BlockBadgeClass,
  summarizeNodeStep4RenderReadiness,
} from "@/lib/editor/storyProgress";
import { useEditorStore } from "@/store/editorStore";
import { useI18n } from "@/lib/i18nContext";
import StoryActionBadge from "@/components/editor/story/StoryActionBadge";

type ParamValueType = "string" | "number" | "boolean" | "json" | "null";
type ParamRow = {
  key: string;
  type: ParamValueType;
  value: string;
};

type TemplateLike = {
  bindings?: Array<{ param?: string | null } | null> | null;
  workflow?: Record<string, any> | null;
};

type ImageAssetLike = {
  id: string;
  type?: string;
  createdAt?: string;
  relatedBeatId?: string | null;
  relatedCharacterId?: string | null;
};

function parseJsonObject(raw: string) {
  const text = String(raw || "").trim();
  if (!text) return {};
  const parsed = JSON.parse(text);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("params must be a JSON object");
  }
  return parsed as Record<string, any>;
}

function inferParamType(value: unknown): ParamValueType {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "json";
}

function objectToParamRows(obj: Record<string, any>): ParamRow[] {
  return Object.entries(obj).map(([key, value]) => {
    const type = inferParamType(value);
    if (type === "null") return { key, type, value: "" };
    if (type === "boolean") return { key, type, value: value ? "true" : "false" };
    if (type === "json") return { key, type, value: JSON.stringify(value) };
    return { key, type, value: String(value) };
  });
}

function rowsToParamObject(rows: ParamRow[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const row of rows) {
    const key = row.key.trim();
    if (!key) continue;
    if (row.type === "string") {
      out[key] = row.value;
      continue;
    }
    if (row.type === "number") {
      if (!row.value.trim()) throw new Error(`number param "${key}" is empty`);
      const n = Number(row.value);
      if (!Number.isFinite(n)) throw new Error(`number param "${key}" is invalid`);
      out[key] = n;
      continue;
    }
    if (row.type === "boolean") {
      out[key] = row.value !== "false";
      continue;
    }
    if (row.type === "null") {
      out[key] = null;
      continue;
    }
    if (!row.value.trim()) throw new Error(`json param "${key}" is empty`);
    out[key] = JSON.parse(row.value);
  }
  return out;
}

function defaultValueByType(type: ParamValueType): string {
  if (type === "number") return "0";
  if (type === "boolean") return "true";
  if (type === "json") return "{}";
  return "";
}

function collectWorkflowPlaceholderParams(workflow: unknown): string[] {
  const keys = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === "string") {
      const braceMatches = Array.from(value.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g));
      for (const match of braceMatches) {
        const key = String(match[1] || "").trim();
        if (key) keys.add(key);
      }
      const templateMatches = Array.from(value.matchAll(/\$\{\s*([a-zA-Z0-9_.-]+)\s*\}/g));
      for (const match of templateMatches) {
        const key = String(match[1] || "").trim();
        if (key) keys.add(key);
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (value && typeof value === "object") {
      for (const next of Object.values(value as Record<string, unknown>)) visit(next);
    }
  };
  visit(workflow);
  return Array.from(keys);
}

function collectTemplateParamCandidates(template: TemplateLike | null | undefined): string[] {
  if (!template) return [];
  const keys = new Set<string>();

  for (const item of template.bindings || []) {
    const key = String(item?.param || "").trim();
    if (key) keys.add(key);
  }

  for (const key of collectWorkflowPlaceholderParams(template.workflow || {})) {
    keys.add(key);
  }

  return Array.from(keys);
}

function toTimestamp(value: string | undefined): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

function pickLatestBy<T extends { createdAt?: string }>(list: T[]): T | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  return [...list].sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))[0] || null;
}

export default function Step4NodeRenderPanel() {
  const { t } = useI18n();
  const [paramsMode, setParamsMode] = useState<"visual" | "json">("visual");
  const [visualRows, setVisualRows] = useState<ParamRow[]>([]);
  const [visualDirty, setVisualDirty] = useState(false);
  const [visualError, setVisualError] = useState<string | null>(null);
  const [restoreDraftDialogOpen, setRestoreDraftDialogOpen] = useState(false);
  const autoFillAppliedKeyRef = useRef<string | null>(null);
  const invalidJsonDraftRef = useRef<string | null>(null);
  const imageBindingSectionRef = useRef<HTMLDivElement | null>(null);
  const paramsSectionRef = useRef<HTMLDivElement | null>(null);
  const videoConfirmSectionRef = useRef<HTMLDivElement | null>(null);
  const data = useEditorStore((s) => s.data);
  const workflow = useEditorStore((s) => s.data.storyWorkflow);
  const updateStoryUi = useEditorStore((s) => s.updateStoryUi);
  const updateNodeStep4 = useEditorStore((s) => s.updateNodeStep4);
  const updateNodeStep4Binding = useEditorStore((s) => s.updateNodeStep4Binding);
  const confirmNodeVideo = useEditorStore((s) => s.confirmNodeVideo);
  const setActiveStep = useEditorStore((s) => s.setActiveStep);
  const addGenerationTask = useEditorStore((s) => s.addGenerationTask);
  const updateLayout = useEditorStore((s) => s.updateLayout);
  const selectStoryNode = useEditorStore((s) => s.selectStoryNode);

  const node = useMemo(() => workflow?.nodes.find((n) => n.id === workflow.selectedNodeId) || null, [workflow]);
  const templatesQuery = useQuery({
    queryKey: ["comfyuiTemplates"],
    queryFn: () => comfyuiApi.listTemplates(),
    enabled: Boolean(node && node.step4.provider === "comfyui"),
  });
  const selectedTemplateId = node?.step4.comfyuiTemplateId || "";
  const templateDetailQuery = useQuery({
    queryKey: ["comfyuiTemplate", selectedTemplateId],
    queryFn: () => comfyuiApi.getTemplate(selectedTemplateId),
    enabled: Boolean(node && node.step4.provider === "comfyui" && selectedTemplateId),
    staleTime: 30_000,
  });
  const imageAssets = useMemo(() => Object.values(data.assets).filter((asset) => asset.type === "image"), [data.assets]);
  const sortedImageAssets = useMemo(
    () =>
      [...imageAssets].sort((a, b) => {
        const aTs = toTimestamp((a as any).createdAt);
        const bTs = toTimestamp((b as any).createdAt);
        return bTs - aTs;
      }),
    [imageAssets],
  );
  const videoAsset = useMemo(() => (node?.step4.videoAssetId ? data.assets[node.step4.videoAssetId] : null), [data.assets, node]);
  const characterIds = useMemo(() => {
    if (!node) return [] as string[];
    const ids = new Set<string>();
    for (const beatId of node.beatIds) {
      const beat = data.beats[beatId];
      if (!beat) continue;
      for (const characterId of beat.characterIds) ids.add(characterId);
    }
    return Array.from(ids);
  }, [data.beats, node]);

  useEffect(() => {
    if (!node) return;
    try {
      const rows = objectToParamRows(parseJsonObject(node.step4.comfyuiParamsJson || "{}"));
      setVisualRows(rows);
      setVisualError(null);
    } catch {
      invalidJsonDraftRef.current = String(node.step4.comfyuiParamsJson || "");
      setVisualRows([]);
      setVisualError(t("story.step4.params.visual.invalidJson"));
    }
    setVisualDirty(false);
  }, [node?.id, node?.step4.comfyuiParamsJson, t]);

  if (!workflow || !node) return <div className="text-xs text-muted-foreground">{t("story.step4.empty")}</div>;
  const templates = templatesQuery.data || [];
  const selectedTemplate = templates.find((tpl) => tpl.id === node.step4.comfyuiTemplateId) || null;
  const recommendation = resolveNodeRecommendedAction(node, { beats: data.beats });
  const autoFillEnabled = !!workflow?.ui?.step4AutoFillEnabled;
  const templateParamCandidates = useMemo(
    () => collectTemplateParamCandidates(templateDetailQuery.data as TemplateLike | null | undefined),
    [templateDetailQuery.data],
  );
  const templateParamCoverage = useMemo(() => {
    if (!node || templateParamCandidates.length === 0) {
      return {
        total: templateParamCandidates.length,
        present: 0,
        missing: [] as string[],
        hasInvalidJson: false,
      };
    }
    try {
      const currentObj = parseJsonObject(node.step4.comfyuiParamsJson || "{}");
      const present = templateParamCandidates.filter((key) => Object.prototype.hasOwnProperty.call(currentObj, key));
      const missing = templateParamCandidates.filter((key) => !Object.prototype.hasOwnProperty.call(currentObj, key));
      return { total: templateParamCandidates.length, present: present.length, missing, hasInvalidJson: false };
    } catch {
      return {
        total: templateParamCandidates.length,
        present: 0,
        missing: [...templateParamCandidates],
        hasInvalidJson: true,
      };
    }
  }, [node, node?.step4.comfyuiParamsJson, templateParamCandidates]);

  const beatId = node.beatIds[0];
  const beat = beatId ? data.beats[beatId] : null;
  const narration = String(node.step2.summary || beat?.narration || "").trim();
  const visualDescription = String(node.step2.background || beat?.cameraDescription || "").trim();
  const mergedCharacterAssetIds = useMemo(
    () => ({
      ...(node.step3.characterAssetMap || {}),
      ...(node.step4.assetBindings.characterAssetIds || {}),
    }),
    [node.step3.characterAssetMap, node.step4.assetBindings.characterAssetIds],
  );
  const startImageAsset = node.step4.assetBindings.startImageAssetId
    ? data.assets[node.step4.assetBindings.startImageAssetId] || null
    : null;
  const backgroundImageAsset = node.step4.assetBindings.backgroundAssetId
    ? data.assets[node.step4.assetBindings.backgroundAssetId] || null
    : null;
  const endImageAsset = node.step4.assetBindings.endImageAssetId
    ? data.assets[node.step4.assetBindings.endImageAssetId] || null
    : null;
  const primaryImageAsset =
    (startImageAsset && startImageAsset.type === "image" ? startImageAsset : null) ||
    (backgroundImageAsset && backgroundImageAsset.type === "image" ? backgroundImageAsset : null);
  const step4Readiness = useMemo(
    () => summarizeNodeStep4RenderReadiness(node, data),
    [data, node],
  );
  const step4ParamsError = useMemo(() => {
    if (node.step4.provider !== "comfyui") return null;
    try {
      parseJsonObject(node.step4.comfyuiParamsJson || "{}");
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : t("story.step4.toast.invalidParams.desc");
    }
  }, [node.step4.comfyuiParamsJson, node.step4.provider, t]);
  const imageBindingMissing = step4Readiness.imageBindingMissing;
  const step4MissingCharacterNames = step4Readiness.missingCharacterNames;
  const step4MappingIncomplete = !step4Readiness.mappingComplete;
  const suggestedBindingPatch = useMemo(() => {
    const currentBindings = node.step4.assetBindings || { characterAssetIds: {} };
    const currentCharacterBindings = currentBindings.characterAssetIds || {};
    const characterAssetIds: Record<string, string | null> = {};
    let characterAdded = 0;
    for (const characterId of characterIds) {
      if (currentCharacterBindings[characterId]) continue;
      const candidate = pickLatestBy(
        sortedImageAssets.filter((asset) => (asset as ImageAssetLike).relatedCharacterId === characterId),
      );
      if (!candidate) continue;
      characterAssetIds[characterId] = candidate.id;
      characterAdded += 1;
    }

    const beatRelatedAsset = pickLatestBy(
      sortedImageAssets.filter((asset) =>
        !!(asset as ImageAssetLike).relatedBeatId && node.beatIds.includes(String((asset as ImageAssetLike).relatedBeatId)),
      ),
    );
    const fallbackImage = beatRelatedAsset || pickLatestBy(sortedImageAssets);
    const backgroundAssetId =
      currentBindings.backgroundAssetId || !fallbackImage ? undefined : fallbackImage.id;
    const startImageAssetId =
      currentBindings.startImageAssetId ||
      (!fallbackImage ? undefined : backgroundAssetId || currentBindings.backgroundAssetId || fallbackImage.id);
    const endImageAssetId =
      currentBindings.endImageAssetId ||
      (!fallbackImage ? undefined : startImageAssetId || backgroundAssetId || currentBindings.backgroundAssetId || fallbackImage.id);

    return {
      characterAssetIds,
      backgroundAssetId,
      startImageAssetId,
      endImageAssetId,
      characterAdded,
      backgroundAdded: backgroundAssetId ? 1 : 0,
      startAdded: startImageAssetId ? 1 : 0,
      endAdded: endImageAssetId ? 1 : 0,
      totalAdded:
        characterAdded +
        (backgroundAssetId ? 1 : 0) +
        (startImageAssetId ? 1 : 0) +
        (endImageAssetId ? 1 : 0),
    };
  }, [characterIds, node.beatIds, node.step4.assetBindings, sortedImageAssets]);

  const focusTarget = workflow?.ui?.focusTarget || null;
  const gotoStep3Mapping = () => {
    selectStoryNode(node.id, "story");
    updateStoryUi({ focusTarget: "step3_mapping" });
    setActiveStep("step3");
  };
  const gotoStep4ImageBinding = () => {
    selectStoryNode(node.id, "story");
    updateStoryUi({ focusTarget: "step4_image_binding" });
    setActiveStep("step4");
  };
  const gotoStep4ParamsFix = () => {
    selectStoryNode(node.id, "story");
    updateStoryUi({ focusTarget: "step4_params" });
    setActiveStep("step4");
    setParamsMode("json");
  };
  const blockedItems = [
    ...(step4MappingIncomplete
      ? [
          {
            id: "mapping" as const,
            label: t("story.step4.block.mapping"),
            reason: `${t("story.step4.mapping.required")} ${step4MissingCharacterNames.slice(0, 6).join(", ")}`.trim(),
            fixLabel: t("story.step4.submitBlocked.fixMapping"),
            onFix: gotoStep3Mapping,
            action: "fix_step3" as const,
          },
        ]
      : []),
    ...(imageBindingMissing
      ? [
          {
            id: "image" as const,
            label: t("story.step4.block.image"),
            reason: t("story.step4.image.required"),
            fixLabel: t("story.step4.submitBlocked.fixImage"),
            onFix: gotoStep4ImageBinding,
            action: "render_step4" as const,
          },
        ]
      : []),
    ...(step4ParamsError
      ? [
          {
            id: "params" as const,
            label: t("story.step4.block.params"),
            reason: `${t("story.step4.submitBlocked.params")} ${step4ParamsError}`.trim(),
            fixLabel: t("story.step4.submitBlocked.fixParams"),
            onFix: gotoStep4ParamsFix,
            action: "render_step4" as const,
          },
        ]
      : []),
  ];
  const generateBlockedReasons = blockedItems.map((item) => item.reason);
  const generateBlockedReason = generateBlockedReasons.join(" ");
  const generateDisabled = node.locked || !beatId || step4MappingIncomplete || imageBindingMissing || !!step4ParamsError;
  const videoConfirmMissing = !videoAsset || videoAsset.type !== "video" || !videoAsset.url;

  const updateVisualRow = (index: number, patch: Partial<ParamRow>) => {
    setVisualRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setVisualDirty(true);
  };

  const hasDraftToRestore =
    !!invalidJsonDraftRef.current &&
    String(node.step4.comfyuiParamsJson || "").trim() !== String(invalidJsonDraftRef.current || "").trim();

  const restoreInvalidJsonDraft = () => {
    const draft = invalidJsonDraftRef.current;
    if (!draft) return;
    updateNodeStep4(node.id, { comfyuiParamsJson: draft });
    setParamsMode("json");
    setRestoreDraftDialogOpen(false);
  };

  const removeVisualRow = (index: number) => {
    setVisualRows((prev) => prev.filter((_, i) => i !== index));
    setVisualDirty(true);
  };

  const addVisualRow = () => {
    setVisualRows((prev) => [...prev, { key: "", type: "string", value: "" }]);
    setVisualDirty(true);
  };

  const applyVisualRows = () => {
    try {
      const obj = rowsToParamObject(visualRows);
      updateNodeStep4(node.id, { comfyuiParamsJson: JSON.stringify(obj, null, 2) });
      setVisualDirty(false);
      setVisualError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("story.step4.toast.invalidParams.desc");
      setVisualError(message);
      toast({
        title: t("story.step4.toast.invalidParams.title"),
        description: message,
        variant: "destructive",
      });
    }
  };

  const importTemplateParams = (
    template: TemplateLike | null | undefined,
    options: { notify: boolean; skipOnInvalidCurrentJson?: boolean },
  ) => {
    if (!template) return { imported: false, addedCount: 0, totalCount: 0, skipped: false };
    const candidateParams = collectTemplateParamCandidates(template);
    const totalCount = candidateParams.length;
    const { notify, skipOnInvalidCurrentJson = false } = options;
    if (candidateParams.length === 0) {
      if (notify) {
        toast({
          title: t("story.step4.template.noBindingParams.title"),
          description: t("story.step4.template.noBindingParams.desc"),
          variant: "default",
        });
      }
      return { imported: false, addedCount: 0, totalCount, skipped: false };
    }

    let currentObj: Record<string, any> = {};
    let currentJsonInvalid = false;
    try {
      currentObj = parseJsonObject(node.step4.comfyuiParamsJson || "{}");
    } catch {
      currentJsonInvalid = true;
      if (skipOnInvalidCurrentJson) {
        return { imported: false, addedCount: 0, totalCount, skipped: true };
      }
      currentObj = {};
    }

    const nextObj = { ...currentObj };
    let addedCount = 0;
    for (const key of candidateParams) {
      if (Object.prototype.hasOwnProperty.call(nextObj, key)) continue;
      nextObj[key] = "";
      addedCount += 1;
    }

    if (addedCount > 0 || currentJsonInvalid) {
      updateNodeStep4(node.id, { comfyuiParamsJson: JSON.stringify(nextObj, null, 2) });
      setVisualRows(objectToParamRows(nextObj));
      setVisualDirty(false);
      setVisualError(null);
      setParamsMode("visual");
    }

    if (!notify) return { imported: addedCount > 0, addedCount, totalCount, skipped: false };

    if (addedCount === 0) {
      toast({
        title: t("story.step4.template.imported.noop.title"),
        description: t("story.step4.template.imported.noop.desc"),
        variant: "default",
      });
      return { imported: false, addedCount: 0, totalCount, skipped: false };
    }
    toast({
      title: t("story.step4.template.imported.title"),
      description: t("story.step4.template.imported.desc").replace("{count}", String(addedCount)),
      variant: "success",
    });
    return { imported: true, addedCount, totalCount, skipped: false };
  };

  const importParamsFromTemplate = () => {
    if (!selectedTemplateId) return;
    const template = templateDetailQuery.data as TemplateLike | null | undefined;
    if (!template) return;
    importTemplateParams(template, { notify: true, skipOnInvalidCurrentJson: false });
  };

  const resetAutoFillForTemplate = () => {
    autoFillAppliedKeyRef.current = null;
  };

  const onToggleAutoFill = () => {
    if (autoFillEnabled) {
      updateStoryUi({ step4AutoFillEnabled: false });
      return;
    }
    resetAutoFillForTemplate();
    updateStoryUi({ step4AutoFillEnabled: true });
  };

  const onTemplateChange = (value: string) => {
    resetAutoFillForTemplate();
    updateNodeStep4(node.id, { comfyuiTemplateId: value || undefined });
  };

  useEffect(() => {
    if (!node) return;
    if (!autoFillEnabled) return;
    if (node.step4.provider !== "comfyui") return;
    if (!selectedTemplateId) return;
    const template = templateDetailQuery.data as TemplateLike | null | undefined;
    if (!template) return;

    const applyKey = `${node.id}:${selectedTemplateId}`;
    if (autoFillAppliedKeyRef.current === applyKey) return;
    importTemplateParams(template, { notify: false, skipOnInvalidCurrentJson: true });
    autoFillAppliedKeyRef.current = applyKey;
  }, [
    autoFillEnabled,
    node?.id,
    node?.step4.provider,
    node?.step4.comfyuiParamsJson,
    selectedTemplateId,
    templateDetailQuery.data,
  ]);

  useEffect(() => {
    if (!selectedTemplateId) {
      resetAutoFillForTemplate();
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    resetAutoFillForTemplate();
  }, [node?.id]);

  useEffect(() => {
    if (!workflow || !node) return;
    if (focusTarget !== "step4_image_binding" && focusTarget !== "step4_video_confirm" && focusTarget !== "step4_params") return;
    const targetRef =
      focusTarget === "step4_image_binding"
        ? imageBindingSectionRef
        : focusTarget === "step4_video_confirm"
          ? videoConfirmSectionRef
          : paramsSectionRef;
    const target = targetRef.current;
    if (target && typeof target.scrollIntoView === "function") {
      try {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {
        target.scrollIntoView();
      }
    }
    updateStoryUi({ focusTarget: null });
  }, [focusTarget, node, updateStoryUi, workflow]);

  const runRender = async () => {
    if (node.locked || !beatId) return;
    if (!visualDescription) {
      toast({
        title: t("story.step4.toast.missingVisual.title"),
        description: t("story.step4.toast.missingVisual.desc"),
        variant: "destructive",
      });
      return;
    }
    if (step4MissingCharacterNames.length > 0) {
      toast({
        title: t("story.step4.toast.mappingIncomplete.title"),
        description: t("story.step4.toast.mappingIncomplete.desc")
          .replace("{count}", String(step4MissingCharacterNames.length))
          .replace("{names}", step4MissingCharacterNames.slice(0, 6).join(", ")),
        variant: "destructive",
      });
      return;
    }
    if (imageBindingMissing) {
      toast({
        title: t("story.step4.toast.missingImage.title"),
        description: t("story.step4.toast.missingImage.desc"),
        variant: "destructive",
      });
      return;
    }
    const imageUrl = primaryImageAsset?.url;
    const startImageUrl = startImageAsset && startImageAsset.type === "image" ? startImageAsset.url : undefined;
    const endImageUrl = endImageAsset && endImageAsset.type === "image" ? endImageAsset.url : undefined;
    const characterAssetUrls = Object.fromEntries(
      Object.entries(mergedCharacterAssetIds).map(([characterId, assetId]) => [
        characterId,
        assetId ? data.assets[assetId]?.url || null : null,
      ]),
    );
    try {
      let taskId = "";
      let taskType: "segment" | "comfyui_video" = "segment";
      let taskInput: Record<string, any> = {
        narration,
        visual_description: visualDescription,
        image_url: imageUrl || null,
        start_image_url: startImageUrl || null,
        end_image_url: endImageUrl || null,
        character_asset_ids: mergedCharacterAssetIds,
        nodeId: node.id,
      };

      if (node.step4.provider === "comfyui") {
        if (!node.step4.comfyuiTemplateId) {
          toast({
            title: t("story.step4.toast.missingTemplate.title"),
            description: t("story.step4.toast.missingTemplate.desc"),
            variant: "destructive",
          });
          return;
        }
        let paramOverrides: Record<string, any> = {};
        try {
          if (paramsMode === "visual" && !visualError) {
            paramOverrides = rowsToParamObject(visualRows);
            const canonicalJson = JSON.stringify(paramOverrides, null, 2);
            if (String(node.step4.comfyuiParamsJson || "").trim() !== canonicalJson.trim()) {
              updateNodeStep4(node.id, { comfyuiParamsJson: canonicalJson });
            }
            if (visualDirty) {
              setVisualDirty(false);
            }
          } else {
            paramOverrides = parseJsonObject(node.step4.comfyuiParamsJson || "{}");
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : t("story.step4.toast.invalidParams.desc");
          setVisualError(message);
          toast({
            title: t("story.step4.toast.invalidParams.title"),
            description: message,
            variant: "destructive",
          });
          return;
        }
        const params = {
          narration,
          visual_description: visualDescription,
          image_url: imageUrl || null,
          start_image_url: startImageUrl || null,
          end_image_url: endImageUrl || null,
          character_asset_ids: mergedCharacterAssetIds,
          character_asset_urls: characterAssetUrls,
          node_id: node.id,
          node_title: node.title,
          node_summary: node.step2.summary || "",
          node_background: node.step2.background || "",
          beat_id: beatId,
          ...paramOverrides,
        };
        const { task_id } = await comfyuiApi.renderTemplate(node.step4.comfyuiTemplateId, params);
        taskId = task_id;
        taskType = "comfyui_video";
        taskInput = {
          templateId: node.step4.comfyuiTemplateId,
          params,
          paramOverrides,
          provider: "comfyui",
          output: "video",
          nodeId: node.id,
        };
      } else {
        const { task_id } = await generationApi.generateSegment({
          narration,
          visual_description: visualDescription,
          image_url: imageUrl || null,
        });
        taskId = task_id;
      }

      addGenerationTask({
        id: taskId,
        type: taskType,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        input: taskInput,
        refIds: { beatId, nodeId: node.id },
      });
      updateNodeStep4Binding(node.id, {
        ...node.step4.assetBindings,
        characterAssetIds: mergedCharacterAssetIds,
      });
      if (node.step4.provider === "comfyui") {
        updateNodeStep4(node.id, {
          provider: "comfyui",
          comfyuiTemplateId: node.step4.comfyuiTemplateId,
        });
      }
      updateLayout({ activeRightTab: "queue" });
      toast({ title: t("story.step4.toast.queued.title"), description: taskId, variant: "success" });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("story.step4.toast.renderFailed.title");
      toast({ title: t("story.step4.toast.renderFailed.title"), description: message, variant: "destructive" });
    }
  };

  const applySuggestedBindings = () => {
    if (node.locked) return;
    if (suggestedBindingPatch.totalAdded === 0) {
      toast({
        title: t("story.step4.suggestBindings.none.title"),
        description: t("story.step4.suggestBindings.none.desc"),
        variant: "default",
      });
      return;
    }
    updateNodeStep4Binding(node.id, {
      ...node.step4.assetBindings,
      backgroundAssetId: suggestedBindingPatch.backgroundAssetId || node.step4.assetBindings.backgroundAssetId,
      startImageAssetId: suggestedBindingPatch.startImageAssetId || node.step4.assetBindings.startImageAssetId,
      endImageAssetId: suggestedBindingPatch.endImageAssetId || node.step4.assetBindings.endImageAssetId,
      characterAssetIds: {
        ...(node.step4.assetBindings.characterAssetIds || {}),
        ...suggestedBindingPatch.characterAssetIds,
      },
    });
    toast({
      title: t("story.step4.suggestBindings.applied.title"),
      description: t("story.step4.suggestBindings.applied.desc")
        .replace("{total}", String(suggestedBindingPatch.totalAdded))
        .replace("{mapping}", String(suggestedBindingPatch.characterAdded))
        .replace("{image}", String(suggestedBindingPatch.backgroundAdded + suggestedBindingPatch.startAdded + suggestedBindingPatch.endAdded)),
      variant: "success",
    });
  };

  const nextNode =
    workflow.nodes.find((candidate) => candidate.order > node.order && !candidate.locked && !candidate.step4.confirmed) ||
    workflow.nodes.find((candidate) => candidate.order > node.order && !candidate.locked) ||
    null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {t("story.step4.currentNode")}: #{node.order + 1} {node.title}
        </span>
        <StoryActionBadge action={recommendation.action} tone="soft" className="text-[11px]" />
      </div>
      {step4MissingCharacterNames.length > 0 ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-2 text-xs text-amber-300">
          <div>{t("story.step4.mapping.required")} {step4MissingCharacterNames.slice(0, 6).join(", ")}</div>
          <div className="mt-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setActiveStep("step3");
                selectStoryNode(node.id, "story");
              }}
            >
              {t("story.step4.mapping.backToStep3")}
            </Button>
          </div>
        </div>
      ) : null}
      {imageBindingMissing ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-2 text-xs text-amber-300">
          {t("story.step4.image.required")}
        </div>
      ) : null}
      {suggestedBindingPatch.totalAdded > 0 ? (
        <div className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-2 text-xs text-cyan-200">
          <div className="font-medium">{t("story.step4.suggestBindings.title")}</div>
          <div className="mt-1 text-[11px]">
            {t("story.step4.suggestBindings.summary")
              .replace("{mapping}", String(suggestedBindingPatch.characterAdded))
              .replace("{background}", String(suggestedBindingPatch.backgroundAdded))
              .replace("{start}", String(suggestedBindingPatch.startAdded))
              .replace("{end}", String(suggestedBindingPatch.endAdded))}
          </div>
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={applySuggestedBindings} disabled={node.locked}>
              {t("story.step4.suggestBindings.action")}
            </Button>
          </div>
        </div>
      ) : null}
      {blockedItems.length > 0 ? (
        <div className="rounded-md border border-rose-500/35 bg-rose-500/10 px-2 py-2 text-xs text-rose-200">
          <div className="font-medium">{t("story.step4.submitBlocked.title")}</div>
          <div className="mt-2 space-y-2">
            {blockedItems.map((item) => (
              <div key={`step4-blocked-${item.id}`} className="rounded-md border border-rose-500/20 bg-black/10 px-2 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded border px-1 py-0.5 text-[10px] ${resolveStep4BlockBadgeClass(item.id)}`}>
                    {item.label}
                  </span>
                  <StoryActionBadge action={item.action} tone="soft" withLabel={false} />
                </div>
                <div className="mt-1 text-[11px]">{item.reason}</div>
                <div className="mt-2">
                  <Button size="sm" variant="secondary" onClick={item.onFix} disabled={node.locked}>
                    {item.fixLabel}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div ref={imageBindingSectionRef} className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="space-y-1">
          <div className="text-xs font-medium">{t("story.step4.renderProvider.label")}</div>
          <Select
            value={node.step4.provider}
            onValueChange={(v) =>
              updateNodeStep4(node.id, {
                provider: v as any,
                comfyuiTemplateId:
                  v === "comfyui"
                    ? node.step4.comfyuiTemplateId || node.step3.comfyuiTemplateId
                    : node.step4.comfyuiTemplateId,
              })
            }
          >
            <SelectTrigger disabled={node.locked}>
              <SelectValue>{t(`story.step4.renderProvider.${node.step4.provider}`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="segment">{t("story.step4.renderProvider.segment")}</SelectItem>
              <SelectItem value="comfyui">{t("story.step4.renderProvider.comfyui")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium">{t("story.step4.status.label")}</div>
          <div className="rounded-md border border-border bg-muted/20 px-2 py-2 text-xs">{t(`story.status.${node.step4.status}`)}</div>
        </div>
      </div>

      {node.step4.provider === "comfyui" ? (
        <div ref={paramsSectionRef} className="space-y-3">
          <div className="text-xs font-medium">{t("story.step4.template.label")}</div>
          <Select
            value={node.step4.comfyuiTemplateId || ""}
            onValueChange={onTemplateChange}
          >
            <SelectTrigger disabled={node.locked || templatesQuery.isLoading}>
              <SelectValue placeholder={t("story.step4.template.placeholder")}>
                {selectedTemplate?.name || node.step4.comfyuiTemplateId || t("story.step4.template.placeholder")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("story.step4.template.none")}</SelectItem>
              {templates.map((tpl) => (
                <SelectItem key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {templatesQuery.isLoading ? (
            <div className="text-xs text-muted-foreground">{t("story.step4.template.loading")}</div>
          ) : null}
          {!templatesQuery.isLoading && templates.length === 0 ? (
            <div className="text-xs text-muted-foreground">{t("story.step4.template.empty")}</div>
          ) : null}
          {templatesQuery.error ? (
            <div className="text-xs text-destructive">{t("story.step4.template.loadFailed")}</div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={importParamsFromTemplate}
              disabled={node.locked || !selectedTemplateId || templateDetailQuery.isLoading}
            >
              {templateDetailQuery.isLoading
                ? t("story.step4.template.importParams.loading")
                : t("story.step4.template.importParams.action")}
            </Button>
            {templateDetailQuery.error ? (
              <span className="text-xs text-destructive">{t("story.step4.template.importParams.failed")}</span>
            ) : null}
            <Button
              size="sm"
              variant={autoFillEnabled ? "primary" : "secondary"}
              onClick={onToggleAutoFill}
              disabled={node.locked || !selectedTemplateId}
            >
              {autoFillEnabled ? t("story.step4.template.autoFill.on") : t("story.step4.template.autoFill.off")}
            </Button>
          </div>
          <div className="text-[11px] text-muted-foreground">{t("story.step4.template.autoFill.help")}</div>
          {selectedTemplateId ? (
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <div>
                {t("story.step4.template.bindingCoverage")
                  .replace("{present}", String(templateParamCoverage.present))
                  .replace("{total}", String(templateParamCoverage.total))}
              </div>
              {templateParamCoverage.missing.length > 0 ? (
                <div className={templateParamCoverage.hasInvalidJson ? "text-destructive" : ""}>
                  {t("story.step4.template.bindingMissing")
                    .replace("{count}", String(templateParamCoverage.missing.length))
                    .replace("{keys}", templateParamCoverage.missing.slice(0, 8).join(", "))}
                </div>
              ) : null}
              {templateParamCoverage.hasInvalidJson ? (
                <div className="text-destructive">{t("story.step4.template.bindingInvalidJson")}</div>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-2 rounded-md border border-border/70 p-2">
            <div className="text-xs font-medium">{t("story.step4.params.label")}</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground">{t("story.step4.params.mode.label")}:</span>
              <Button
                size="sm"
                variant={paramsMode === "visual" ? "primary" : "secondary"}
                onClick={() => setParamsMode("visual")}
                disabled={node.locked}
              >
                {t("story.step4.params.mode.visual")}
              </Button>
              <Button
                size="sm"
                variant={paramsMode === "json" ? "primary" : "secondary"}
                onClick={() => setParamsMode("json")}
                disabled={node.locked}
              >
                {t("story.step4.params.mode.json")}
              </Button>
              {hasDraftToRestore ? (
                <Button size="sm" variant="secondary" onClick={() => setRestoreDraftDialogOpen(true)} disabled={node.locked}>
                  {t("story.step4.params.visual.restore")}
                </Button>
              ) : null}
              {paramsMode === "visual" && visualDirty ? (
                <span className="text-[11px] text-amber-400">{t("story.step4.params.visual.unsaved")}</span>
              ) : null}
            </div>

            {paramsMode === "visual" ? (
              <div className="space-y-2">
                {visualError ? (
                  <div className="space-y-2">
                    <div className="text-xs text-destructive">{visualError}</div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        invalidJsonDraftRef.current = String(node.step4.comfyuiParamsJson || invalidJsonDraftRef.current || "");
                        updateNodeStep4(node.id, { comfyuiParamsJson: "{}" });
                        setVisualError(null);
                        setVisualRows([]);
                        setVisualDirty(false);
                      }}
                      disabled={node.locked}
                    >
                      {t("story.step4.params.visual.reset")}
                    </Button>
                  </div>
                ) : (
                  <>
                    {visualRows.length === 0 ? (
                      <div className="text-xs text-muted-foreground">{t("story.step4.params.visual.empty")}</div>
                    ) : null}
                    {visualRows.map((row, index) => (
                      <div key={`param-row-${index}`} className="grid grid-cols-1 gap-2 rounded-md border border-border/60 p-2 md:grid-cols-[1.2fr_0.9fr_1fr_auto]">
                        <Input
                          value={row.key}
                          onChange={(e) => updateVisualRow(index, { key: e.target.value })}
                          placeholder={t("story.step4.params.visual.key")}
                          disabled={node.locked}
                        />
                        <Select
                          value={row.type}
                          onValueChange={(v) =>
                            updateVisualRow(index, {
                              type: v as ParamValueType,
                              value: defaultValueByType(v as ParamValueType),
                            })
                          }
                        >
                          <SelectTrigger disabled={node.locked}>
                            <SelectValue>{t(`story.step4.params.type.${row.type}`)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">{t("story.step4.params.type.string")}</SelectItem>
                            <SelectItem value="number">{t("story.step4.params.type.number")}</SelectItem>
                            <SelectItem value="boolean">{t("story.step4.params.type.boolean")}</SelectItem>
                            <SelectItem value="json">{t("story.step4.params.type.json")}</SelectItem>
                            <SelectItem value="null">{t("story.step4.params.type.null")}</SelectItem>
                          </SelectContent>
                        </Select>
                        {row.type === "boolean" ? (
                          <Select value={row.value || "true"} onValueChange={(v) => updateVisualRow(index, { value: v })}>
                            <SelectTrigger disabled={node.locked}>
                              <SelectValue>{row.value || "true"}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">true</SelectItem>
                              <SelectItem value="false">false</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={row.value}
                            onChange={(e) => updateVisualRow(index, { value: e.target.value })}
                            placeholder={t("story.step4.params.visual.value")}
                            disabled={node.locked || row.type === "null"}
                          />
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeVisualRow(index)}
                          disabled={node.locked}
                        >
                          {t("story.step4.params.visual.remove")}
                        </Button>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={addVisualRow} disabled={node.locked}>
                        {t("story.step4.params.visual.add")}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={applyVisualRows} disabled={node.locked || !visualDirty}>
                        {t("story.step4.params.visual.apply")}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <Textarea
                  value={node.step4.comfyuiParamsJson || "{}"}
                  onChange={(e) => updateNodeStep4(node.id, { comfyuiParamsJson: e.target.value })}
                  placeholder={t("story.step4.params.placeholder")}
                  className="min-h-[110px] font-mono text-[11px]"
                  disabled={node.locked}
                />
              </div>
            )}
            <div className="text-[11px] text-muted-foreground">{t("story.step4.params.help")}</div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="space-y-1">
          <div className="text-xs font-medium">{t("story.step4.backgroundAsset")}</div>
          <Select
            value={node.step4.assetBindings.backgroundAssetId || ""}
            onValueChange={(v) => updateNodeStep4Binding(node.id, { backgroundAssetId: v || undefined })}
          >
            <SelectTrigger disabled={node.locked}>
              <SelectValue>{node.step4.assetBindings.backgroundAssetId || t("story.step4.selectImageAsset")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("story.step4.none")}</SelectItem>
              {imageAssets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium">{t("story.step4.startImageAsset")}</div>
          <Select
            value={node.step4.assetBindings.startImageAssetId || ""}
            onValueChange={(v) => updateNodeStep4Binding(node.id, { startImageAssetId: v || undefined })}
          >
            <SelectTrigger disabled={node.locked}>
              <SelectValue>{node.step4.assetBindings.startImageAssetId || t("story.step4.selectImageAsset")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("story.step4.none")}</SelectItem>
              {imageAssets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <div className="text-xs font-medium">{t("story.step4.endImageAsset")}</div>
          <Select
            value={node.step4.assetBindings.endImageAssetId || ""}
            onValueChange={(v) => updateNodeStep4Binding(node.id, { endImageAssetId: v || undefined })}
          >
            <SelectTrigger disabled={node.locked}>
              <SelectValue>{node.step4.assetBindings.endImageAssetId || t("story.step4.selectImageAsset")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("story.step4.none")}</SelectItem>
              {imageAssets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2 rounded-md border border-border p-2">
        <div className="text-xs font-medium">{t("story.step4.characterAssets")}</div>
        {characterIds.length === 0 ? (
          <div className="text-xs text-muted-foreground">{t("story.step4.none")}</div>
        ) : (
          characterIds.map((characterId) => {
            const character = data.characters[characterId];
            const mappedAssetId =
              node.step4.assetBindings.characterAssetIds?.[characterId] ||
              node.step3.characterAssetMap?.[characterId] ||
              "";
            return (
              <div key={characterId} className="grid grid-cols-1 gap-2 md:grid-cols-[180px_1fr] md:items-center">
                <div className="text-xs text-muted-foreground">{character?.name || characterId}</div>
                <Select
                  value={mappedAssetId || ""}
                  onValueChange={(v) =>
                    updateNodeStep4Binding(node.id, {
                      characterAssetIds: {
                        ...node.step4.assetBindings.characterAssetIds,
                        [characterId]: v || null,
                      },
                    })
                  }
                >
                  <SelectTrigger disabled={node.locked}>
                    <SelectValue>{mappedAssetId || t("story.step4.selectImageAsset")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("story.step4.none")}</SelectItem>
                    {imageAssets.map((asset) => (
                      <SelectItem key={`${characterId}-${asset.id}`} value={asset.id}>
                        {asset.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })
        )}
      </div>

      <div className="rounded-md border border-border bg-muted/20 p-2 text-xs">
        <div>{t("story.step4.status")}: {t(`story.status.${node.step4.status}`)}</div>
        <div>{t("story.step4.renderProvider.label")}: {t(`story.step4.renderProvider.${node.step4.provider}`)}</div>
        {node.step4.provider === "comfyui" ? (
          <div>{t("story.step4.template.label")}: {node.step4.comfyuiTemplateId || t("story.step4.none")}</div>
        ) : null}
        {node.step4.provider === "comfyui" ? (
          <div>{t("story.step4.params.label")}: {String(node.step4.comfyuiParamsJson || "{}").trim() || t("story.step4.none")}</div>
        ) : null}
        <div>{t("story.step4.confirmed")}: {String(node.step4.confirmed)}</div>
        <div>{t("story.step4.videoAsset")}: {node.step4.videoAssetId || t("story.step4.none")}</div>
        <div className="text-muted-foreground">
          {t("story.step4.imageSourceHint")}
        </div>
      </div>

      <div ref={videoConfirmSectionRef} className="space-y-1">
        {videoConfirmMissing ? (
          <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-2 text-xs text-rose-300">
            {t("story.step4.video.required")}
          </div>
        ) : null}
        {generateBlockedReason ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex w-full">
                <Button className="w-full" onClick={runRender} disabled={generateDisabled}>
                  {t("story.step4.generateVideo")}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-[360px] whitespace-normal text-xs">
              {generateBlockedReason}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button className="w-full" onClick={runRender} disabled={generateDisabled}>
            {t("story.step4.generateVideo")}
          </Button>
        )}
        {generateBlockedReason ? (
          <div className="text-[11px] text-amber-300">
            {generateBlockedReason}
          </div>
        ) : null}
      </div>

      {videoAsset?.url ? (
        <div className="space-y-2">
          <video src={videoAsset.url} controls className="max-h-64 w-full rounded-md border border-border bg-black" />
          <div className="text-[11px] text-muted-foreground">
            {nextNode
              ? t("story.step4.loopHint.next").replace("{title}", nextNode.title)
              : t("story.step4.loopHint.done")}
          </div>
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => {
              const result = confirmNodeVideo(node.id);
              if (!result.ok) return;
              toast({
                title: t("story.step4.toast.confirmed.title"),
                description: nextNode
                  ? t("story.step4.toast.confirmed.next").replace("{title}", nextNode.title)
                  : t("story.step4.toast.confirmed.done"),
                variant: "success",
              });
              if (nextNode) {
                selectStoryNode(nextNode.id, "story");
              }
              setActiveStep("step2");
            }}
          >
            {t("story.step4.confirmNext")}
          </Button>
        </div>
      ) : null}

      <Dialog
        open={restoreDraftDialogOpen}
        onOpenChange={setRestoreDraftDialogOpen}
        title={t("story.step4.params.visual.restoreConfirm.title")}
        description={t("story.step4.params.visual.restoreConfirm.desc")}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRestoreDraftDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="secondary" onClick={restoreInvalidJsonDraft}>
              {t("story.step4.params.visual.restoreConfirm.action")}
            </Button>
          </div>
        }
      >
        <div className="text-xs text-muted-foreground">{t("story.step4.params.visual.restoreConfirm.hint")}</div>
      </Dialog>
    </div>
  );
}
