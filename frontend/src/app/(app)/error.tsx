"use client";

import ErrorState from "@/components/ui/error-state";
import Button from "@/components/ui/button";
import { useI18n } from "@/lib/i18nContext";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <ErrorState title={t("appError.pageCrashed")} description={error.message} />
        <div className="mt-4 flex justify-end">
          <Button onClick={() => reset()}>{t("appError.tryAgain")}</Button>
        </div>
      </div>
    </div>
  );
}
