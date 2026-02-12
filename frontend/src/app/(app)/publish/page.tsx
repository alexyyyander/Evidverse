"use client";

import { useMemo, useState } from "react";
import PageContainer from "@/components/layout/PageContainer";
import SectionHeader from "@/components/layout/SectionHeader";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Dialog from "@/components/ui/dialog";
import { useMutation, useQuery } from "@tanstack/react-query";
import { publishApi } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18nContext";

export default function PublishPage() {
  const { t } = useI18n();
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [platform, setPlatform] = useState<"bilibili" | "douyin">("bilibili");
  const [label, setLabel] = useState("");
  const [credentialJson, setCredentialJson] = useState("");

  const [accountId, setAccountId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [projectId, setProjectId] = useState("");
  const [branchName, setBranchName] = useState("main");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [bilibiliTid, setBilibiliTid] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [scheduledPublishAt, setScheduledPublishAt] = useState("");
  const [multiPart, setMultiPart] = useState(false);

  const accountsQuery = useQuery({
    queryKey: ["publishAccounts"],
    queryFn: publishApi.listAccounts,
  });

  const validateAccountMutation = useMutation({
    mutationFn: () => publishApi.validateAccount(accountId.trim()),
    onSuccess: () => {
      toast({ title: "OK", description: "Account validated.", variant: "success" });
      accountsQuery.refetch();
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed to validate account";
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    },
  });

  const disableAccountMutation = useMutation({
    mutationFn: () => publishApi.disableAccount(accountId.trim()),
    onSuccess: () => {
      toast({ title: "OK", description: "Account disabled.", variant: "success" });
      accountsQuery.refetch();
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed to disable account";
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: () =>
      publishApi.createAccount({
        platform,
        label: label.trim() || undefined,
        credential_json: credentialJson,
      }),
    onSuccess: () => {
      toast({ title: "OK", description: "Account saved.", variant: "success" });
      accountsQuery.refetch();
      setShowAccountModal(false);
      setLabel("");
      setCredentialJson("");
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed to save account";
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    },
  });

  const createJobMutation = useMutation({
    mutationFn: () =>
      publishApi.createJob({
        account_id: accountId.trim(),
        project_id: projectId.trim() || undefined,
        branch_name: branchName.trim() || undefined,
        video_url: videoUrl.trim() || undefined,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        tags: tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        bilibili_tid: (() => {
          const v = bilibiliTid.trim();
          if (!v) return undefined;
          const n = Number(v);
          return Number.isFinite(n) ? n : undefined;
        })(),
        cover_url: coverUrl.trim() || undefined,
        scheduled_publish_at: scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : undefined,
        multi_part: multiPart,
      }),
    onSuccess: (job) => {
      toast({ title: "Queued", description: `Job ${job.id}`, variant: "success" });
      setLatestJobId(job.id);
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed to create job";
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    },
  });

  const [latestJobId, setLatestJobId] = useState<string | null>(null);
  const jobQuery = useQuery({
    queryKey: ["publishJob", latestJobId],
    queryFn: () => publishApi.getJob(latestJobId as string),
    enabled: typeof latestJobId === "string" && latestJobId.length > 0,
    refetchInterval: 2000,
  });

  const retryJobMutation = useMutation({
    mutationFn: () => publishApi.retryJob(latestJobId as string),
    onSuccess: (job) => {
      toast({ title: "Retried", description: `Job ${job.id}`, variant: "success" });
      setLatestJobId(job.id);
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed to retry job";
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    },
  });

  const accountOptions = useMemo(() => accountsQuery.data || [], [accountsQuery.data]);
  const selectedAccount = useMemo(
    () => accountOptions.find((a) => a.id === accountId.trim()) || null,
    [accountOptions, accountId]
  );

  return (
    <div className="min-h-[calc(100vh-64px)] py-8">
      <PageContainer>
        <div className="mb-8">
          <SectionHeader
            title="Publish"
            subtitle="Upload/export to platforms (Stage 01 MVP)"
            right={
              <Button variant="secondary" onClick={() => setShowAccountModal(true)}>
                Add Account
              </Button>
            }
          />
        </div>

        <Dialog
          open={showAccountModal}
          onOpenChange={(open) => {
            setShowAccountModal(open);
            if (!open) {
              setLabel("");
              setCredentialJson("");
              setPlatform("bilibili");
            }
          }}
          title="Add Publish Account"
          description="Paste credential JSON (stored encrypted on server)."
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAccountModal(false)}>
                {t("common.cancel")}
              </Button>
              <Button loading={createAccountMutation.isPending} onClick={() => createAccountMutation.mutate()}>
                {t("common.save")}
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Platform</div>
              <div className="flex items-center gap-2">
                <Button
                  variant={platform === "bilibili" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setPlatform("bilibili")}
                >
                  bilibili
                </Button>
                <Button
                  variant={platform === "douyin" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setPlatform("douyin")}
                >
                  douyin
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Label</div>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. main" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Credential JSON</div>
              <Input
                value={credentialJson}
                onChange={(e) => setCredentialJson(e.target.value)}
                placeholder='e.g. {"SESSDATA":"..."}'
              />
            </div>
          </div>
        </Dialog>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-lg font-semibold text-foreground mb-4">Create Publish Job</div>
          {accountOptions.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {accountOptions.map((a) => (
                <Button key={a.id} size="sm" variant="secondary" onClick={() => setAccountId(a.id)}>
                  {a.platform}:{a.label || a.id.slice(0, 8)}{a.status ? ` (${a.status})` : ""}
                </Button>
              ))}
            </div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Account</div>
              <Input
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder={accountOptions[0]?.id ? `e.g. ${accountOptions[0].id}` : "Create an account first"}
              />
              {selectedAccount?.last_error ? (
                <div className="text-xs text-destructive">{selectedAccount.last_error}</div>
              ) : selectedAccount?.status ? (
                <div className="text-xs text-muted-foreground">status: {selectedAccount.status}</div>
              ) : null}
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Video URL</div>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="file:///... or http(s)://..." />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Mode</div>
              <div className="flex items-center gap-2">
                <Button variant={!multiPart ? "primary" : "secondary"} size="sm" onClick={() => setMultiPart(false)}>
                  Single
                </Button>
                <Button variant={multiPart ? "primary" : "secondary"} size="sm" onClick={() => setMultiPart(true)}>
                  Multi-P
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">bilibili TID (optional)</div>
              <Input
                value={bilibiliTid}
                onChange={(e) => setBilibiliTid(e.target.value)}
                placeholder="e.g. 171"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Project ID (optional)</div>
              <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="If set, video URL can be omitted" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Branch (optional)</div>
              <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="main" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Title</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Description</div>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Cover URL (optional)</div>
              <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="http(s)://... or file:///..." />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Scheduled Publish (optional)</div>
              <Input
                type="datetime-local"
                value={scheduledPublishAt}
                onChange={(e) => setScheduledPublishAt(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <div className="text-sm font-medium text-foreground">Tags (comma separated)</div>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="secondary"
              loading={validateAccountMutation.isPending}
              onClick={() => validateAccountMutation.mutate()}
              disabled={!accountId.trim()}
            >
              Validate Account
            </Button>
            <Button
              variant="secondary"
              loading={disableAccountMutation.isPending}
              onClick={() => disableAccountMutation.mutate()}
              disabled={!accountId.trim()}
            >
              Disable Account
            </Button>
            <Button loading={createJobMutation.isPending} onClick={() => createJobMutation.mutate()}>
              Publish
            </Button>
          </div>
        </div>

        {jobQuery.data ? (
          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <div className="text-lg font-semibold text-foreground mb-2">Latest Job</div>
            <div className="text-sm text-muted-foreground">id: {jobQuery.data.id}</div>
            <div className="text-sm text-muted-foreground">status: {jobQuery.data.status}</div>
            {typeof jobQuery.data.attempts === "number" ? (
              <div className="text-sm text-muted-foreground">attempts: {jobQuery.data.attempts}</div>
            ) : null}
            {jobQuery.data.error ? <div className="text-sm text-destructive mt-2">{jobQuery.data.error}</div> : null}
            {jobQuery.data.status === "failed" ? (
              <div className="mt-4 flex items-center justify-end">
                <Button loading={retryJobMutation.isPending} variant="secondary" onClick={() => retryJobMutation.mutate()}>
                  Retry
                </Button>
              </div>
            ) : null}
            {jobQuery.data.logs ? (
              <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-background p-3 text-xs text-foreground">
                {JSON.stringify(jobQuery.data.logs, null, 2)}
              </pre>
            ) : null}
            {jobQuery.data.result ? (
              <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-background p-3 text-xs text-foreground">
                {JSON.stringify(jobQuery.data.result, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : null}
      </PageContainer>
    </div>
  );
}
