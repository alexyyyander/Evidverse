"use client";

import { useEffect } from "react";
import LinkButton from "@/components/ui/link-button";
import Button from "@/components/ui/button";
import { useI18n } from "@/lib/i18nContext";

export default function EditorError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="h-screen flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold text-foreground">{t("appError.editorCrashed")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("editorError.reloadHint")}</p>
        <div className="mt-4 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground break-words">
          {error.message || t("common.unknown")}
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <LinkButton href="/projects" variant="secondary">
            {t("editor.backToProjects")}
          </LinkButton>
          <Button onClick={() => reset()}>{t("editorError.reload")}</Button>
        </div>
      </div>
    </div>
  );
}
