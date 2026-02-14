"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cloudAuthApi, cloudProjectsApi, projectApi } from "@/lib/api";
import PageContainer from "@/components/layout/PageContainer";
import SectionHeader from "@/components/layout/SectionHeader";
import Button from "@/components/ui/button";
import LinkButton from "@/components/ui/link-button";
import Dialog from "@/components/ui/dialog";
import Input from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import ErrorState from "@/components/ui/error-state";
import { toast } from "@/components/ui/toast";
import { useProjects } from "@/lib/queries/useProjects";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import IconButton from "@/components/ui/icon-button";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18nContext";
import { useMe } from "@/lib/queries/useMe";
import { getAppMode } from "@/lib/appMode";
import { clearCloudToken, setCloudToken } from "@/lib/api/cloudAuth";
import { useCloudAuthToken } from "@/lib/auth/useCloudAuthToken";
import { useQuery } from "@tanstack/react-query";
import type { ProjectSummary } from "@/lib/api/types";

export default function ProjectsClient() {
  const router = useRouter();
  const { t } = useI18n();
  const appMode = getAppMode();
  const cloudEnabled = appMode === "local" && cloudProjectsApi.enabled();
  const cloudToken = useCloudAuthToken();
  const [source, setSource] = useState<"local" | "cloud">("local");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSourceId, setImportSourceId] = useState("");
  const [showCloudLogin, setShowCloudLogin] = useState(false);
  const [cloudEmail, setCloudEmail] = useState("");
  const [cloudPassword, setCloudPassword] = useState("");
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameProjectId, setRenameProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [deleteConfirmProjectId, setDeleteConfirmProjectId] = useState("");
  const [deleteConfirmNickname, setDeleteConfirmNickname] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useProjects();
  const meQuery = useMe();
  const expectedNickname = (meQuery.data?.full_name || meQuery.data?.email?.split("@")[0] || "").trim();

  const cloudProjectsQuery = useQuery({
    queryKey: ["cloudProjects"],
    queryFn: () => cloudProjectsApi.getMine({ limit: 100 }),
    enabled: cloudEnabled && typeof cloudToken === "string" && cloudToken.length > 0,
  });

  const localProjects = useMemo(() => data || [], [data]);
  const cloudProjects = useMemo(() => (cloudProjectsQuery.data || []) as ProjectSummary[], [cloudProjectsQuery.data]);

  const forkMutation = useMutation({
    mutationFn: async (projectId: string) => projectApi.fork(projectId),
    onSuccess: (newProject) => {
      toast({ title: "Forked", description: "Opening editor...", variant: "success" });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      router.push(`/editor/${newProject.id}`);
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : "Failed to fork project";
      toast({ title: "Fork failed", description: message, variant: "destructive" });
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: async (payload: { projectId: string; is_public: boolean }) =>
      projectApi.update(payload.projectId, { is_public: payload.is_public }),
    onSuccess: () => {
      toast({ title: t("projects.visibilityUpdated"), description: "", variant: "success" });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : "Failed to update visibility";
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    },
  });

  const renameMutation = useMutation({
    mutationFn: async (payload: { projectId: string; name: string }) =>
      projectApi.update(payload.projectId, { name: payload.name }),
    onSuccess: () => {
      toast({ title: t("toast.renamed"), description: t("toast.renamed.desc"), variant: "success" });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      setShowRenameModal(false);
      setRenameProjectId(null);
      setRenameValue("");
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : t("common.error");
      toast({ title: t("toast.renameFailed"), description: message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (payload: { projectId: string; confirm_project_id: string; confirm_nickname: string }) =>
      projectApi.delete(payload.projectId, {
        confirm_project_id: payload.confirm_project_id,
        confirm_nickname: payload.confirm_nickname,
      }),
    onSuccess: () => {
      toast({ title: t("projects.deleted"), description: "", variant: "success" });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      setShowDeleteModal(false);
      setDeleteProjectId(null);
      setDeleteConfirmProjectId("");
      setDeleteConfirmNickname("");
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : "Failed to delete project";
      toast({ title: t("common.error"), description: message, variant: "destructive" });
    },
  });

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: t("toast.copied"), description: `${label} ${t("toast.copied.desc")}`, variant: "success" });
    } catch {
      window.prompt(`Copy ${label}:`, text);
    }
  };

  const handleImport = async () => {
    if (!importSourceId) return;
    forkMutation.mutate(importSourceId.trim());
    setShowImportModal(false);
  };

  const cloudLoginMutation = useMutation({
    mutationFn: async () => cloudAuthApi.login({ email: cloudEmail.trim(), password: cloudPassword }),
    onSuccess: (res) => {
      setCloudToken(res.access_token);
      setShowCloudLogin(false);
      setCloudPassword("");
      queryClient.invalidateQueries({ queryKey: ["cloudProjects"] });
      toast({ title: t("toast.cloudConnected"), description: "", variant: "success" });
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : t("common.error");
      toast({ title: t("toast.cloudLoginFailed"), description: message, variant: "destructive" });
    },
  });

  const cloudImportMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const payload = await cloudProjectsApi.exportProject(projectId, { branch_name: "main" });
      return projectApi.importFromCloud(payload);
    },
    onSuccess: (newProject) => {
      toast({ title: t("toast.imported"), description: t("toast.forked.desc"), variant: "success" });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
      router.push(`/editor/${newProject.id}`);
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : t("common.error");
      toast({ title: t("toast.importFailed"), description: message, variant: "destructive" });
    },
  });

  const openRename = (projectId: string, currentName: string) => {
    setRenameProjectId(projectId);
    setRenameValue(currentName);
    setShowRenameModal(true);
  };

  const openDelete = (projectId: string) => {
    setDeleteProjectId(projectId);
    setDeleteConfirmProjectId("");
    setDeleteConfirmNickname("");
    setShowDeleteModal(true);
  };

  const handleRename = async () => {
    if (!renameProjectId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    renameMutation.mutate({ projectId: renameProjectId, name: trimmed });
  };

  const canDelete =
    typeof deleteProjectId === "string" &&
    deleteProjectId.length > 0 &&
    deleteConfirmProjectId.trim() === deleteProjectId &&
    deleteConfirmNickname.trim().length > 0 &&
    expectedNickname.length > 0 &&
    deleteConfirmNickname.trim().toLowerCase() === expectedNickname.toLowerCase() &&
    !deleteMutation.isPending;

  const handleDelete = async () => {
    if (!canDelete || !deleteProjectId) return;
    deleteMutation.mutate({
      projectId: deleteProjectId,
      confirm_project_id: deleteConfirmProjectId.trim(),
      confirm_nickname: deleteConfirmNickname.trim(),
    });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] py-8">
      <PageContainer className="h-full flex flex-col">
        <div className="mb-8">
          <SectionHeader
            title={t("projects.title")}
            subtitle={t("projects.subtitle")}
            right={
              <>
                {appMode === "local" ? (
                  <>
                    <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                      {t("projects.import")}
                    </Button>
                    <LinkButton href="/editor/new">{t("projects.create")}</LinkButton>
                  </>
                ) : (
                  <LinkButton href="/editor/new">{t("projects.create")}</LinkButton>
                )}
              </>
            }
          />
        </div>

        {appMode === "local" && cloudEnabled ? (
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant={source === "local" ? "primary" : "secondary"} onClick={() => setSource("local")}>
                {t("projects.local")}
              </Button>
              <Button variant={source === "cloud" ? "primary" : "secondary"} onClick={() => setSource("cloud")}>
                {t("projects.cloud")}
              </Button>
            </div>
            {source === "cloud" ? (
              <div className="flex items-center gap-2">
                {cloudToken ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      clearCloudToken();
                      queryClient.removeQueries({ queryKey: ["cloudProjects"] });
                    }}
                  >
                    {t("projects.disconnect")}
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => setShowCloudLogin(true)}>
                    {t("projects.cloudLogin")}
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {isError ? (
          <div className="mb-6">
            <ErrorState
              title={t("projects.loadFailed")}
              description={error instanceof Error ? error.message : t("common.error")}
            />
          </div>
        ) : null}

        <Dialog
          open={showImportModal}
          onOpenChange={(open) => {
            setShowImportModal(open);
            if (!open) {
              setImportSourceId("");
            }
          }}
          title={t("projects.import.title")}
          description={t("projects.import.desc")}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowImportModal(false)}>
                {t("common.cancel")}
              </Button>
              <Button loading={forkMutation.isPending} onClick={handleImport}>
                {t("projects.import.fork")}
              </Button>
            </div>
          }
        >
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">{t("projects.import.sourceId")}</div>
            <Input
              placeholder="e.g. 9f4d2c7a-...."
              value={importSourceId}
              onChange={(e) => setImportSourceId(e.target.value)}
            />
          </div>
        </Dialog>

        <Dialog
          open={showCloudLogin}
          onOpenChange={(open) => {
            setShowCloudLogin(open);
            if (!open) {
              setCloudPassword("");
            }
          }}
          title={t("projects.cloudLogin")}
          description={t("projects.loginToView")}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCloudLogin(false)}>
                {t("common.cancel")}
              </Button>
              <Button loading={cloudLoginMutation.isPending} onClick={() => cloudLoginMutation.mutate()}>
                {t("auth.login")}
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{t("login.email")}</div>
              <Input value={cloudEmail} onChange={(e) => setCloudEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{t("login.password")}</div>
              <Input type="password" value={cloudPassword} onChange={(e) => setCloudPassword(e.target.value)} />
            </div>
          </div>
        </Dialog>

        <Dialog
          open={showRenameModal}
          onOpenChange={(open) => {
            setShowRenameModal(open);
            if (!open) {
              setRenameProjectId(null);
              setRenameValue("");
            }
          }}
          title={t("projects.rename.title")}
          description={t("projects.rename.desc")}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowRenameModal(false)}>
                {t("common.cancel")}
              </Button>
              <Button loading={renameMutation.isPending} onClick={handleRename}>
                {t("common.save")}
              </Button>
            </div>
          }
        >
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">{t("createProject.name")}</div>
            <Input
              placeholder="Enter a new name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
            />
          </div>
        </Dialog>

        <Dialog
          open={showDeleteModal}
          onOpenChange={(open) => {
            setShowDeleteModal(open);
            if (!open) {
              setDeleteProjectId(null);
              setDeleteConfirmProjectId("");
              setDeleteConfirmNickname("");
            }
          }}
          title={t("projects.delete.title")}
          description={t("projects.delete.desc")}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="destructive" loading={deleteMutation.isPending} disabled={!canDelete} onClick={handleDelete}>
                {t("projects.delete.confirm")}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-md border border-border p-3 text-xs text-muted-foreground">
              Project ID: <span className="text-foreground">{deleteProjectId || "-"}</span>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{t("projects.delete.projectId")}</div>
              <Input value={deleteConfirmProjectId} onChange={(e) => setDeleteConfirmProjectId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{t("projects.delete.nickname")}</div>
              <Input value={deleteConfirmNickname} onChange={(e) => setDeleteConfirmNickname(e.target.value)} />
              <div className="text-xs text-muted-foreground">
                {t("projects.delete.nicknameHint")}
              </div>
            </div>
          </div>
        </Dialog>

        <div className="flex-1">
          {appMode === "local" && cloudEnabled && source === "cloud" ? (
            cloudToken ? (
              cloudProjectsQuery.isLoading ? (
                <div className="min-h-[calc(100vh-64px-8rem)] flex items-center justify-center text-muted-foreground">
                  {t("common.loading")}
                </div>
              ) : cloudProjectsQuery.isError ? (
                <div className="mb-6">
                  <ErrorState
                    title={t("projects.cloudUnavailable")}
                    description={cloudProjectsQuery.error instanceof Error ? cloudProjectsQuery.error.message : t("common.error")}
                  />
                </div>
              ) : cloudProjects.length === 0 ? (
                <div className="min-h-[calc(100vh-64px-8rem)] flex items-center justify-center">
                  <EmptyState title={t("projects.noCloudProjects")} description={t("projects.createCloudFirst")} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cloudProjects.map((project) => (
                    <Card key={project.id} className="transition-colors hover:bg-card/70">
                      <CardContent>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h5 className="mb-2 text-xl font-semibold tracking-tight text-card-foreground truncate" title={project.name}>{project.name}</h5>
                            <div className="text-xs text-muted-foreground truncate" title={project.id}>#{project.id.slice(0, 8)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              loading={cloudImportMutation.isPending}
                              onClick={() => cloudImportMutation.mutate(project.id)}
                            >
                              {t("projects.editLocal")}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              <div className="min-h-[calc(100vh-64px-8rem)] flex items-center justify-center">
                <EmptyState title={t("projects.cloudNotConnected")} description={t("projects.loginToView")} action={<Button onClick={() => setShowCloudLogin(true)}>{t("projects.cloudLogin")}</Button>} />
              </div>
            )
          ) : isLoading ? (
            <div className="min-h-[calc(100vh-64px-8rem)] flex items-center justify-center text-muted-foreground">
              {t("projects.loading")}
            </div>
          ) : localProjects.length === 0 ? (
            <div className="min-h-[calc(100vh-64px-8rem)] flex items-center justify-center">
              <EmptyState
                title={t("projects.empty.title")}
                description={t("projects.empty.desc")}
                action={<LinkButton href="/editor/new">{t("projects.create")}</LinkButton>}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {localProjects.map((project) => (
                <Link key={project.id} href={`/project/${project.id}`} className="block">
                  <Card className="transition-all hover:bg-card/70 border-border/50 hover:border-primary/20">
                    <CardContent className="p-6 pt-8">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h5 className="text-lg font-semibold tracking-tight text-card-foreground truncate flex-1 min-w-0" title={project.name}>
                          {project.name}
                        </h5>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const next = !(project.is_public === true);
                              visibilityMutation.mutate({ projectId: project.id, is_public: next });
                            }}
                            loading={visibilityMutation.isPending}
                          >
                            {project.is_public === true ? t("projects.public") : t("projects.private")}
                          </Button>
                          <IconButton
                            className="h-7 w-7"
                            aria-label="Rename project"
                            title="Rename"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openRename(project.id, project.name);
                            }}
                          >
                            <Pencil size={14} />
                          </IconButton>
                          <IconButton
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            aria-label="Delete project"
                            title="Delete"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openDelete(project.id);
                            }}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 h-10 mb-4" title={project.description || ""}>
                        {project.description || t("projects.desc.none")}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground/60">
                        <div className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                             onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               copyText(String(project.id), "Project ID");
                             }}
                             title="Click to copy ID"
                             role="button"
                        >
                          <span className="font-mono">#{project.id.slice(0, 8)}</span>
                          <Copy size={10} />
                        </div>
                        <span>{new Date(project.created_at).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}
