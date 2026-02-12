"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Textarea from "@/components/ui/textarea";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { filesApi, vnApi } from "@/lib/api";
import type { StoryboardScene, VNAsset, VNAssetType } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditorStore } from "@/store/editorStore";
import type { IdeaParameters } from "@/lib/editor/types";

function guessAssetType(fileName: string): VNAssetType {
  const name = (fileName || "").toLowerCase();
  if (name.endsWith(".ks")) return "VN_SCRIPT";
  if (name.endsWith(".rpy")) return "VN_SCRIPT";
  if (name.endsWith(".txt")) return "VN_TEXT";
  if (name.endsWith(".json")) return "VN_JSON";
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp")) return "SCREENSHOT";
  return "OTHER";
}

function isTerminalStatus(status: string) {
  const s = (status || "").toLowerCase();
  return s === "succeeded" || s === "failed" || s === "success" || s === "failure" || s === "revoked";
}

function eventsToStoryboard(events: any[]): StoryboardScene[] {
  let sceneNumber = 1;
  const out: StoryboardScene[] = [];
  let hasContentInScene = false;

  for (const e of events || []) {
    const t = String(e?.type || "").toUpperCase();
    if (t === "LABEL") {
      if (hasContentInScene) {
        sceneNumber += 1;
        hasContentInScene = false;
      }
      continue;
    }

    if (t === "SAY") {
      const speaker = String(e?.speaker || "").trim();
      const text = String(e?.text || "").trim();
      const narration = speaker ? `${speaker}: ${text}` : text;
      if (narration) {
        out.push({ scene_number: sceneNumber, narration });
        hasContentInScene = true;
      }
      continue;
    }

    if (t === "NARRATION" || t === "TEXT") {
      const narration = String(e?.text || "").trim();
      if (narration) {
        out.push({ scene_number: sceneNumber, narration });
        hasContentInScene = true;
      }
      continue;
    }

    if (t === "CHOICE") {
      const choices = Array.isArray(e?.choices) ? e.choices : [];
      const texts = choices.map((c: any) => String(c?.text || "").trim()).filter(Boolean);
      const narration = texts.length ? `CHOICE: ${texts.join(" | ")}` : "CHOICE";
      out.push({ scene_number: sceneNumber, narration });
      hasContentInScene = true;
      continue;
    }

    if (t === "JUMP") {
      const target = String(e?.target || "").trim();
      const narration = target ? `JUMP → ${target}` : "JUMP";
      out.push({ scene_number: sceneNumber, narration });
      hasContentInScene = true;
      continue;
    }
  }

  return out;
}

export default function VNImportPanel({ projectId, branchName }: { projectId: string; branchName: string }) {
  const qc = useQueryClient();
  const [engine, setEngine] = useState<"RENPY" | "KIRIKIRI">("RENPY");
  const [scriptText, setScriptText] = useState("");
  const [assetType, setAssetType] = useState<VNAssetType>("VN_SCRIPT");
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploadingName, setUploadingName] = useState("");
  const [pendingImport, setPendingImport] = useState<null | { mode: "append" | "replace" }>(null);

  const {
    data: editorData,
    selection,
    applyStoryboard,
    updateLayout,
    beginHistoryGroup,
    endHistoryGroup,
    addBeatImageAsset,
  } = useEditorStore();

  const assetsQuery = useQuery({
    queryKey: ["vnAssets", projectId, branchName],
    queryFn: () => vnApi.listAssets({ project_id: projectId, branch_name: branchName }),
  });

  const previewMutation = useMutation({
    mutationFn: () => vnApi.parsePreview({ engine, script_text: scriptText }),
  });

  const parseJobMutation = useMutation({
    mutationFn: (payload: { script_text?: string; asset_ids?: string[] }) =>
      vnApi.createParseJob({ project_id: projectId, branch_name: branchName, engine, ...payload }),
    onSuccess: (job) => {
      setJobId(job.id);
      toast({ title: "Parse job created", description: job.id, variant: "success" });
    },
  });

  const parseJobQuery = useQuery({
    queryKey: ["vnParseJob", jobId],
    queryFn: () => vnApi.getParseJob(jobId as string),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const status = (q.state.data as any)?.status as string | undefined;
      if (!status) return 2000;
      return isTerminalStatus(status) ? false : 2000;
    },
  });

  const logsQuery = useQuery({
    queryKey: ["vnParseJobLogs", jobId],
    queryFn: () => vnApi.getParseJobLogs(jobId as string, { offset: 0, limit: 200 }),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const status = (parseJobQuery.data as any)?.status as string | undefined;
      if (!status) return 2000;
      if (isTerminalStatus(status)) return false;
      return q.state.data ? 2000 : 1000;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const name = file.name || "upload.bin";
      const presigned = await filesApi.getPresignedUrl(name);
      const put = await fetch(presigned.url, {
        method: "PUT",
        body: file,
        headers: file.type ? { "Content-Type": file.type } : undefined,
      });
      if (!put.ok) {
        throw new Error(`Upload failed (${put.status})`);
      }
      return { object_name: presigned.object_name, filename: name, content_type: file.type || null, size: file.size };
    },
    onMutate: (file) => setUploadingName(file.name),
    onSettled: () => setUploadingName(""),
    onSuccess: async (info) => {
      const created = await vnApi.createAsset({
        project_id: projectId,
        branch_name: branchName,
        type: assetType || guessAssetType(info.filename),
        object_name: info.object_name,
        metadata: { filename: info.filename, content_type: info.content_type, size: info.size },
      });
      setSelectedAssetIds((prev) => (prev.includes(created.id) ? prev : [created.id, ...prev]));
      await qc.invalidateQueries({ queryKey: ["vnAssets", projectId, branchName] });
      toast({ title: "Asset created", description: created.id, variant: "success" });
    },
  });

  const previewEvents = (previewMutation.data as any)?.events as any[] | undefined;
  const previewSummary = useMemo(() => {
    if (!previewEvents) return null;
    return { count: previewEvents.length, head: previewEvents.slice(0, 12) };
  }, [previewEvents]);

  const jobEvents = (parseJobQuery.data as any)?.result?.events as any[] | undefined;
  const jobStatus = String(parseJobQuery.data?.status || "").toLowerCase();

  const assets = useMemo(() => (assetsQuery.data || []) as VNAsset[], [assetsQuery.data]);
  const selectedBeatId = selection.selectedBeatId;
  const selectedBeat = selectedBeatId ? editorData.beats[selectedBeatId as any] : null;

  useEffect(() => {
    const existing = new Set(assets.map((a) => a.id));
    setSelectedAssetIds((prev) => prev.filter((id) => existing.has(id)));
  }, [assets]);

  const toggleAsset = (id: string) => {
    setSelectedAssetIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  };

  const canPreview = scriptText.trim().length > 0 && !previewMutation.isPending;
  const canCreateJob = (!parseJobMutation.isPending && (scriptText.trim().length > 0 || selectedAssetIds.length > 0)) || false;

  const currentIdeaParams: IdeaParameters = useMemo(() => {
    const versions = editorData.ideaVersions || [];
    const activeId = editorData.activeIdeaVersionId;
    const active = activeId ? versions.find((v: any) => v.id === activeId) : null;
    const params = (active as any)?.params as IdeaParameters | undefined;
    return (
      params || {
        style: "default",
        aspectRatio: "16:9",
        duration: 60,
        shotCount: 6,
        pace: "normal",
        language: "zh",
        resolution: "1080p",
      }
    );
  }, [editorData.ideaVersions, editorData.activeIdeaVersionId]);

  const importFromEvents = useCallback((events: any[], mode: "append" | "replace") => {
    const storyboard = eventsToStoryboard(events || []);
    if (storyboard.length === 0) {
      toast({ title: "Nothing to import", description: "No usable events found.", variant: "destructive" });
      return;
    }
    applyStoryboard({ topic: `VN Import (${engine})`, ideaParams: currentIdeaParams, storyboard, mode });
    updateLayout({ activeLeftTab: "script" });
    toast({ title: "Imported", description: `${storyboard.length} beats`, variant: "success" });
  }, [applyStoryboard, currentIdeaParams, engine, updateLayout]);

  useEffect(() => {
    if (!pendingImport) return;
    if (jobStatus !== "succeeded" && jobStatus !== "success") return;
    const events = jobEvents;
    if (!Array.isArray(events) || events.length === 0) {
      setPendingImport(null);
      return;
    }
    importFromEvents(events, pendingImport.mode);
    setPendingImport(null);
  }, [importFromEvents, jobEvents, jobStatus, pendingImport]);

  const createJobAndImport = (mode: "append" | "replace") => {
    if (parseJobMutation.isPending) return;
    const script_text = scriptText.trim() || undefined;
    const asset_ids = selectedAssetIds.length > 0 ? selectedAssetIds : undefined;
    if (!script_text && !asset_ids) return;
    setPendingImport({ mode });
    parseJobMutation.mutate({ script_text, asset_ids });
    updateLayout({ activeLeftTab: "vn" });
  };

  const attachScreenshotToBeat = (asset: VNAsset) => {
    if (!selectedBeatId) {
      toast({ title: "No beat selected", description: "Select a beat in Script first.", variant: "destructive" });
      return;
    }
    const url = String(asset.storage_url || "").trim();
    if (!url) {
      toast({ title: "Invalid asset", description: "storage_url is missing.", variant: "destructive" });
      return;
    }
    beginHistoryGroup();
    addBeatImageAsset({ beatId: selectedBeatId as any, url, source: "upload" });
    endHistoryGroup();
    updateLayout({ activeLeftTab: "script" });
    toast({ title: "Screenshot attached", description: asset.metadata?.filename || asset.object_name, variant: "success" });
  };

  return (
    <div className="h-full p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-foreground">VN Import</div>
        {jobId ? (
          <Button variant="ghost" size="sm" onClick={() => setJobId(null)}>
            Clear Job
          </Button>
        ) : null}
      </div>

      <Tabs defaultValue="script">
        <TabsList className="w-full">
          <TabsTrigger value="script" className="flex-1">
            Script
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex-1">
            Assets
          </TabsTrigger>
          <TabsTrigger value="job" className="flex-1">
            Job
          </TabsTrigger>
        </TabsList>

        <TabsContent value="script" className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={engine === "RENPY" ? "secondary" : "ghost"}
              onClick={() => setEngine("RENPY")}
            >
              Ren&apos;Py
            </Button>
            <Button
              type="button"
              size="sm"
              variant={engine === "KIRIKIRI" ? "secondary" : "ghost"}
              onClick={() => setEngine("KIRIKIRI")}
            >
              KiriKiri
            </Button>
          </div>

          <Textarea
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            placeholder='Paste script text here. Example:\nlabel start:\n  e "Hello"\n'
            className="min-h-[200px] font-mono text-xs"
          />

          <div className="flex items-center gap-2">
            <Button loading={previewMutation.isPending} disabled={!canPreview} onClick={() => previewMutation.mutate()}>
              Preview
            </Button>
            <Button variant="secondary" loading={parseJobMutation.isPending} disabled={!canCreateJob} onClick={() => createJobAndImport("append")}>
              Create + Append
            </Button>
            <Button variant="destructive" loading={parseJobMutation.isPending} disabled={!canCreateJob} onClick={() => createJobAndImport("replace")}>
              Create + Replace
            </Button>
          </div>

          {previewMutation.isError ? (
            <div className="text-xs text-destructive">{(previewMutation.error as any)?.message || "Preview failed"}</div>
          ) : null}

          {previewSummary ? (
            <div className="rounded-md border border-border bg-background p-3 space-y-2">
              <div className="text-xs text-muted-foreground">events: {previewSummary.count}</div>
              <pre className="text-xs overflow-x-auto">{JSON.stringify(previewSummary.head, null, 2)}</pre>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => importFromEvents(previewEvents || [], "append")}>
                  Append to Script
                </Button>
                <Button size="sm" variant="destructive" onClick={() => importFromEvents(previewEvents || [], "replace")}>
                  Replace Script
                </Button>
              </div>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="assets" className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Selected beat:{" "}
            <span className="text-foreground">{selectedBeat ? selectedBeat.narration || `Beat ${selectedBeat.order + 1}` : "none"}</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={assetType === "VN_SCRIPT" ? "secondary" : "ghost"}
                onClick={() => setAssetType("VN_SCRIPT")}
              >
                Script
              </Button>
              <Button
                type="button"
                size="sm"
                variant={assetType === "SCREENSHOT" ? "secondary" : "ghost"}
                onClick={() => setAssetType("SCREENSHOT")}
              >
                Screenshot
              </Button>
              <Button type="button" size="sm" variant={assetType === "OTHER" ? "secondary" : "ghost"} onClick={() => setAssetType("OTHER")}>
                Other
              </Button>
            </div>

            <Input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (!file) return;
                uploadMutation.mutate(file);
                e.target.value = "";
              }}
            />
            {uploadingName ? <div className="text-xs text-muted-foreground">Uploading: {uploadingName}</div> : null}
            {uploadMutation.isError ? (
              <div className="text-xs text-destructive">{(uploadMutation.error as any)?.message || "Upload failed"}</div>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {assetsQuery.isLoading ? "Loading assets..." : assetsQuery.isError ? "Failed to load assets" : `${assets.length} assets`}
            </div>
            <div className="space-y-2">
              {assets.map((a) => {
                const selected = selectedAssetIds.includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={cn(
                      "w-full text-left rounded-md border px-3 py-2 text-xs transition-colors",
                      selected ? "border-primary bg-secondary" : "border-border hover:bg-secondary/50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" onClick={() => toggleAsset(a.id)} className="min-w-0 flex-1 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-mono truncate">{a.id}</div>
                          <div className="text-muted-foreground">{a.type}</div>
                        </div>
                        <div className="text-muted-foreground truncate">{a.metadata?.filename || a.object_name}</div>
                      </button>
                      {a.type === "SCREENSHOT" ? (
                        <Button size="sm" variant="ghost" onClick={() => attachScreenshotToBeat(a)}>
                          Attach
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="job" className="space-y-3">
          {!jobId ? <div className="text-sm text-muted-foreground">Create a parse job to see status and logs.</div> : null}

          {jobId ? (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-mono">{jobId}</div>
              <div className="text-sm">
                status:{" "}
                <span className={cn((parseJobQuery.data?.status || "").toLowerCase().includes("fail") ? "text-destructive" : "text-foreground")}>
                  {parseJobQuery.data?.status || "unknown"}
                </span>
                {typeof parseJobQuery.data?.attempts === "number" ? <span className="text-muted-foreground"> · attempts: {parseJobQuery.data.attempts}</span> : null}
              </div>

              {parseJobQuery.data?.error ? <div className="text-xs text-destructive">{parseJobQuery.data.error}</div> : null}

              <div className="rounded-md border border-border bg-background p-3 space-y-2">
                <div className="text-xs text-muted-foreground">logs</div>
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify((logsQuery.data as any)?.items || [], null, 2)}
                </pre>
              </div>

              {parseJobQuery.data?.result ? (
                <div className="rounded-md border border-border bg-background p-3 space-y-2">
                  <div className="text-xs text-muted-foreground">result</div>
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(parseJobQuery.data.result, null, 2)}</pre>
                  {Array.isArray(jobEvents) && jobEvents.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => importFromEvents(jobEvents, "append")}>
                        Append to Script
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => importFromEvents(jobEvents, "replace")}>
                        Replace Script
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
