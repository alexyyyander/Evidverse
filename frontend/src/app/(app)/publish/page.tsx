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
import FractalTree from "@/components/ui/fractal-tree";

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
      toast({ title: t("common.ok"), description: t("publish.toast.validated"), variant: "success" });
      accountsQuery.refetch();
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : t("publish.toast.validateFailed");
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    },
  });

  const disableAccountMutation = useMutation({
    mutationFn: () => publishApi.disableAccount(accountId.trim()),
    onSuccess: () => {
      toast({ title: t("common.ok"), description: t("publish.toast.disabled"), variant: "success" });
      accountsQuery.refetch();
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : t("publish.toast.disableFailed");
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
      toast({ title: t("common.ok"), description: t("publish.toast.saved"), variant: "success" });
      accountsQuery.refetch();
      setShowAccountModal(false);
      setLabel("");
      setCredentialJson("");
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : t("publish.toast.saveFailed");
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
      toast({ title: t("workflow.toast.queued.title"), description: `Job ${job.id}`, variant: "success" });
      setLatestJobId(job.id);
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : t("publish.toast.createJobFailed");
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
      toast({ title: t("common.retry"), description: `Job ${job.id}`, variant: "success" });
      setLatestJobId(job.id);
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : t("publish.toast.retryFailed");
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    },
  });

  const accountOptions = useMemo(() => accountsQuery.data || [], [accountsQuery.data]);
  const selectedAccount = useMemo(
    () => accountOptions.find((a) => a.id === accountId.trim()) || null,
    [accountOptions, accountId]
  );

  return (
    <div className="min-h-[calc(100vh-64px)] py-8 relative">
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
      <PageContainer>
        <div className="mb-8">
          <SectionHeader
            title={t("publish.title")}
            subtitle={t("publish.subtitle")}
            right={
              <Button variant="secondary" onClick={() => setShowAccountModal(true)}>
                {t("publish.addAccount")}
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
          title={t("publish.addAccountTitle")}
          description={t("publish.addAccountDesc")}
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
              <div className="text-sm font-medium text-foreground">{t("publish.platform")}</div>
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
              <div className="text-sm font-medium text-foreground">{t("publish.label")}</div>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("publish.placeholder.main")} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{t("publish.credential")}</div>
              <Input
                value={credentialJson}
                onChange={(e) => setCredentialJson(e.target.value)}
                placeholder={t("publish.placeholder.credential")}
              />
            </div>
          </div>
        </Dialog>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-lg font-semibold text-foreground mb-4">{t("publish.createJob")}</div>
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
              <div className="text-sm font-medium text-foreground">{t("publish.account")}</div>
              <Input
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder={accountOptions[0]?.id ? `e.g. ${accountOptions[0].id}` : t("publish.placeholder.createAccountFirst")}
              />
              {selectedAccount?.last_error ? (
                <div className="text-xs text-destructive">{selectedAccount.last_error}</div>
              ) : selectedAccount?.status ? (
                <div className="text-xs text-muted-foreground">{t("vn.status")}: {selectedAccount.status}</div>
              ) : null}
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{t("publish.videoUrl")}</div>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder={t("publish.placeholder.videoUrl")} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{t("publish.mode")}</div>
              <div className="flex items-center gap-2">
                <Button variant={!multiPart ? "primary" : "secondary"} size="sm" onClick={() => setMultiPart(false)}>
                  {t("publish.mode.single")}
                </Button>
                <Button variant={multiPart ? "primary" : "secondary"} size="sm" onClick={() => setMultiPart(true)}>
                  {t("publish.mode.multi")}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{t("publish.bilibiliTid")}</div>
              <Input
                value={bilibiliTid}
                onChange={(e) => setBilibiliTid(e.target.value)}
                placeholder={t("publish.placeholder.bilibiliTid")}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{t("publish.projectId")}</div>
              <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder={t("publish.projectIdHint")} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{t("publish.branch")}</div>
              <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder={t("publish.placeholder.main")} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{t("publish.titleField")}</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("publish.placeholder.optional")} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{t("publish.descField")}</div>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("publish.placeholder.optional")} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{t("publish.coverUrl")}</div>
              <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder={t("publish.placeholder.coverUrl")} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{t("publish.schedule")}</div>
              <Input
                type="datetime-local"
                value={scheduledPublishAt}
                onChange={(e) => setScheduledPublishAt(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <div className="text-sm font-medium text-foreground">{t("publish.tags")}</div>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t("publish.placeholder.tags")} />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="secondary"
              loading={validateAccountMutation.isPending}
              onClick={() => validateAccountMutation.mutate()}
              disabled={!accountId.trim()}
            >
              {t("publish.validate")}
            </Button>
            <Button
              variant="secondary"
              loading={disableAccountMutation.isPending}
              onClick={() => disableAccountMutation.mutate()}
              disabled={!accountId.trim()}
            >
              {t("publish.disable")}
            </Button>
            <Button loading={createJobMutation.isPending} onClick={() => createJobMutation.mutate()}>
              {t("publish.publish")}
            </Button>
          </div>
        </div>

        {jobQuery.data ? (
          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <div className="text-lg font-semibold text-foreground mb-2">{t("publish.latestJob")}</div>
            <div className="text-sm text-muted-foreground">id: {jobQuery.data.id}</div>
            <div className="text-sm text-muted-foreground">{t("vn.status")}: {jobQuery.data.status}</div>
            {typeof jobQuery.data.attempts === "number" ? (
              <div className="text-sm text-muted-foreground">{t("vn.attempts")}: {jobQuery.data.attempts}</div>
            ) : null}
            {jobQuery.data.error ? <div className="text-sm text-destructive mt-2">{jobQuery.data.error}</div> : null}
            {jobQuery.data.status === "failed" ? (
              <div className="mt-4 flex items-center justify-end">
                <Button loading={retryJobMutation.isPending} variant="secondary" onClick={() => retryJobMutation.mutate()}>
                  {t("common.retry")}
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
