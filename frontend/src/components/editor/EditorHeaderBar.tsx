"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { projectApi } from "@/lib/api";
import { useI18n } from "@/lib/i18nContext";
import { LANG_LABEL, type Lang } from "@/lib/i18n";
import { Check, Plus, Search, Edit2, ChevronLeft } from "lucide-react";
import Dialog from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { isApiError } from "@/lib/api/errors";
import { useMe } from "@/lib/queries/useMe";
import { useEditorStore } from "@/store/editorStore";

export default function EditorHeaderBar({ projectId }: { projectId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { lang, setLang, t } = useI18n();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const meQuery = useMe();
  const saveProject = useEditorStore((s) => s.saveProject);
  const activeBranchName = ((search?.get("branch") || "main") as string).trim() || "main";

  // Branch management state
  const [searchBranch, setSearchBranch] = useState("");
  const [createBranchOpen, setCreateBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      try {
        return await projectApi.getPublic(projectId);
      } catch (e) {
        if (isApiError(e) && e.status === 404) {
          return await projectApi.get(projectId);
        }
        throw e;
      }
    },
  });

  const branchesQuery = useQuery({
    queryKey: ["projectBranches", projectId],
    queryFn: () => projectApi.getBranches(projectId),
  });

  useEffect(() => {
    const next = projectQuery.data?.name;
    if (typeof next === "string") setName(next);
  }, [projectQuery.data?.name]);

  const isOwner = !!meQuery.data?.id && meQuery.data.id === (projectQuery.data as any)?.owner_id;
  const canRename = useMemo(() => name.trim().length > 0 && name.trim() !== (projectQuery.data?.name || ""), [name, projectQuery.data?.name]);

  const renameMutation = useMutation({
    mutationFn: async (nextName: string) => projectApi.update(projectId, { name: nextName }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast({ title: t("editor.saved"), description: t("editor.rename"), variant: "success" });
      setIsEditingName(false);
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : t("editor.saveFailed");
      toast({ title: t("editor.saveFailed"), description: message, variant: "destructive" });
      setName(projectQuery.data?.name || "");
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: async (branchName: string) => {
      return projectApi.forkBranch(projectId, {
        source_branch_name: activeBranchName,
        name: branchName,
      });
    },
    onSuccess: async (newBranch) => {
      await queryClient.invalidateQueries({ queryKey: ["projectBranches", projectId] });
      setCreateBranchOpen(false);
      setNewBranchName("");
      toast({ title: "Branch created", description: `Switched to ${newBranch.name}`, variant: "success" });
      
      // Switch to new branch
      const params = new URLSearchParams(search?.toString() || "");
      params.set("branch", newBranch.name);
      router.replace(`${pathname}?${params.toString()}`);
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : "Failed to create branch";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: async (next: boolean) => projectApi.update(projectId, { is_public: next }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast({ title: t("projects.visibilityUpdated"), description: "", variant: "success" });
      // Force refresh data
      projectQuery.refetch();
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : t("editor.saveFailed");
      toast({ title: t("editor.saveFailed"), description: message, variant: "destructive" });
    },
  });

  const parentId = projectQuery.data?.parent_project_id || null;
  const isPublic = projectQuery.data?.is_public === true;
  const branches = branchesQuery.data || [];
  const activeBranch = branches.find((b) => b.name === activeBranchName) || null;

  const filteredBranches = useMemo(() => {
    if (!searchBranch.trim()) return branches;
    return branches.filter((b) => b.name.toLowerCase().includes(searchBranch.toLowerCase()));
  }, [branches, searchBranch]);

  return (
    <>
      <div className="h-12 border-b border-border bg-background flex items-center gap-3 px-3">
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 pl-2 pr-3"
          onClick={() => router.push("/projects")}
          title={t("editor.exit")}
        >
          <ChevronLeft size={18} />
          {t("editor.exit")}
        </Button>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="secondary" size="sm">
                {activeBranchName}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[320px] p-0 overflow-hidden">
              <div className="p-2 border-b border-border bg-popover sticky top-0 z-10">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("editor.branch.search")}
                    value={searchBranch}
                    onChange={(e) => setSearchBranch(e.target.value)}
                    className="pl-8 h-9"
                    onKeyDown={(e) => e.stopPropagation()} // Prevent menu navigation
                  />
                </div>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto py-1">
                {filteredBranches.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">{t("editor.branch.notFound")}</div>
                ) : (
                  filteredBranches
                    .slice()
                    .sort((a, b) => (a.name === "main" ? -1 : b.name === "main" ? 1 : a.name.localeCompare(b.name)))
                    .map((b) => {
                      const isActive = b.name === activeBranchName;
                      return (
                        <DropdownMenuItem
                          key={b.id}
                          className={isActive ? "bg-secondary text-secondary-foreground mx-1" : "mx-1"}
                          onSelect={async () => {
                            if (b.name === activeBranchName) return;
                            try {
                              await saveProject(projectId, { silent: true, branchName: activeBranchName });
                            } catch {}
                            const params = new URLSearchParams(search?.toString() || "");
                            params.set("branch", b.name);
                            router.replace(`${pathname}?${params.toString()}`);
                          }}
                        >
                          <div className="flex items-start justify-between gap-3 w-full">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{b.name}</div>
                              {b.description ? (
                                <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{b.description}</div>
                              ) : null}
                              {Array.isArray(b.tags) && b.tags.length > 0 ? (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {b.tags.slice(0, 4).map((tag) => (
                                    <span
                                      key={tag}
                                      className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            {isActive ? <div className="text-xs text-muted-foreground">{t("editor.branch.active")}</div> : null}
                          </div>
                        </DropdownMenuItem>
                      );
                    })
                )}
              </div>

              <div className="p-2 border-t border-border bg-popover sticky bottom-0 z-10">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="w-full justify-start gap-2"
                  onClick={() => setCreateBranchOpen(true)}
                >
                  <Plus size={14} />
                  {t("editor.branch.new")}
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="text-xs text-muted-foreground whitespace-nowrap">#{projectId}</div>
          
          <div className="flex items-center gap-1 flex-1 max-w-[520px]">
            {isEditingName ? (
              <>
                <Input
                  value={name}
                  onChange={(e) => {
                    if (!isOwner) return;
                    setName(e.target.value);
                  }}
                  placeholder={t("editor.projectName")}
                  className="h-9 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!isOwner) return;
                      const next = name.trim();
                      if (!next) return;
                      if (!canRename) return;
                      renameMutation.mutate(next);
                    } else if (e.key === "Escape") {
                      setIsEditingName(false);
                      setName(projectQuery.data?.name || "");
                    }
                  }}
                  autoFocus
                  onBlur={() => {
                    // Don't auto-save on blur, just cancel edit mode if user clicks away without saving
                    // Or keep it simple: blur cancels edit
                    if (!renameMutation.isPending) {
                      setIsEditingName(false);
                      setName(projectQuery.data?.name || "");
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-green-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 shrink-0"
                  onClick={() => {
                    if (canRename) renameMutation.mutate(name.trim());
                  }}
                  disabled={!canRename || renameMutation.isPending}
                  title={t("editor.save.tooltip")}
                  // Prevent blur from cancelling the edit when clicking save
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <Check size={16} />
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 group">
                <span className="font-semibold text-sm truncate max-w-[400px]">{projectQuery.data?.name || "Untitled Project"}</span>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      setName(projectQuery.data?.name || "");
                      setIsEditingName(true);
                    }}
                    title={t("editor.rename.tooltip")}
                  >
                    <Edit2 size={16} />
                  </Button>
                )}
              </div>
            )}
          </div>

          {parentId ? (
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("project.parent")}:</span>
              <Link href={`/project/${parentId}`} className="hover:underline text-foreground">
                #{parentId}
              </Link>
            </div>
          ) : null}
          {activeBranch?.parent_branch_id ? (
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("editor.branch.parent")}:</span>
              <span className="text-foreground">{activeBranch.parent_branch_id}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={visibilityMutation.isPending}
            disabled={!isOwner}
            onClick={() => visibilityMutation.mutate(!isPublic)}
          >
            {isPublic ? t("editor.visibility.public") : t("editor.visibility.private")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="secondary" size="sm">
                {LANG_LABEL[lang]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["en", "zh", "ja"] as Lang[]).map((l) => (
                <DropdownMenuItem key={l} onSelect={() => setLang(l)}>
                  {LANG_LABEL[l]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog
        open={createBranchOpen}
        onOpenChange={setCreateBranchOpen}
        title={t("editor.branch.createTitle")}
        description={`${t("editor.branch.createDesc")} '${activeBranchName}'`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateBranchOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button 
              onClick={() => createBranchMutation.mutate(newBranchName)} 
              disabled={!newBranchName.trim() || createBranchMutation.isPending}
              loading={createBranchMutation.isPending}
            >
              {t("editor.branch.create")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t("editor.branch.name")}
            </label>
            <Input
              placeholder="e.g. feature/new-scene"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newBranchName.trim()) {
                  createBranchMutation.mutate(newBranchName);
                }
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {t("editor.branch.hint")}
            </p>
          </div>
        </div>
      </Dialog>
    </>
  );
}
