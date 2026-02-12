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
  const meQuery = useMe();
  const saveProject = useEditorStore((s) => s.saveProject);
  const activeBranchName = ((search?.get("branch") || "main") as string).trim() || "main";

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
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : t("editor.saveFailed");
      toast({ title: t("editor.saveFailed"), description: message, variant: "destructive" });
      setName(projectQuery.data?.name || "");
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: async (next: boolean) => projectApi.update(projectId, { is_public: next }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast({ title: t("projects.visibilityUpdated"), description: "", variant: "success" });
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

  return (
    <div className="h-12 border-b border-border bg-background flex items-center gap-3 px-3">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="secondary" size="sm">
              {activeBranchName}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[320px]">
            {branches.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No branches</div>
            ) : (
              branches
                .slice()
                .sort((a, b) => (a.name === "main" ? -1 : b.name === "main" ? 1 : a.name.localeCompare(b.name)))
                .map((b) => {
                  const isActive = b.name === activeBranchName;
                  return (
                    <DropdownMenuItem
                      key={b.id}
                      className={isActive ? "bg-secondary text-secondary-foreground" : undefined}
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
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
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
                        {isActive ? <div className="text-xs text-muted-foreground">Active</div> : null}
                      </div>
                    </DropdownMenuItem>
                  );
                })
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="text-xs text-muted-foreground whitespace-nowrap">#{projectId}</div>
        <Input
          value={name}
          onChange={(e) => {
            if (!isOwner) return;
            setName(e.target.value);
          }}
          placeholder={t("editor.projectName")}
          className="h-9 max-w-[520px]"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!isOwner) return;
              const next = name.trim();
              if (!next) return;
              if (!canRename) return;
              renameMutation.mutate(next);
            }
          }}
          onBlur={() => {
            if (!isOwner) return;
            const next = name.trim();
            if (!next) {
              setName(projectQuery.data?.name || "");
              return;
            }
            if (!canRename) return;
            renameMutation.mutate(next);
          }}
        />
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
            <span>Parent branch:</span>
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
          {isPublic ? t("projects.public") : t("projects.private")}
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
  );
}
