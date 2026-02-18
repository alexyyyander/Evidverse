"use client";

import { ChangeEvent, useMemo, useState } from "react";
import axios from "axios";
import PageContainer from "@/components/layout/PageContainer";
import SectionHeader from "@/components/layout/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Label from "@/components/ui/label";
import Textarea from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18nContext";
import {
  useSettingsStore,
  type AspectRatio,
  type LocalLLMProvider,
  type Pace,
  type Resolution,
} from "@/store/settingsStore";
import Badge from "@/components/ui/badge";
import Dialog from "@/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { comfyuiApi } from "@/lib/api";
import { useTask } from "@/lib/queries/useTask";
import FractalTree from "@/components/ui/fractal-tree";
import type {
  ComfyUIBinding,
  ComfyUIRenderResult,
  ComfyUITemplateSummary,
  ComfyUIUploadResponse,
  TaskResponse,
} from "@/lib/api/types";

type UploadMapping = {
  param: string;
  url: string;
};

function normalizeApiBase(input?: string) {
  const raw = String(input || "").trim();
  if (!raw) return "/api/v1";
  if (raw.startsWith("/")) return raw;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    const trimmed = raw.replace(/\/+$/, "");
    return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
  }
  return "/api/v1";
}

function parseJsonField<T>(raw: string, invalidMessage: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(invalidMessage);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null) return value as Record<string, unknown>;
  return null;
}

function collectionSize(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  const rec = asRecord(value);
  if (rec) return Object.keys(rec).length;
  return 0;
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function taskStatusBadgeVariant(status?: string): "default" | "secondary" | "destructive" {
  if (status === "SUCCESS") return "default";
  if (status === "FAILURE" || status === "REVOKED") return "destructive";
  return "secondary";
}

export default function SettingsClient() {
  const { t } = useI18n();
  const store = useSettingsStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("nodes");
  const [draft, setDraft] = useState(() => ({
    apiBaseUrl: store.apiBaseUrl,
    cloudApiBaseUrl: store.cloudApiBaseUrl,
    localLlmProvider: store.localLlmProvider,
    llmOpenaiBaseUrl: store.llmOpenaiBaseUrl,
    llmOpenaiModel: store.llmOpenaiModel,
    ollamaHost: store.ollamaHost,
    ollamaModel: store.ollamaModel,
    defaultStyle: store.defaultStyle,
    defaultAspectRatio: store.defaultAspectRatio,
    defaultResolution: store.defaultResolution,
    defaultShotCount: String(store.defaultShotCount),
    defaultPace: store.defaultPace,
    defaultSegmentDuration: String(store.defaultSegmentDuration),
    defaultSegmentDurationUnit: store.defaultSegmentDurationUnit,
  }));

  const [testing, setTesting] = useState(false);
  const [health, setHealth] = useState<{ ok: boolean; message: string } | null>(null);
  const [cloudHealth, setCloudHealth] = useState<{ ok: boolean; message: string } | null>(null);

  const [comfyuiDialogOpen, setComfyuiDialogOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [tplWorkflowJson, setTplWorkflowJson] = useState("");
  const [tplBindingsJson, setTplBindingsJson] = useState("");
  const [tplTestParamsJson, setTplTestParamsJson] = useState('{"prompt": ""}');
  const [activeRenderTaskId, setActiveRenderTaskId] = useState<string | null>(null);

  const [runtimeRefreshing, setRuntimeRefreshing] = useState(false);
  const [objectInfoNodeClassInput, setObjectInfoNodeClassInput] = useState("");
  const [objectInfoNodeClassQuery, setObjectInfoNodeClassQuery] = useState("");
  const [execWorkflowJson, setExecWorkflowJson] = useState("{}");
  const [execBindingsJson, setExecBindingsJson] = useState("[]");
  const [execParamsJson, setExecParamsJson] = useState('{"prompt": ""}');
  const [execUploadsJson, setExecUploadsJson] = useState("[]");
  const [uploadParam, setUploadParam] = useState("image");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadOverwrite, setUploadOverwrite] = useState(false);
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const [uploadedItems, setUploadedItems] = useState<ComfyUIUploadResponse[]>([]);

  const comfyEnabled = activeTab === "comfyui";

  const templatesQuery = useQuery({
    queryKey: ["comfyuiTemplates"],
    queryFn: () => comfyuiApi.listTemplates(),
    enabled: comfyEnabled,
  });

  const comfyHealthQuery = useQuery({
    queryKey: ["comfyuiHealth"],
    queryFn: () => comfyuiApi.health(),
    enabled: comfyEnabled,
  });

  const objectInfoQuery = useQuery({
    queryKey: ["comfyuiObjectInfo", objectInfoNodeClassQuery || "__all__"],
    queryFn: () => comfyuiApi.objectInfo(objectInfoNodeClassQuery || undefined),
    enabled: comfyEnabled,
  });

  const systemStatsQuery = useQuery({
    queryKey: ["comfyuiSystemStats"],
    queryFn: () => comfyuiApi.systemStats(),
    enabled: comfyEnabled,
  });

  const queueQuery = useQuery({
    queryKey: ["comfyuiQueue"],
    queryFn: () => comfyuiApi.queue(),
    enabled: comfyEnabled,
  });

  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      const workflow = parseJsonField<Record<string, unknown>>(
        tplWorkflowJson || "{}",
        t("settings.comfyui.import.invalidWorkflow"),
      );
      let bindings: ComfyUIBinding[] | null = null;
      if (tplBindingsJson.trim().length > 0) {
        bindings = parseJsonField<ComfyUIBinding[]>(
          tplBindingsJson || "[]",
          t("settings.comfyui.import.invalidBindings"),
        );
      }
      return comfyuiApi.createTemplate({
        name: tplName.trim(),
        description: tplDesc.trim() || null,
        workflow,
        bindings,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comfyuiTemplates"] });
      setComfyuiDialogOpen(false);
      setTplName("");
      setTplDesc("");
      setTplWorkflowJson("");
      setTplBindingsJson("");
      toast({
        title: t("settings.toast.saved.title"),
        description: t("settings.comfyui.import.ok"),
        variant: "success",
      });
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : t("common.error");
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => comfyuiApi.deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comfyuiTemplates"] }),
  });

  const renderTemplateMutation = useMutation({
    mutationFn: ({ id, params }: { id: string; params: Record<string, unknown> }) =>
      comfyuiApi.renderTemplate(id, params),
    onSuccess: (res) => {
      setActiveRenderTaskId(res.task_id);
      toast({
        title: t("workflow.toast.queued.title"),
        description: t("settings.comfyui.task").replace("{id}", res.task_id),
        variant: "success",
      });
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : t("common.error");
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    },
  });

  const executeWorkflowMutation = useMutation({
    mutationFn: async () => {
      const workflow = parseJsonField<Record<string, unknown>>(
        execWorkflowJson || "{}",
        t("settings.comfyui.execute.invalidWorkflow"),
      );
      if (!workflow || Object.keys(workflow).length === 0) {
        throw new Error(t("settings.comfyui.execute.workflowEmpty"));
      }
      const bindings = parseJsonField<ComfyUIBinding[]>(
        execBindingsJson || "[]",
        t("settings.comfyui.execute.invalidBindings"),
      );
      const params = parseJsonField<Record<string, unknown>>(
        execParamsJson || "{}",
        t("settings.comfyui.execute.invalidParams"),
      );
      const uploads = parseJsonField<UploadMapping[]>(
        execUploadsJson || "[]",
        t("settings.comfyui.execute.invalidUploads"),
      );

      return comfyuiApi.executeWorkflow({
        workflow,
        bindings: bindings.length > 0 ? bindings : null,
        params,
        uploads: uploads.length > 0 ? uploads : null,
      });
    },
    onSuccess: (res) => {
      setActiveRenderTaskId(res.task_id);
      toast({
        title: t("settings.comfyui.execute.queued"),
        description: t("settings.comfyui.task").replace("{id}", res.task_id),
        variant: "success",
      });
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : t("common.error");
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: ({ file, overwrite }: { file: File; overwrite: boolean }) => comfyuiApi.uploadImage(file, overwrite),
    onSuccess: (res) => {
      setUploadedItems((prev) => [res, ...prev].slice(0, 8));
      const paramName = uploadParam.trim();
      if (paramName) {
        let previous: UploadMapping[] = [];
        try {
          const parsed = JSON.parse(execUploadsJson || "[]");
          if (Array.isArray(parsed)) {
            previous = parsed.filter((item): item is UploadMapping => {
              const rec = asRecord(item);
              return !!rec && typeof rec.param === "string" && typeof rec.url === "string";
            });
          }
        } catch {}
        const next = previous.filter((item) => !(item.param === paramName && item.url === res.storage_url));
        next.unshift({ param: paramName, url: res.storage_url });
        setExecUploadsJson(JSON.stringify(next, null, 2));
      }
      setUploadFile(null);
      setUploadInputKey((v) => v + 1);
      toast({
        title: t("settings.comfyui.uploaded.title"),
        description: t("settings.comfyui.uploaded.desc").replace("{param}", uploadParam.trim() || "image"),
        variant: "success",
      });
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : t("common.error");
      toast({ title: t("settings.comfyui.uploadFailed.title"), description: message, variant: "destructive" });
    },
  });

  const renderTaskQuery = useTask<ComfyUIRenderResult>(activeRenderTaskId);
  const renderTaskResp = (renderTaskQuery.data || null) as TaskResponse<ComfyUIRenderResult> | null;
  const renderTaskResult = renderTaskResp?.result;
  const renderOutputs = Array.isArray(renderTaskResult?.outputs) ? renderTaskResult.outputs : [];

  const normalizedBase = useMemo(() => normalizeApiBase(draft.apiBaseUrl), [draft.apiBaseUrl]);
  const normalizedCloudBase = useMemo(() => normalizeApiBase(draft.cloudApiBaseUrl), [draft.cloudApiBaseUrl]);

  const objectInfoRec = asRecord(objectInfoQuery.data);
  const systemStatsRec = asRecord(systemStatsQuery.data);
  const queueRec = asRecord(queueQuery.data);
  const objectNodeCount = objectInfoRec ? Object.keys(objectInfoRec).length : 0;
  const queueRunningCount = collectionSize(queueRec ? queueRec["queue_running"] : undefined);
  const queuePendingCount = collectionSize(queueRec ? queueRec["queue_pending"] : undefined);
  const deviceCount = collectionSize(systemStatsRec ? systemStatsRec["devices"] : undefined);

  const save = () => {
    store.setApiBaseUrl(draft.apiBaseUrl);
    store.setCloudApiBaseUrl(draft.cloudApiBaseUrl);
    store.setLocalLlmProvider(draft.localLlmProvider);
    store.setLlmOpenaiBaseUrl(draft.llmOpenaiBaseUrl);
    store.setLlmOpenaiModel(draft.llmOpenaiModel);
    store.setOllamaHost(draft.ollamaHost);
    store.setOllamaModel(draft.ollamaModel);
    store.setDefaultStyle(draft.defaultStyle);
    store.setDefaultAspectRatio(draft.defaultAspectRatio);
    store.setDefaultResolution(draft.defaultResolution);
    store.setDefaultShotCount(Number(draft.defaultShotCount));
    store.setDefaultPace(draft.defaultPace);
    store.setDefaultSegmentDuration(Number(draft.defaultSegmentDuration));
    store.setDefaultSegmentDurationUnit(draft.defaultSegmentDurationUnit);
    toast({ title: t("settings.toast.saved.title"), description: t("settings.toast.saved.desc"), variant: "success" });
  };

  const reset = () => {
    store.reset();
    const s = useSettingsStore.getState();
    setDraft({
      apiBaseUrl: s.apiBaseUrl,
      cloudApiBaseUrl: s.cloudApiBaseUrl,
      localLlmProvider: s.localLlmProvider,
      llmOpenaiBaseUrl: s.llmOpenaiBaseUrl,
      llmOpenaiModel: s.llmOpenaiModel,
      ollamaHost: s.ollamaHost,
      ollamaModel: s.ollamaModel,
      defaultStyle: s.defaultStyle,
      defaultAspectRatio: s.defaultAspectRatio,
      defaultResolution: s.defaultResolution,
      defaultShotCount: String(s.defaultShotCount),
      defaultPace: s.defaultPace,
      defaultSegmentDuration: String(s.defaultSegmentDuration),
      defaultSegmentDurationUnit: s.defaultSegmentDurationUnit,
    });
    setHealth(null);
    setCloudHealth(null);
    toast({ title: t("settings.toast.reset.title"), description: t("settings.toast.reset.desc"), variant: "success" });
  };

  const testApi = async () => {
    setTesting(true);
    setHealth(null);
    try {
      const base = normalizeApiBase(draft.apiBaseUrl);
      const res = await axios.get(`${base}/health`, { timeout: 8000 });
      const ok = Boolean(res.data && res.data.status === "ok");
      setHealth({ ok, message: ok ? t("settings.test.ok") : t("settings.test.unexpected") });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("common.failed");
      setHealth({ ok: false, message });
    } finally {
      setTesting(false);
    }
  };

  const testCloudApi = async () => {
    setTesting(true);
    setCloudHealth(null);
    try {
      const base = normalizeApiBase(draft.cloudApiBaseUrl);
      const res = await axios.get(`${base}/health`, { timeout: 8000 });
      const ok = Boolean(res.data && res.data.status === "ok");
      setCloudHealth({ ok, message: ok ? t("settings.test.ok") : t("settings.test.unexpected") });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("common.failed");
      setCloudHealth({ ok: false, message });
    } finally {
      setTesting(false);
    }
  };

  const refreshComfyRuntime = async () => {
    setRuntimeRefreshing(true);
    try {
      await Promise.all([
        comfyHealthQuery.refetch(),
        objectInfoQuery.refetch(),
        systemStatsQuery.refetch(),
        queueQuery.refetch(),
      ]);
    } finally {
      setRuntimeRefreshing(false);
    }
  };

  const runTemplate = (templateId: string) => {
    try {
      const params = parseJsonField<Record<string, unknown>>(
        tplTestParamsJson || "{}",
        t("settings.comfyui.testParams.invalid"),
      );
      renderTemplateMutation.mutate({ id: templateId, params });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("settings.comfyui.testParams.invalid");
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    }
  };

  const handleUploadFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setUploadFile(file);
  };

  const uploadImage = () => {
    if (!uploadFile) {
      toast({
        title: t("settings.comfyui.upload.noFile.title"),
        description: t("settings.comfyui.upload.noFile.desc"),
        variant: "destructive"
      });
      return;
    }
    uploadImageMutation.mutate({ file: uploadFile, overwrite: uploadOverwrite });
  };

  return (
    <PageContainer>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(153,255,234,0.08),transparent_36%),radial-gradient(circle_at_82%_84%,rgba(137,196,255,0.07),transparent_34%)]" />
          <FractalTree className="absolute -right-16 -top-12 opacity-60" />
          <FractalTree
            className="absolute -bottom-20 -left-20 opacity-40 [animation-duration:22s] -scale-x-100"
            stroke="rgba(191, 231, 255, 0.32)"
            glow="rgba(191, 231, 255, 0.08)"
            depth={7}
          />
        </div>

        <div className="relative z-10 space-y-8 py-10">
        <SectionHeader
          title={t("settings.title")}
          subtitle={t("settings.subtitle")}
          right={
            <>
              <Button variant="secondary" onClick={reset}>
                {t("settings.reset")}
              </Button>
              <Button onClick={save}>{t("settings.save")}</Button>
            </>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="nodes">{t("settings.tabs.nodes")}</TabsTrigger>
            <TabsTrigger value="ai">{t("settings.tabs.ai")}</TabsTrigger>
            <TabsTrigger value="content">{t("settings.tabs.content")}</TabsTrigger>
            <TabsTrigger value="comfyui">{t("settings.tabs.comfyui")}</TabsTrigger>
          </TabsList>

          <TabsContent value="nodes" className="mt-6 space-y-6">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="apiBaseUrl">{t("settings.apiBaseUrl")}</Label>
                  <Input
                    id="apiBaseUrl"
                    value={draft.apiBaseUrl}
                    placeholder={t("settings.apiBaseUrl.placeholder")}
                    onChange={(e) => setDraft((d) => ({ ...d, apiBaseUrl: e.target.value }))}
                  />
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{t("settings.normalized")}</span>
                    <Badge variant="secondary">{normalizedBase}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={testApi} disabled={testing}>
                      {t("settings.test")}
                    </Button>
                    {health ? <Badge variant={health.ok ? "default" : "destructive"}>{health.message}</Badge> : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cloudApiBaseUrl">{t("settings.cloudApiBaseUrl")}</Label>
                  <Input
                    id="cloudApiBaseUrl"
                    value={draft.cloudApiBaseUrl}
                    placeholder={t("settings.cloudApiBaseUrl.placeholder")}
                    onChange={(e) => setDraft((d) => ({ ...d, cloudApiBaseUrl: e.target.value }))}
                  />
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{t("settings.normalized")}</span>
                    <Badge variant="secondary">{normalizedCloudBase}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={testCloudApi} disabled={testing}>
                      {t("settings.test")}
                    </Button>
                    {cloudHealth ? (
                      <Badge variant={cloudHealth.ok ? "default" : "destructive"}>{cloudHealth.message}</Badge>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="mt-6 space-y-6">
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label>{t("settings.localLlmProvider")}</Label>
                  <Select
                    value={draft.localLlmProvider}
                    onValueChange={(v) => setDraft((d) => ({ ...d, localLlmProvider: v as LocalLLMProvider }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("settings.select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vllm">{t("settings.provider.vllm")}</SelectItem>
                      <SelectItem value="sglang">{t("settings.provider.sglang")}</SelectItem>
                      <SelectItem value="openai_compatible">{t("settings.provider.openai_compatible")}</SelectItem>
                      <SelectItem value="ollama">{t("settings.provider.ollama")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="llmOpenaiBaseUrl">{t("settings.llmOpenaiBaseUrl")}</Label>
                    <Input
                      id="llmOpenaiBaseUrl"
                      value={draft.llmOpenaiBaseUrl}
                      placeholder={t("settings.llmOpenaiBaseUrl.placeholder")}
                      onChange={(e) => setDraft((d) => ({ ...d, llmOpenaiBaseUrl: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="llmOpenaiModel">{t("settings.llmOpenaiModel")}</Label>
                    <Input
                      id="llmOpenaiModel"
                      value={draft.llmOpenaiModel}
                      placeholder={t("settings.llmOpenaiModel.placeholder")}
                      onChange={(e) => setDraft((d) => ({ ...d, llmOpenaiModel: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ollamaHost">{t("settings.ollamaHost")}</Label>
                    <Input
                      id="ollamaHost"
                      value={draft.ollamaHost}
                      placeholder={t("settings.ollamaHost.placeholder")}
                      onChange={(e) => setDraft((d) => ({ ...d, ollamaHost: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ollamaModel">{t("settings.ollamaModel")}</Label>
                    <Input
                      id="ollamaModel"
                      value={draft.ollamaModel}
                      placeholder={t("settings.ollamaModel.placeholder")}
                      onChange={(e) => setDraft((d) => ({ ...d, ollamaModel: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="mt-6 space-y-6">
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="defaultStyle">{t("settings.defaultStyle")}</Label>
                    <Input
                      id="defaultStyle"
                      value={draft.defaultStyle}
                      onChange={(e) => setDraft((d) => ({ ...d, defaultStyle: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.defaultPace")}</Label>
                    <Select value={draft.defaultPace} onValueChange={(v) => setDraft((d) => ({ ...d, defaultPace: v as Pace }))}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("settings.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slow">{t("settings.pace.slow")}</SelectItem>
                        <SelectItem value="normal">{t("settings.pace.normal")}</SelectItem>
                        <SelectItem value="fast">{t("settings.pace.fast")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>{t("settings.defaultAspectRatio")}</Label>
                    <Select
                      value={draft.defaultAspectRatio}
                      onValueChange={(v) => setDraft((d) => ({ ...d, defaultAspectRatio: v as AspectRatio }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("settings.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        {(["16:9", "9:16", "1:1", "4:3"] as AspectRatio[]).map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.defaultResolution")}</Label>
                    <Select
                      value={draft.defaultResolution}
                      onValueChange={(v) => setDraft((d) => ({ ...d, defaultResolution: v as Resolution }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("settings.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        {(["720p", "1080p", "1440p", "4k"] as Resolution[]).map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultShotCount">{t("settings.defaultShotCount")}</Label>
                    <Input
                      id="defaultShotCount"
                      inputMode="numeric"
                      value={draft.defaultShotCount}
                      onChange={(e) => setDraft((d) => ({ ...d, defaultShotCount: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="defaultSegmentDuration">{t("settings.defaultSegmentDuration")}</Label>
                    <Input
                      id="defaultSegmentDuration"
                      inputMode="numeric"
                      value={draft.defaultSegmentDuration}
                      onChange={(e) => setDraft((d) => ({ ...d, defaultSegmentDuration: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("settings.defaultSegmentDurationUnit")}</Label>
                    <Select
                      value={draft.defaultSegmentDurationUnit}
                      onValueChange={(v) => setDraft((d) => ({ ...d, defaultSegmentDurationUnit: v as "sec" | "min" }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("settings.select")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sec">{t("workflow.unit.sec")}</SelectItem>
                        <SelectItem value="min">{t("workflow.unit.min")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comfyui" className="mt-6 space-y-6">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{t("settings.comfyui.title")}</div>
                    <div className="text-xs text-muted-foreground">{t("settings.comfyui.subtitle")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={refreshComfyRuntime} disabled={runtimeRefreshing}>
                      {runtimeRefreshing ? t("settings.comfyui.runtime.refreshing") : t("settings.comfyui.runtime.refresh")}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setComfyuiDialogOpen(true)}>
                      {t("settings.comfyui.import")}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">{t("settings.comfyui.runtime.reachability")}</div>
                    <div className="mt-2">
                      <Badge
                        variant={comfyHealthQuery.data?.reachable ? "default" : comfyHealthQuery.isError ? "destructive" : "secondary"}
                      >
                        {comfyHealthQuery.data?.reachable
                          ? t("settings.comfyui.runtime.reachable")
                          : comfyHealthQuery.isLoading
                            ? t("settings.comfyui.runtime.checking")
                            : t("settings.comfyui.runtime.unavailable")}
                      </Badge>
                    </div>
                    {comfyHealthQuery.data?.detail ? (
                      <div className="mt-2 text-xs break-all text-destructive">{String(comfyHealthQuery.data.detail)}</div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">{t("settings.comfyui.runtime.registeredNodes")}</div>
                    <div className="mt-2 text-xl font-semibold">{objectInfoQuery.isLoading ? "-" : objectNodeCount}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {objectInfoNodeClassQuery
                        ? t("settings.comfyui.runtime.nodeClass").replace("{name}", objectInfoNodeClassQuery)
                        : t("settings.comfyui.runtime.allNodeClasses")}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">{t("settings.comfyui.runtime.queue")}</div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Badge variant="secondary">{t("settings.comfyui.runtime.running").replace("{count}", String(queueRunningCount))}</Badge>
                      <Badge variant="secondary">{t("settings.comfyui.runtime.pending").replace("{count}", String(queuePendingCount))}</Badge>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-3">
                    <div className="text-xs text-muted-foreground">{t("settings.comfyui.runtime.systemStats")}</div>
                    <div className="mt-2 text-xl font-semibold">{deviceCount}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{t("settings.comfyui.runtime.detectedDevices")}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <Input
                    value={objectInfoNodeClassInput}
                    placeholder={t("settings.comfyui.runtime.nodeClassPlaceholder")}
                    onChange={(e) => setObjectInfoNodeClassInput(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setObjectInfoNodeClassQuery(objectInfoNodeClassInput.trim())}
                  >
                    {t("settings.comfyui.runtime.queryNode")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setObjectInfoNodeClassInput("");
                      setObjectInfoNodeClassQuery("");
                    }}
                  >
                    {t("settings.reset")}
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <details className="rounded-lg border border-border p-3">
                    <summary className="cursor-pointer text-sm font-semibold">{t("settings.comfyui.runtime.objectInfoJson")}</summary>
                    <pre className="mt-3 max-h-72 overflow-auto bg-black/40 p-2 text-xs text-muted-foreground">
                      {prettyJson(objectInfoQuery.data || {})}
                    </pre>
                  </details>
                  <details className="rounded-lg border border-border p-3">
                    <summary className="cursor-pointer text-sm font-semibold">{t("settings.comfyui.runtime.systemQueueJson")}</summary>
                    <pre className="mt-3 max-h-72 overflow-auto bg-black/40 p-2 text-xs text-muted-foreground">
                      {prettyJson({
                        system_stats: systemStatsQuery.data || {},
                        queue: queueQuery.data || {},
                      })}
                    </pre>
                  </details>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <div className="text-sm font-semibold">{t("settings.comfyui.uploadHelper.title")}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("settings.comfyui.uploadHelper.desc")}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="uploadParam">{t("settings.comfyui.uploadHelper.bindParam")}</Label>
                    <Input
                      id="uploadParam"
                      value={uploadParam}
                      placeholder={t("settings.comfyui.uploadHelper.bindParamPlaceholder")}
                      onChange={(e) => setUploadParam(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="uploadFile">{t("settings.comfyui.uploadHelper.localImageFile")}</Label>
                    <Input key={uploadInputKey} id="uploadFile" type="file" accept="image/*" onChange={handleUploadFileChange} />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={uploadOverwrite}
                      onChange={(e) => setUploadOverwrite(e.target.checked)}
                    />
                    {t("settings.comfyui.uploadHelper.overwrite")}
                  </label>
                  <Button size="sm" variant="secondary" onClick={uploadImage} disabled={uploadImageMutation.isPending}>
                    {uploadImageMutation.isPending ? t("settings.comfyui.uploadHelper.uploading") : t("settings.comfyui.uploadHelper.uploadAppend")}
                  </Button>
                </div>

                {uploadedItems.length > 0 ? (
                  <div className="space-y-2">
                    {uploadedItems.map((item) => (
                      <div key={item.object_name} className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
                        <div className="font-semibold text-foreground">{item.filename}</div>
                        <div className="break-all">
                          {t("settings.comfyui.uploaded.storageUrl").replace("{value}", item.storage_url)}
                        </div>
                        <div className="break-all">
                          {t("settings.comfyui.uploaded.comfyImage").replace("{value}", item.comfyui_image)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <div className="text-sm font-semibold">{t("settings.comfyui.execute.title")}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("settings.comfyui.execute.desc")}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="execWorkflow">{t("settings.comfyui.workflowJson")}</Label>
                  <Textarea
                    id="execWorkflow"
                    rows={8}
                    value={execWorkflowJson}
                    onChange={(e) => setExecWorkflowJson(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="execBindings">{t("settings.comfyui.bindingsJson")}</Label>
                  <Textarea
                    id="execBindings"
                    rows={5}
                    value={execBindingsJson}
                    onChange={(e) => setExecBindingsJson(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="execParams">{t("settings.comfyui.execute.paramsJson")}</Label>
                    <Textarea
                      id="execParams"
                      rows={5}
                      value={execParamsJson}
                      onChange={(e) => setExecParamsJson(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="execUploads">{t("settings.comfyui.execute.uploadsJson")}</Label>
                    <Textarea
                      id="execUploads"
                      rows={5}
                      value={execUploadsJson}
                      onChange={(e) => setExecUploadsJson(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <Button size="sm" variant="secondary" onClick={() => executeWorkflowMutation.mutate()} disabled={executeWorkflowMutation.isPending}>
                    {executeWorkflowMutation.isPending ? t("settings.comfyui.execute.submitting") : t("settings.comfyui.execute.run")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="text-sm font-semibold">{t("settings.comfyui.templates.title")}</div>

                {templatesQuery.isLoading ? (
                  <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                ) : templatesQuery.isError ? (
                  <div className="text-sm text-destructive">{t("common.error")}</div>
                ) : (templatesQuery.data || []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">{t("settings.comfyui.empty")}</div>
                ) : (
                  <div className="space-y-2">
                    {(templatesQuery.data as ComfyUITemplateSummary[]).map((tpl) => (
                      <div key={tpl.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{tpl.name}</div>
                          {tpl.description ? (
                            <div className="truncate text-xs text-muted-foreground">{tpl.description}</div>
                          ) : null}
                          <div className="mt-1 break-all text-xs text-muted-foreground">{tpl.id}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="secondary" onClick={() => runTemplate(String(tpl.id))} disabled={renderTemplateMutation.isPending}>
                            {t("settings.comfyui.test")}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteTemplateMutation.mutate(String(tpl.id))}
                            disabled={deleteTemplateMutation.isPending}
                          >
                            {t("common.delete")}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="tplTestParams">{t("settings.comfyui.testParams")}</Label>
                  <Textarea
                    id="tplTestParams"
                    value={tplTestParamsJson}
                    rows={4}
                    onChange={(e) => setTplTestParamsJson(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold">{t("settings.comfyui.latestTask.title")}</div>
                  <Badge variant={taskStatusBadgeVariant(renderTaskResp?.status)}>{renderTaskResp?.status || t("settings.comfyui.latestTask.idle")}</Badge>
                </div>

                {renderTaskResp ? (
                  <div className="space-y-3">
                    <div className="break-all text-xs text-muted-foreground">{renderTaskResp.task_id}</div>
                    {renderTaskResult?.error ? (
                      <div className="rounded-md border border-red-900/60 bg-red-950/20 p-2 text-xs text-red-300">
                        {renderTaskResult.error}
                      </div>
                    ) : null}
                    {renderTaskResult?.image_url ? (
                      <div className="space-y-2">
                        <a
                          href={renderTaskResult.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-xs text-sky-300 underline"
                        >
                          {renderTaskResult.image_url}
                        </a>
                        <img
                          src={renderTaskResult.image_url}
                          alt={t("settings.comfyui.latestTask.outputAlt")}
                          className="max-h-64 w-full border border-border object-contain"
                        />
                      </div>
                    ) : null}
                    {renderTaskResult?.video_url ? (
                      <div className="space-y-2">
                        <a
                          href={renderTaskResult.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-xs text-sky-300 underline"
                        >
                          {renderTaskResult.video_url}
                        </a>
                        <video src={renderTaskResult.video_url} controls className="max-h-72 w-full border border-border bg-black" />
                      </div>
                    ) : null}

                    {renderOutputs.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground">{t("settings.comfyui.latestTask.outputs")}</div>
                        {renderOutputs.map((item, index) => (
                          <div
                            key={`${item.object_name || item.filename || "output"}-${index}`}
                            className="space-y-1 rounded-lg border border-border p-3"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{item.media_kind || t("settings.comfyui.latestTask.file")}</Badge>
                              <span className="text-xs text-muted-foreground">{item.filename || t("settings.comfyui.latestTask.noFilename")}</span>
                            </div>
                            {item.output_url ? (
                              <a href={item.output_url} target="_blank" rel="noreferrer" className="break-all text-xs text-sky-300 underline">
                                {item.output_url}
                              </a>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <details className="rounded-lg border border-border p-3">
                      <summary className="cursor-pointer text-xs font-semibold">{t("settings.comfyui.latestTask.rawPayload")}</summary>
                      <pre className="mt-2 max-h-64 overflow-auto bg-black/40 p-2 text-xs text-muted-foreground">
                        {prettyJson(renderTaskResp)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">{t("settings.comfyui.latestTask.empty")}</div>
                )}
              </CardContent>
            </Card>

            <Dialog open={comfyuiDialogOpen} onOpenChange={setComfyuiDialogOpen} title={t("settings.comfyui.import")}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tplName">{t("settings.comfyui.name")}</Label>
                  <Input id="tplName" value={tplName} onChange={(e) => setTplName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tplDesc">{t("settings.comfyui.description")}</Label>
                  <Input id="tplDesc" value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tplWorkflow">{t("settings.comfyui.workflowJson")}</Label>
                  <Textarea id="tplWorkflow" value={tplWorkflowJson} rows={10} onChange={(e) => setTplWorkflowJson(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tplBindings">{t("settings.comfyui.bindingsJson")}</Label>
                  <Textarea id="tplBindings" value={tplBindingsJson} rows={6} onChange={(e) => setTplBindingsJson(e.target.value)} />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="secondary" onClick={() => setComfyuiDialogOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={() => createTemplateMutation.mutate()} disabled={!tplName.trim() || !tplWorkflowJson.trim() || createTemplateMutation.isPending}>
                    {t("settings.comfyui.import")}
                  </Button>
                </div>
              </div>
            </Dialog>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </PageContainer>
  );
}
