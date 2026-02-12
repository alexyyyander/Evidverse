"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { setToken } from "@/lib/api/auth";
import { isApiError } from "@/lib/api/errors";
import PageContainer from "@/components/layout/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18nContext";
import { LANG_LABEL, type Lang } from "@/lib/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { lang, setLang, t } = useI18n();

  const next = searchParams?.get("next") || "/projects";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.trim().length > 0 && password.length > 0 && !submitting, [email, password, submitting]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await authApi.login({ email: email.trim(), password });
      setToken(token.access_token);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      toast({ title: t("auth.welcomeBack.title"), description: t("auth.welcomeBack.desc"), variant: "success" });
      router.replace(next);
    } catch (e) {
      const message = isApiError(e) ? e.message : "Login failed";
      setError(message);
      toast({ title: t("auth.loginFailed.title"), description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] py-10">
      <PageContainer>
        <div className="mx-auto max-w-md">
          <div className="mb-3 flex items-center justify-end">
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
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div>
                <div className="text-xl font-semibold text-foreground">{t("auth.login.title")}</div>
                <div className="mt-1 text-sm text-muted-foreground">{t("auth.login.subtitle")}</div>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">{t("auth.email")}</div>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">{t("auth.password")}</div>
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    autoComplete="current-password"
                  />
                </div>

                {error ? <div className="text-sm text-destructive">{error}</div> : null}

                <Button type="submit" className="w-full" loading={submitting} disabled={!canSubmit}>
                  {t("auth.login")}
                </Button>
              </form>

              <div className="text-sm text-muted-foreground">
                {t("auth.noAccount")}{" "}
                <Link className="text-primary hover:underline" href={`/register?next=${encodeURIComponent(next)}`}>
                  {t("auth.createOne")}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}
