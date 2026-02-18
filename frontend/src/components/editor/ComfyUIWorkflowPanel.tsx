"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { comfyuiApi, generationApi } from "@/lib/api";
import type { ComfyUITemplateSummary } from "@/lib/api/types";
import { resolveNodeRecommendedAction } from "@/lib/editor/storyProgress";
import { useEditorStore } from "@/store/editorStore";
import { useI18n } from "@/lib/i18nContext";
import StoryActionBadge from "@/components/editor/story/StoryActionBadge";

function parseJson<T>(raw: string, fallback: T): T {
  const text = String(raw || "").trim();
  if (!text) return fallback;
  return JSON.parse(text) as T;
}

function extractBindingParamKeys(raw: string): string[] {
  const text = String(raw || "").trim();
  if (!text) return [];
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("bindings must be an array");
  }
  const keys = parsed
    .map((item) => (item && typeof item === "object" && typeof (item as any).param === "string" ? String((item as any).param).trim() : ""))
    .filter(Boolean);
  return Array.from(new Set(keys));
}

export default function ComfyUIWorkflowPanel({ onRequestStoryTab }: { onRequestStoryTab?: () => void }) {
  const { t } = useI18n();
  const [output, setOutput] = useState<"image" | "video">("image");
  const [workflowJson, setWorkflowJson] = useState("");
  const [bindingsJson, setBindingsJson] = useState("");
  const [paramsJson, setParamsJson] = useState('{"prompt": ""}');
  const [uploadParam, setUploadParam] = useState("image");
  const [uploadUrl, setUploadUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState<ComfyUITemplateSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [runtime, setRuntime] = useState<{
    reachable: boolean | null;
    runningCount: number;
    pendingCount: number;
  }>({
    reachable: null,
    runningCount: 0,
    pendingCount: 0,
  });

  const selection = useEditorStore((s) => s.selection);
  const workflow = useEditorStore((s) => s.data.storyWorkflow);
  const beats = useEditorStore((s) => s.data.beats);
  const assets = useEditorStore((s) => s.data.assets);
  const setActiveStep = useEditorStore((s) => s.setActiveStep);
  const selectStoryNode = useEditorStore((s) => s.selectStoryNode);
  const addGenerationTask = useEditorStore((s) => s.addGenerationTask);
  const updateLayout = useEditorStore((s) => s.updateLayout);
  const updateNodeStep3 = useEditorStore((s) => s.updateNodeStep3);
  const updateNodeStep4 = useEditorStore((s) => s.updateNodeStep4);

  const selectedBeatId = useMemo(() => (selection.selectedBeatId ? String(selection.selectedBeatId) : ""), [selection.selectedBeatId]);
  const selectedNode = useMemo(() => {
    if (!workflow || !selection.selectedStoryNodeId) return null;
    return workflow.nodes.find((n) => n.id === selection.selectedStoryNodeId) || null;
  }, [workflow, selection.selectedStoryNodeId]);
  const recommendation = useMemo(() => {
    if (!selectedNode) return null;
    return resolveNodeRecommendedAction(selectedNode, { beats });
  }, [beats, selectedNode]);

  const suggestedOutput = useMemo(() => {
    if (!workflow) return "image";
    return workflow.activeStep === "step4" ? "video" : "image";
  }, [workflow]);
  useEffect(() => {
    if (!workflow) return;
    if (workflow.activeStep !== "step3" && workflow.activeStep !== "step4") return;
    setOutput(suggestedOutput);
  }, [workflow, suggestedOutput]);

  const goRecommended = () => {
    if (!selectedNode || !recommendation) return;
    selectStoryNode(selectedNode.id, "story");
    setActiveStep(recommendation.targetStep);
    if (recommendation.targetStep === "step1" || recommendation.targetStep === "step2") {
      onRequestStoryTab?.();
    }
  };

  const selectedNodeTemplateId = useMemo(() => {
    if (!selectedNode || !workflow) return "";
    if (workflow.activeStep === "step4") {
      return selectedNode.step4.comfyuiTemplateId || selectedNode.step3.comfyuiTemplateId || "";
    }
    return selectedNode.step3.comfyuiTemplateId || selectedNode.step4.comfyuiTemplateId || "";
  }, [selectedNode, workflow]);

  const syncTemplateToCurrentNode = useCallback(
    (templateId: string) => {
      if (!selectedNode || !workflow) return;
      if (workflow.activeStep === "step4" || output === "video") {
        updateNodeStep4(selectedNode.id, {
          provider: "comfyui",
          comfyuiTemplateId: templateId || undefined,
        });
        return;
      }
      updateNodeStep3(selectedNode.id, {
        provider: "comfyui",
        comfyuiTemplateId: templateId || undefined,
      });
    },
    [output, selectedNode, updateNodeStep3, updateNodeStep4, workflow],
  );

  const loadRuntimeSnapshot = useCallback(async () => {
    setRuntimeLoading(true);
    try {
      const [health, queue] = await Promise.all([comfyuiApi.health(), comfyuiApi.queue()]);
      const runningRaw = (queue as any)?.queue_running;
      const pendingRaw = (queue as any)?.queue_pending;
      const runningCount = Array.isArray(runningRaw)
        ? runningRaw.length
        : runningRaw && typeof runningRaw === "object"
          ? Object.keys(runningRaw).length
          : 0;
      const pendingCount = Array.isArray(pendingRaw)
        ? pendingRaw.length
        : pendingRaw && typeof pendingRaw === "object"
          ? Object.keys(pendingRaw).length
          : 0;
      setRuntime({
        reachable: !!health?.reachable,
        runningCount,
        pendingCount,
      });
    } catch {
      setRuntime((prev) => ({ ...prev, reachable: false }));
    } finally {
      setRuntimeLoading(false);
    }
  }, []);
  const loadTemplateList = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const items = await comfyuiApi.listTemplates();
      setTemplates(items);
      setSelectedTemplateId((prev) => {
        if (prev && items.some((item) => item.id === prev)) return prev;
        return items[0]?.id || "";
      });
    } catch {
      setTemplates([]);
      setSelectedTemplateId("");
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRuntimeSnapshot();
    void loadTemplateList();
  }, [loadRuntimeSnapshot, loadTemplateList]);

  useEffect(() => {
    if (templates.length === 0) {
      setSelectedTemplateId(selectedNodeTemplateId || "");
      return;
    }
    if (selectedNodeTemplateId && templates.some((item) => item.id === selectedNodeTemplateId)) {
      setSelectedTemplateId(selectedNodeTemplateId);
      return;
    }
    setSelectedTemplateId((prev) => {
      if (prev && templates.some((item) => item.id === prev)) return prev;
      return templates[0]?.id || "";
    });
  }, [selectedNodeTemplateId, templates]);

  const applyTemplateToEditor = async () => {
    if (!selectedTemplateId) return;
    setLoadingTemplate(true);
    try {
      const template = await comfyuiApi.getTemplate(selectedTemplateId);
      setWorkflowJson(JSON.stringify(template.workflow || {}, null, 2));
      setBindingsJson(JSON.stringify(template.bindings || [], null, 2));
      syncTemplateToCurrentNode(selectedTemplateId);
      toast({
        title: t("comfyui.workflow.templates.loaded"),
        description: template.name,
        variant: "success",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("common.error");
      toast({
        title: t("common.error"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoadingTemplate(false);
    }
  };
  const copyUnmatchedBindingKeys = async () => {
    if (bindingPreview.unmatched.length === 0) {
      toast({
        title: t("comfyui.workflow.params.copyMissing.empty.title"),
        description: t("comfyui.workflow.params.copyMissing.empty.desc"),
        variant: "default",
      });
      return;
    }
    const text = bindingPreview.unmatched.join(", ");
    try {
      const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : null;
      if (!clipboard?.writeText) {
        throw new Error("clipboard unavailable");
      }
      await clipboard.writeText(text);
      toast({
        title: t("comfyui.workflow.params.copyMissing.success.title"),
        description: t("comfyui.workflow.params.copyMissing.success.desc").replace(
          "{count}",
          String(bindingPreview.unmatched.length),
        ),
        variant: "success",
      });
    } catch {
      toast({
        title: t("comfyui.workflow.params.copyMissing.failed.title"),
        description: t("comfyui.workflow.params.copyMissing.failed.desc"),
        variant: "destructive",
      });
    }
  };

  const buildNodeContextParams = (node: NonNullable<typeof selectedNode>) => {
    const beatId = node.beatIds[0] || null;
    const beat = beatId ? beats[beatId] : null;
    const mergedCharacterAssetIds = {
      ...(node.step3.characterAssetMap || {}),
      ...(node.step4.assetBindings.characterAssetIds || {}),
    };
    const characterAssetUrls = Object.fromEntries(
      Object.entries(mergedCharacterAssetIds).map(([characterId, assetId]) => [
        characterId,
        assetId ? assets[assetId]?.url || null : null,
      ]),
    );
    const backgroundAssetId = node.step4.assetBindings.backgroundAssetId || null;
    const startImageAssetId = node.step4.assetBindings.startImageAssetId || null;
    const endImageAssetId = node.step4.assetBindings.endImageAssetId || null;
    const videoAssetId = node.step4.videoAssetId || null;

    return {
      node_id: node.id,
      node_order: node.order,
      node_title: node.title,
      scene_id: node.sceneId || null,
      beat_id: beatId,
      node_summary: node.step2.summary || "",
      node_background: node.step2.background || "",
      character_changes: node.step2.characterChanges || "",
      encounters: node.step2.encounters || "",
      narration: String(node.step2.summary || beat?.narration || "").trim(),
      visual_description: String(node.step2.background || beat?.cameraDescription || "").trim(),
      background_asset_id: backgroundAssetId,
      background_image_url: backgroundAssetId ? assets[backgroundAssetId]?.url || null : null,
      start_image_asset_id: startImageAssetId,
      start_image_url: startImageAssetId ? assets[startImageAssetId]?.url || null : null,
      end_image_asset_id: endImageAssetId,
      end_image_url: endImageAssetId ? assets[endImageAssetId]?.url || null : null,
      video_asset_id: videoAssetId,
      video_asset_url: videoAssetId ? assets[videoAssetId]?.url || null : null,
      character_asset_ids: mergedCharacterAssetIds,
      character_asset_urls: characterAssetUrls,
    } as Record<string, any>;
  };
  const bindingPreview = useMemo(() => {
    const text = String(bindingsJson || "").trim();
    if (!text || !selectedNode) {
      return { keys: [] as string[], matched: [] as string[], unmatched: [] as string[], invalid: false };
    }
    try {
      const keys = extractBindingParamKeys(text);
      const contextKeys = new Set(Object.keys(buildNodeContextParams(selectedNode)));
      const matched = keys.filter((key) => contextKeys.has(key));
      const unmatched = keys.filter((key) => !contextKeys.has(key));
      return { keys, matched, unmatched, invalid: false };
    } catch {
      return { keys: [] as string[], matched: [] as string[], unmatched: [] as string[], invalid: true };
    }
  }, [bindingsJson, selectedNode]);

  const parseBaseParamsJson = () => {
    const baseParams = parseJson<Record<string, any>>(paramsJson, {});
    if (!baseParams || typeof baseParams !== "object" || Array.isArray(baseParams)) {
      throw new Error("params must be a JSON object");
    }
    return baseParams;
  };

  const injectNodeContextParams = () => {
    if (!selectedNode) return;

    let baseParams: Record<string, any> = {};
    try {
      baseParams = parseBaseParamsJson();
    } catch {
      toast({
        title: t("comfyui.workflow.params.invalidJson.title"),
        description: t("comfyui.workflow.params.invalidJson.desc"),
        variant: "destructive",
      });
      return;
    }

    const contextParams = buildNodeContextParams(selectedNode);

    setParamsJson(JSON.stringify({ ...baseParams, ...contextParams }, null, 2));
    toast({ title: t("comfyui.workflow.params.injected"), variant: "success" });
  };

  const injectContextByBindings = () => {
    if (!selectedNode) return;
    let baseParams: Record<string, any> = {};
    try {
      baseParams = parseBaseParamsJson();
    } catch {
      toast({
        title: t("comfyui.workflow.params.invalidJson.title"),
        description: t("comfyui.workflow.params.invalidJson.desc"),
        variant: "destructive",
      });
      return;
    }

    let bindingKeys: string[] = [];
    try {
      bindingKeys = extractBindingParamKeys(bindingsJson);
    } catch {
      toast({
        title: t("comfyui.workflow.params.bindingsInvalid.title"),
        description: t("comfyui.workflow.params.bindingsInvalid.desc"),
        variant: "destructive",
      });
      return;
    }

    if (bindingKeys.length === 0) {
      toast({
        title: t("comfyui.workflow.params.bindingsEmpty.title"),
        description: t("comfyui.workflow.params.bindingsEmpty.desc"),
        variant: "default",
      });
      return;
    }

    const contextParams = buildNodeContextParams(selectedNode);
    const filtered = Object.fromEntries(
      Object.entries(contextParams).filter(([key]) => bindingKeys.includes(key)),
    );

    if (Object.keys(filtered).length === 0) {
      toast({
        title: t("comfyui.workflow.params.bindingsNoMatch.title"),
        description: t("comfyui.workflow.params.bindingsNoMatch.desc").replace(
          "{keys}",
          bindingKeys.slice(0, 8).join(", "),
        ),
        variant: "default",
      });
      return;
    }

    setParamsJson(JSON.stringify({ ...baseParams, ...filtered }, null, 2));
    toast({
      title: t("comfyui.workflow.params.bindingsInjected.title"),
      description: t("comfyui.workflow.params.bindingsInjected.desc").replace("{count}", String(Object.keys(filtered).length)),
      variant: "success",
    });
  };

  const loadWorkflowFile = async (file: File) => {
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      if (obj && typeof obj === "object" && ("nodes" in obj || "links" in obj)) {
        toast({
          title: t("comfyui.workflow.invalid.title"),
          description: t("comfyui.workflow.invalid.desc"),
          variant: "destructive",
        });
        return;
      }
      setWorkflowJson(JSON.stringify(obj, null, 2));
    } catch (e) {
      const message = e instanceof Error ? e.message : t("common.error");
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    }
  };

  const run = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const workflow = parseJson<Record<string, any>>(workflowJson, {});
      if (!workflow || typeof workflow !== "object" || Object.keys(workflow).length === 0) {
        toast({ title: t("common.error"), description: t("comfyui.workflow.missing"), variant: "destructive" });
        return;
      }
      const bindings = bindingsJson.trim().length > 0 ? parseJson<any[]>(bindingsJson, []) : null;
      const params = parseJson<Record<string, any>>(paramsJson, {});
      const uploads =
        uploadUrl.trim().length > 0
          ? [
              {
                param: uploadParam.trim() || "image",
                url: uploadUrl.trim(),
              },
            ]
          : null;

      const { task_id } = await generationApi.generateComfyUI({
        workflow,
        bindings,
        params,
        uploads,
        output,
      });

      if (selectedTemplateId) {
        syncTemplateToCurrentNode(selectedTemplateId);
      }

      const beatId = selectedBeatId || null;
      let refIds: Record<string, string> | undefined;
      if (beatId && selectedNode) refIds = { beatId, nodeId: selectedNode.id };
      else if (beatId) refIds = { beatId };
      else if (selectedNode) refIds = { nodeId: selectedNode.id };
      addGenerationTask({
        id: task_id,
        type: output === "video" ? "comfyui_video" : "comfyui_image",
        status: "PENDING",
        createdAt: new Date().toISOString(),
        input: { workflow, bindings, params, uploads, output },
        refIds,
      });
      updateLayout({ activeRightTab: "queue" });
      toast({
        title: t("workflow.toast.queued.title"),
        description: `${t("comfyui.workflow.taskPrefix")}: ${task_id}`,
        variant: "success",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("common.error");
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border p-4">
        <div className="text-sm font-semibold">{t("comfyui.workflow.title")}</div>
        <div className="mt-1 text-xs text-muted-foreground">{t("comfyui.workflow.subtitle")}</div>
        {workflow ? (
          <div className="mt-2 text-[11px] text-muted-foreground">
            {t("comfyui.workflow.activeStep")}: {workflow.activeStep} · {t("comfyui.workflow.suggestedOutput")}: {suggestedOutput}
          </div>
        ) : null}
        {selectedNode ? (
          <div className="mt-1 text-[11px] text-muted-foreground">
            {t("comfyui.workflow.selectedNode")}: #{selectedNode.order + 1} {selectedNode.title}
          </div>
        ) : null}
        {recommendation ? (
          <div className="mt-2 flex items-center justify-between gap-2">
            <StoryActionBadge action={recommendation.action} tone="soft" className="text-[11px]" />
            <Button size="sm" variant="secondary" onClick={goRecommended} disabled={workflow?.activeStep === recommendation.targetStep}>
              {t("editor.header.goRecommended")}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="p-4 space-y-4 overflow-y-auto">
        <div className="rounded-md border border-border/60 bg-background/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-foreground">{t("comfyui.workflow.runtime")}</div>
            <Button size="sm" variant="secondary" onClick={() => void loadRuntimeSnapshot()} loading={runtimeLoading}>
              {t("settings.comfyui.runtime.refresh")}
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span>
              {t("settings.comfyui.runtime.reachability")}:{" "}
              {runtime.reachable === null
                ? t("common.loading")
                : runtime.reachable
                  ? t("settings.comfyui.runtime.reachable")
                  : t("settings.comfyui.runtime.unavailable")}
            </span>
            <span>{t("settings.comfyui.runtime.running").replace("{count}", String(runtime.runningCount))}</span>
            <span>{t("settings.comfyui.runtime.pending").replace("{count}", String(runtime.pendingCount))}</span>
          </div>
        </div>

        <div className="rounded-md border border-border/60 bg-background/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-foreground">{t("comfyui.workflow.templates")}</div>
            <Button size="sm" variant="secondary" onClick={() => void loadTemplateList()} loading={templatesLoading}>
              {t("settings.comfyui.runtime.refresh")}
            </Button>
          </div>
          {templatesLoading ? (
            <div className="mt-2 text-[11px] text-muted-foreground">{t("common.loading")}</div>
          ) : templates.length === 0 ? (
            <div className="mt-2 text-[11px] text-muted-foreground">{t("comfyui.workflow.templates.empty")}</div>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <select
                className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={selectedTemplateId}
                onChange={(e) => {
                  const next = e.target.value;
                  setSelectedTemplateId(next);
                  syncTemplateToCurrentNode(next);
                }}
                aria-label={t("comfyui.workflow.templates.select")}
              >
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="secondary"
                onClick={applyTemplateToEditor}
                loading={loadingTemplate}
                disabled={!selectedTemplateId}
              >
                {t("comfyui.workflow.templates.load")}
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-medium text-foreground">{t("comfyui.workflow.output")}</div>
          <div className="flex gap-2">
            <Button variant={output === "image" ? "primary" : "secondary"} size="sm" onClick={() => setOutput("image")}>
              {t("comfyui.workflow.output.image")}
            </Button>
            <Button variant={output === "video" ? "primary" : "secondary"} size="sm" onClick={() => setOutput("video")}>
              {t("comfyui.workflow.output.video")}
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-foreground">{t("comfyui.workflow.file")}</div>
            <Input
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) loadWorkflowFile(f);
              }}
            />
          </div>
          <Textarea value={workflowJson} onChange={(e) => setWorkflowJson(e.target.value)} placeholder={t("comfyui.workflow.file.placeholder")} className="min-h-[160px]" />
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-medium text-foreground">{t("comfyui.workflow.bindings")}</div>
          <Textarea value={bindingsJson} onChange={(e) => setBindingsJson(e.target.value)} placeholder={t("comfyui.workflow.bindings.placeholder")} className="min-h-[90px]" />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-foreground">{t("comfyui.workflow.params")}</div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={injectNodeContextParams} disabled={!selectedNode}>
                {t("comfyui.workflow.params.injectContext")}
              </Button>
              <Button size="sm" variant="secondary" onClick={injectContextByBindings} disabled={!selectedNode}>
                {t("comfyui.workflow.params.injectByBindings")}
              </Button>
            </div>
          </div>
          <Textarea value={paramsJson} onChange={(e) => setParamsJson(e.target.value)} placeholder={t("comfyui.workflow.params.placeholder")} className="min-h-[90px]" />
          {bindingPreview.invalid ? (
            <div className="text-[11px] text-destructive">{t("comfyui.workflow.params.bindingsPreview.invalid")}</div>
          ) : null}
          {!bindingPreview.invalid && bindingPreview.keys.length > 0 ? (
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <div>
                {t("comfyui.workflow.params.bindingsPreview.coverage")
                  .replace("{matched}", String(bindingPreview.matched.length))
                  .replace("{total}", String(bindingPreview.keys.length))}
              </div>
              {bindingPreview.unmatched.length > 0 ? (
                <div className="text-amber-300">
                  <div>
                    {t("comfyui.workflow.params.bindingsPreview.unmatched")
                      .replace("{count}", String(bindingPreview.unmatched.length))
                      .replace("{keys}", bindingPreview.unmatched.slice(0, 8).join(", "))}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-1"
                    onClick={copyUnmatchedBindingKeys}
                  >
                    {t("comfyui.workflow.params.copyMissing.action")}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
          {selectedBeatId ? <div className="text-xs text-muted-foreground">{t("comfyui.workflow.attachBeat")}: {selectedBeatId}</div> : null}
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-medium text-foreground">{t("comfyui.workflow.upload")}</div>
          <div className="grid grid-cols-2 gap-2">
            <Input value={uploadParam} onChange={(e) => setUploadParam(e.target.value)} placeholder={t("comfyui.workflow.upload.param")} />
            <Input value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value)} placeholder={t("comfyui.workflow.upload.url")} />
          </div>
          <div className="text-xs text-muted-foreground">{t("comfyui.workflow.upload.help")}</div>
        </div>

        <Button onClick={run} loading={submitting} className="w-full">
          {t("comfyui.workflow.run")}
        </Button>
      </div>
    </div>
  );
}
