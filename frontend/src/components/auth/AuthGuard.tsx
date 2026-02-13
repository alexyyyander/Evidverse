"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Spinner from "@/components/ui/spinner";
import { clearToken } from "@/lib/api/auth";
import { useAuthToken } from "@/lib/auth/useAuthToken";
import { useMe } from "@/lib/queries/useMe";
import { toast } from "@/components/ui/toast";
import { isApiError } from "@/lib/api/errors";
import Button from "@/components/ui/button";
import { useI18n } from "@/lib/i18nContext";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const token = useAuthToken();
  const meQuery = useMe();

  const next = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
  const loginUrl = `/login?next=${encodeURIComponent(next)}`;

  useEffect(() => {
    if (typeof token !== "string" || token.length === 0) {
      router.replace(loginUrl);
    }
  }, [loginUrl, router, token]);

  useEffect(() => {
    if (!meQuery.isError) return;
    const status = isApiError(meQuery.error) ? meQuery.error.status : undefined;
    if (status !== 401 && status !== 403) return;
    clearToken();
    toast({ title: t("auth.session.invalid.title"), description: t("auth.session.invalid.desc"), variant: "destructive" });
    router.replace(loginUrl);
  }, [loginUrl, meQuery.error, meQuery.isError, router, t]);

  if (typeof token !== "string" || token.length === 0) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Spinner size={22} />
      </div>
    );
  }

  if (meQuery.isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Spinner size={22} />
      </div>
    );
  }

  if (meQuery.isError) {
    const status = isApiError(meQuery.error) ? meQuery.error.status : undefined;
    if (status === 403) return null;
    const message = isApiError(meQuery.error) ? meQuery.error.message : "Failed to load user session";
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-lg border border-border bg-card p-5">
          <div className="text-sm font-semibold">{t("auth.session.checkFailed.title")}</div>
          <div className="mt-2 text-sm text-muted-foreground break-words">{message}</div>
          <div className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                meQuery.refetch();
              }}
            >
              {t("common.retry")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                router.replace("/login");
              }}
            >
              {t("auth.session.goLogin")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
