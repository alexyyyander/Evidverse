"use client";

import LinkButton from "@/components/ui/link-button";
import EditorShell from "@/components/editor/EditorShell";
import { useI18n } from "@/lib/i18nContext";

export default function EditorPage({ params }: { params: { id: string } }) {
  const { t } = useI18n();
  const projectId = params.id;

  if (typeof projectId !== "string" || projectId.trim().length === 0) {
    return (
      <div className="h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">{t("editor.invalid.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("editor.invalid.desc")}</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <LinkButton href="/editor/new">{t("editor.invalid.create")}</LinkButton>
            <LinkButton href="/projects" variant="secondary">
              {t("editor.invalid.back")}
            </LinkButton>
          </div>
        </div>
      </div>
    );
  }

  return <EditorShell projectId={projectId} />;
}
