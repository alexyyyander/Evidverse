"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProjectCard from "@/components/ProjectCard";
import PageContainer from "@/components/layout/PageContainer";
import SectionHeader from "@/components/layout/SectionHeader";
import LoadingState from "@/components/states/LoadingState";
import EmptyState from "@/components/ui/empty-state";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { useFeed } from "@/lib/queries/useFeed";
import { useUserSearch } from "@/lib/queries/useUserSearch";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18nContext";
import { useMe } from "@/lib/queries/useMe";

export default function DiscoverClient() {
  const [mode, setMode] = useState<"projects" | "users">("projects");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<"new" | "hot">("new");
  const { t } = useI18n();
  const meQuery = useMe();

  const feedParams = useMemo(() => {
    if (mode !== "projects") return undefined;
    return {
      query: query.trim() || undefined,
      tag: tag || undefined,
      sort,
      limit: 40,
    };
  }, [mode, query, tag, sort]);

  const { data, isLoading, isError, error } = useFeed(feedParams);
  const userQuery = useUserSearch({ query: query.trim(), limit: 40 });

  useEffect(() => {
    if (mode === "projects") {
      if (!isError) return;
      const message = error instanceof Error ? error.message : "Failed to load feed";
      toast({ title: "Failed to load discover", description: message, variant: "destructive" });
      return;
    }
    if (!userQuery.isError) return;
    const message = userQuery.error instanceof Error ? userQuery.error.message : "Failed to search users";
    toast({ title: "Failed to search users", description: message, variant: "destructive" });
  }, [error, isError, mode, userQuery.error, userQuery.isError]);

  const tags = useMemo(
    () => [
      { value: "动画", labelKey: "tag.animation" },
      { value: "番剧", labelKey: "tag.anime" },
      { value: "电影", labelKey: "tag.movie" },
      { value: "游戏", labelKey: "tag.game" },
      { value: "短剧", labelKey: "tag.shortDrama" },
    ],
    []
  );

  if (mode === "projects" && isLoading) {
    return <LoadingState label={t("discover.loading")} />;
  }

  const projects = mode === "projects" ? data || [] : [];
  const users = mode === "users" ? userQuery.data || [] : [];

  return (
    <div className="min-h-[calc(100vh-64px)] py-8">
      <PageContainer>
        <div className="mb-8">
          <SectionHeader title={t("discover.title")} subtitle={t("discover.subtitle")} />
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button variant={mode === "projects" ? "primary" : "secondary"} onClick={() => setMode("projects")}>
                {t("discover.mode.projects")}
              </Button>
              <Button variant={mode === "users" ? "primary" : "secondary"} onClick={() => setMode("users")}>
                {t("discover.mode.users")}
              </Button>
            </div>
            {mode === "projects" ? (
              <div className="flex items-center gap-2">
                <Button variant={sort === "new" ? "primary" : "secondary"} onClick={() => setSort("new")}>
                  {t("discover.sort.new")}
                </Button>
                <Button variant={sort === "hot" ? "primary" : "secondary"} onClick={() => setSort("hot")}>
                  {t("discover.sort.hot")}
                </Button>
              </div>
            ) : null}
          </div>

          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === "projects" ? t("discover.search.projects") : t("discover.search.users")}
          />

          {mode === "projects" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={tag === null ? "primary" : "secondary"}
                onClick={() => setTag(null)}
              >
                {t("discover.tag.all")}
              </Button>
              {tags.map((tagOpt) => (
                <Button
                  key={tagOpt.value}
                  size="sm"
                  variant={tag === tagOpt.value ? "primary" : "secondary"}
                  onClick={() => setTag(tagOpt.value)}
                >
                  {t(tagOpt.labelKey)}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        {mode === "projects" ? (
          projects.length === 0 ? (
            <EmptyState title={t("discover.empty.projects.title")} description={t("discover.empty.projects.desc")} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} viewerId={meQuery.data?.id || null} />
              ))}
            </div>
          )
        ) : query.trim().length === 0 ? (
          <EmptyState title={t("discover.empty.users.title")} description={t("discover.empty.users.desc")} />
        ) : userQuery.isLoading ? (
          <LoadingState label={t("discover.searchingUsers")} />
        ) : users.length === 0 ? (
          <EmptyState title={t("discover.empty.users.none")} description={t("discover.empty.projects.desc")} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => (
              <Card key={u.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground truncate">
                        {u.full_name || u.email.split("@")[0]}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground break-all">{u.email}</div>
                      <div className="mt-1 text-xs text-muted-foreground">#{u.id}</div>
                    </div>
                    <Link
                      href={`/profile/${u.id}`}
                      className={cn(
                        "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      )}
                    >
                      {t("common.view")}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
