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

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const next = searchParams?.get("next") || "/projects";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validationError = useMemo(() => {
    if (password.length === 0 || confirm.length === 0) return null;
    if (password !== confirm) return "Passwords do not match";
    if (password.length < 6) return "Password must be at least 6 characters";
    return null;
  }, [confirm, password]);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && confirm.length > 0 && !validationError && !submitting;
  }, [confirm, email, password, submitting, validationError]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await authApi.register({ email: email.trim(), password });
      const token = await authApi.login({ email: email.trim(), password });
      setToken(token.access_token);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      toast({ title: "Account created", description: "You are now logged in.", variant: "success" });
      router.replace(next);
    } catch (e) {
      const message = isApiError(e) ? e.message : "Registration failed";
      setError(message);
      toast({ title: "Registration failed", description: message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] py-10">
      <PageContainer>
        <div className="mx-auto max-w-md">
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div>
                <div className="text-xl font-semibold text-foreground">Create account</div>
                <div className="mt-1 text-sm text-muted-foreground">Sign up to start creating projects.</div>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Email</div>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Password</div>
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Confirm password</div>
                  <Input
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                  />
                </div>

                {validationError ? <div className="text-sm text-destructive">{validationError}</div> : null}
                {error ? <div className="text-sm text-destructive">{error}</div> : null}

                <Button type="submit" className="w-full" loading={submitting} disabled={!canSubmit}>
                  Create account
                </Button>
              </form>

              <div className="text-sm text-muted-foreground">
                Have an account?{" "}
                <Link className="text-primary hover:underline" href={`/login?next=${encodeURIComponent(next)}`}>
                  Log in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}

