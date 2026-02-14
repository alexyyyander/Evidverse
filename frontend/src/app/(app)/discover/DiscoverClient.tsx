"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProjectCard from "@/components/ProjectCard";
import { Copy } from "lucide-react";
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
    if (data) {
      console.log("Feed data:", data);
      // Temporary debug
      // toast({ title: "Debug", description: `Loaded ${data.length} projects. Sort: ${sort}` });
    }
  }, [data, sort]);

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
              <Card key={u.id} className="border-border/50 hover:border-primary/20 transition-all hover:bg-card/70">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground truncate text-base mb-1" title={u.full_name || u.email}>
                        {u.full_name || u.email.split("@")[0]}
                      </div>
                      <div className="text-xs text-muted-foreground/70 truncate mb-2" title={u.email}>
                        {u.email}
                      </div>
                      <button 
                        className="text-xs text-muted-foreground/60 hover:text-primary flex items-center gap-1.5 transition-colors group"
                        onClick={(e) => {
                          e.preventDefault();
                          navigator.clipboard.writeText(u.id);
                          toast({ title: "Copied", description: "User ID copied.", variant: "success" });
                        }}
                        title={`Copy User ID: ${u.id}`}
                      >
                        <span className="font-mono bg-secondary/50 px-1.5 py-0.5 rounded group-hover:bg-primary/10">#{u.id.slice(0, 8)}</span>
                        <Copy size={10} />
                      </button>
                    </div>
                    <Link
                      href={`/profile/${u.id}`}
                      className={cn(
                        "inline-flex items-center rounded-full px-4 py-1.5 text-xs font-medium transition-colors border",
                        "bg-transparent border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
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
